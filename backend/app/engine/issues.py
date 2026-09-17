from datetime import datetime, timezone
from typing import List, Dict, Any

class IssueAnalyzer:
    @staticmethod
    def analyze(issues: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not issues:
            return {
                "total_issues": 0,
                "open_issues": 0,
                "closed_issues": 0,
                "closure_rate_pct": 100.0,
                "stale_issues_count": 0
            }

        total = len(issues)
        open_count = 0
        closed_count = 0
        stale_count = 0  # Open for > 60 days
        now = datetime.now(timezone.utc)

        for issue in issues:
            state = issue.get("state")
            if state == "open":
                open_count += 1
                created_at = issue.get("created_at")
                if created_at:
                    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    if (now - dt).days > 60:
                        stale_count += 1
            elif state == "closed":
                closed_count += 1

        closure_rate = round((closed_count / total) * 100, 1) if total > 0 else 0.0

        return {
            "total_issues": total,
            "open_issues": open_count,
            "closed_issues": closed_count,
            "closure_rate_pct": closure_rate,
            "stale_issues_count": stale_count
        }