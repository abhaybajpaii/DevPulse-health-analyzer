from datetime import datetime, timezone
from typing import List, Dict, Any

class PRAnalyzer:
    @staticmethod
    def analyze(prs: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not prs:
            return {
                "total_prs": 0,
                "open_prs": 0,
                "merged_prs": 0,
                "long_running_prs_count": 0
            }

        total = len(prs)
        open_count = 0
        merged_count = 0
        long_running_count = 0  # Open > 14 days
        now = datetime.now(timezone.utc)

        for pr in prs:
            if pr.get("state") == "open":
                open_count += 1
                created_at = pr.get("created_at")
                if created_at:
                    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    if (now - dt).days > 14:
                        long_running_count += 1
            elif pr.get("merged_at") is not None:
                merged_count += 1

        return {
            "total_prs": total,
            "open_prs": open_count,
            "merged_prs": merged_count,
            "long_running_prs_count": long_running_count
        }