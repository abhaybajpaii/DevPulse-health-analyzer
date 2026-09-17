"""
Repository Comparison API — POST /api/v1/github/compare
Runs full analysis on two repos in parallel and returns differential metrics.
"""
import asyncio
from fastapi import APIRouter
from app.schemas.github import RepoCompareRequest
from app.api.v1.analyzer import build_full_analysis

router = APIRouter()


@router.post("/compare", summary="Side-by-side comparison of two GitHub repositories")
async def compare_repositories(payload: RepoCompareRequest):
    """
    Accepts two GitHub URLs, runs full analysis on both in parallel,
    and returns the individual analyses plus key differential metrics.
    """
    # Run both analyses concurrently
    result_a, result_b = await asyncio.gather(
        build_full_analysis(payload.url_a),
        build_full_analysis(payload.url_b),
        return_exceptions=True,
    )

    # Handle individual analysis errors gracefully
    def safe_result(r, label: str) -> dict:
        if isinstance(r, Exception):
            return {"status": "error", "error": str(r), "label": label}
        return r

    repo_a = safe_result(result_a, "repo_a")
    repo_b = safe_result(result_b, "repo_b")

    # Compute deltas (only when both succeeded)
    delta = {}
    if repo_a.get("status") == "success" and repo_b.get("status") == "success":
        score_a = repo_a["health_score"]["overall_score"]
        score_b = repo_b["health_score"]["overall_score"]

        act_a = repo_a["metrics"]["activity"]["recent_commits_30_days"]
        act_b = repo_b["metrics"]["activity"]["recent_commits_30_days"]

        issue_a = repo_a["metrics"]["issues"]["closure_rate_pct"]
        issue_b = repo_b["metrics"]["issues"]["closure_rate_pct"]

        dep_a = repo_a["metrics"]["dependencies"].get("dependency_score", 75)
        dep_b = repo_b["metrics"]["dependencies"].get("dependency_score", 75)

        doc_a = repo_a["metrics"]["documentation"].get("documentation_score", 80)
        doc_b = repo_b["metrics"]["documentation"].get("documentation_score", 80)

        delta = {
            "score_delta": round(score_a - score_b, 1),
            "activity_delta": act_a - act_b,
            "issue_health_delta": round(issue_a - issue_b, 1),
            "dependency_delta": round(dep_a - dep_b, 1),
            "documentation_delta": round(doc_a - doc_b, 1),
            "winner": (
                repo_a["repository"]["full_name"]
                if score_a >= score_b
                else repo_b["repository"]["full_name"]
            ),
        }

    return {
        "status": "success",
        "repo_a": repo_a,
        "repo_b": repo_b,
        "delta": delta,
    }
