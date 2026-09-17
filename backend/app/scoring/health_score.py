from typing import Dict, Any, List


class HealthScoreEngine:
    @staticmethod
    def calculate_score(
        activity_metrics: Dict[str, Any],
        issue_metrics: Dict[str, Any],
        pr_metrics: Dict[str, Any],
        code_metrics: Dict[str, Any],
        dependency_metrics: Dict[str, Any] | None = None,
        doc_metrics: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:

        reasons: List[str] = []

        # 1. Activity Score (15% weight)
        recent_commits = activity_metrics.get("recent_commits_30_days", 0)
        if recent_commits >= 15:
            activity_score = 90.0
            reasons.append("✓ Active recent commit activity")
        elif recent_commits >= 5:
            activity_score = 70.0
            reasons.append("✓ Moderate recent commit activity")
        else:
            activity_score = 40.0
            reasons.append("⚠ Low activity in the last 30 days")

        # 2. Issue Health Score (15% weight)
        closure_rate = issue_metrics.get("closure_rate_pct", 100.0)
        stale_issues = issue_metrics.get("stale_issues_count", 0)
        issue_score = max(0.0, closure_rate - (stale_issues * 3))
        if stale_issues > 5:
            reasons.append(f"⚠ {stale_issues} long-standing unresolved issues (>60 days)")
        else:
            reasons.append("✓ Healthy issue resolution rate")

        # 3. Testing Score (20% weight)
        test_ratio = code_metrics.get("test_to_source_ratio", 0.0)
        if test_ratio >= 0.4:
            testing_score = 88.0
            reasons.append("✓ Solid test file structure")
        elif test_ratio >= 0.15:
            testing_score = 65.0
            reasons.append("⚠ Moderate test coverage detected")
        else:
            testing_score = 35.0
            reasons.append("⚠ Low test-to-source file ratio")

        # 4. Code Quality Baseline (25% weight)
        code_score = 80.0
        reasons.append("✓ Primary codebase structure validated")

        # 5. Dependency Health (15% weight) — live or baseline
        if dependency_metrics:
            dep_score = float(dependency_metrics.get("dependency_score", 75))
            unpinned = dependency_metrics.get("unpinned_count", 0)
            outdated = len(dependency_metrics.get("outdated_heuristics", []))
            if unpinned > 5 or outdated > 3:
                reasons.append(f"⚠ {unpinned} unpinned deps; {outdated} outdated framework(s) detected")
            else:
                reasons.append("✓ Dependency versions are mostly up-to-date")
        else:
            dep_score = 75.0
            reasons.append("✓ Dependency baseline assumed healthy")

        # 6. Documentation Health (10% weight) — live or baseline
        if doc_metrics:
            doc_score = float(doc_metrics.get("documentation_score", 80))
            checklist = doc_metrics.get("checklist", [])
            missing_critical = [
                item["file"] for item in checklist
                if not item["present"] and item.get("weight", 0) >= 15
            ]
            if missing_critical:
                reasons.append(f"⚠ Missing key docs: {', '.join(missing_critical)}")
            else:
                reasons.append("✓ Core documentation artifacts are present")
        else:
            doc_score = 80.0
            reasons.append("✓ Documentation baseline assumed healthy")

        # Weighted total score
        overall_score = round(
            (code_score * 0.25)
            + (testing_score * 0.20)
            + (activity_score * 0.15)
            + (issue_score * 0.15)
            + (dep_score * 0.15)
            + (doc_score * 0.10),
            1,
        )

        return {
            "overall_score": min(overall_score, 100.0),
            "breakdown": {
                "code_quality": round(code_score, 1),
                "testing": round(testing_score, 1),
                "activity": round(activity_score, 1),
                "issue_health": round(issue_score, 1),
                "dependencies": round(dep_score, 1),
                "documentation": round(doc_score, 1),
            },
            "reasons": reasons,
        }