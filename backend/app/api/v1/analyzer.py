"""
Enhanced Analyzer API — /api/v1/github/analyze
Wires up all engines: activity, issues, PRs, code, hotspots,
dependencies, documentation, health score, and AI summary.
"""
import asyncio
from fastapi import APIRouter
from app.schemas.github import RepoAnalyzeRequest
from app.services.github_service import GitHubCollectorService
from app.engine.activity import ActivityAnalyzer
from app.engine.issues import IssueAnalyzer
from app.engine.prs import PRAnalyzer
from app.engine.code import CodeQualityAnalyzer
from app.engine.dependencies import DependencyScanner
from app.engine.docs import DocScoreEngine
from app.scoring.health_score import HealthScoreEngine
from app.ai.summary import AIInsightService

router = APIRouter()

# Max files to fetch content for hotspot analysis (rate-limit guard)
_HOTSPOT_SAMPLE_SIZE = 20
_HOTSPOT_EXTENSIONS = (".py", ".js", ".jsx", ".ts", ".tsx")


async def _build_full_analysis(url: str) -> dict:
    """
    Full pipeline: collect → analyze → score → AI summary.
    Extracted so the compare endpoint can call it in parallel.
    """
    collector = GitHubCollectorService()
    try:
        raw_data = await collector.collect_all(url)

        file_tree = raw_data["file_tree"]
        commits = raw_data["commits"]

        # ── Core engine passes ────────────────────────────────────────────
        activity_metrics = ActivityAnalyzer.analyze(commits)
        issue_metrics = IssueAnalyzer.analyze(raw_data["issues"])
        pr_metrics = PRAnalyzer.analyze(raw_data["pull_requests"])
        code_metrics = CodeQualityAnalyzer.analyze_file_tree(file_tree)

        # ── Documentation scoring ──────────────────────────────────────────
        doc_metrics = DocScoreEngine.analyze(file_tree)

        # ── Dependency scanning ───────────────────────────────────────────
        dep_metrics = await _scan_dependencies(collector, raw_data["metadata"], file_tree)

        # ── Hotspot analysis (sampled) ────────────────────────────────────
        hotspots = await _compute_hotspots(collector, raw_data["metadata"], file_tree)

        # ── Health score ──────────────────────────────────────────────────
        health = HealthScoreEngine.calculate_score(
            activity_metrics, issue_metrics, pr_metrics, code_metrics,
            dependency_metrics=dep_metrics,
            doc_metrics=doc_metrics,
        )

        metrics_combined = {
            "activity": activity_metrics,
            "issues": issue_metrics,
            "pull_requests": pr_metrics,
            "code": {**code_metrics, "hotspots": hotspots},
            "dependencies": dep_metrics,
            "documentation": doc_metrics,
        }

        # ── AI summary ────────────────────────────────────────────────────
        ai_summary = await AIInsightService.generate_summary(metrics_combined, health)

        return {
            "status": "success",
            "repository": raw_data["metadata"],
            "health_score": health,
            "ai_summary": ai_summary,
            "metrics": metrics_combined,
        }
    finally:
        await collector.close()


async def _scan_dependencies(
    collector: GitHubCollectorService,
    metadata: dict,
    file_tree: list,
) -> dict:
    """Fetch and scan package.json and/or requirements.txt from GitHub."""
    owner = metadata.get("owner", "")
    repo = metadata.get("name", "")

    manifest_paths = {
        item["path"]
        for item in file_tree
        if item.get("type") == "blob"
        and item.get("path", "").lower() in ("package.json", "requirements.txt")
        and "/" not in item.get("path", "")  # root-level only
    }

    dep_results = {}

    for path in manifest_paths:
        try:
            content_resp = await collector._get(f"/repos/{owner}/{repo}/contents/{path}")
            import base64
            raw_content = base64.b64decode(content_resp.get("content", "")).decode("utf-8", errors="replace")

            if path.lower() == "package.json":
                dep_results = DependencyScanner.analyze_package_json(raw_content)
            elif path.lower() == "requirements.txt":
                dep_results = DependencyScanner.analyze_requirements_txt(raw_content)
        except Exception:
            continue

    return dep_results if dep_results else DependencyScanner._empty()


async def _compute_hotspots(
    collector: GitHubCollectorService,
    metadata: dict,
    file_tree: list,
) -> list:
    """Fetch and analyze a sample of source files for hotspot detection."""
    owner = metadata.get("owner", "")
    repo = metadata.get("name", "")

    # Candidate files for analysis
    candidates = [
        item for item in file_tree
        if item.get("type") == "blob"
        and item.get("path", "").endswith(_HOTSPOT_EXTENSIONS)
        and "node_modules" not in item.get("path", "")
        and "vendor" not in item.get("path", "")
        and "dist" not in item.get("path", "")
        and "test" not in item.get("path", "").lower()
    ]

    # Prefer larger files (higher byte size) — more likely to be complex
    candidates.sort(key=lambda x: x.get("size", 0), reverse=True)
    sample = candidates[:_HOTSPOT_SAMPLE_SIZE]

    if not sample:
        return []

    # Fetch file contents concurrently
    import base64

    async def fetch_content(item: dict) -> tuple[str, str] | None:
        path = item["path"]
        try:
            resp = await collector._get(f"/repos/{owner}/{repo}/contents/{path}")
            raw = base64.b64decode(resp.get("content", "")).decode("utf-8", errors="replace")
            return path, raw
        except Exception:
            return None

    results = await asyncio.gather(*[fetch_content(f) for f in sample])
    file_contents = {path: content for r in results if r for path, content in [r]}

    return CodeQualityAnalyzer.analyze_hotspots(file_tree, file_contents, top_n=5)


@router.post("/analyze", summary="Analyze repository health")
async def analyze_repository(payload: RepoAnalyzeRequest):
    return await _build_full_analysis(payload.url)


# Export for use by compare endpoint
build_full_analysis = _build_full_analysis