"""
Enhanced Activity Analyzer
Adds contributor velocity breakdown and Recharts-compatible weekly chart data.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any


class ActivityAnalyzer:
    @staticmethod
    def analyze(commits: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not commits:
            return {
                "total_commits_fetched": 0,
                "active_contributors_count": 0,
                "recent_commits_30_days": 0,
                "weekly_activity": {},
                "contributor_breakdown": [],
                "weekly_chart_data": [],
                "additions_total": 0,
                "deletions_total": 0,
            }

        contributors: Dict[str, int] = {}
        recent_30_days_count = 0
        now = datetime.now(timezone.utc)
        weekly_activity: Dict[str, int] = {}
        additions_total = 0
        deletions_total = 0

        for c in commits:
            commit_data = c.get("commit", {})
            author_info = commit_data.get("author", {})

            # Contributor identification
            author_name = (
                author_info.get("name")
                or (c.get("author") or {}).get("login")
                or "Unknown"
            )
            contributors[author_name] = contributors.get(author_name, 0) + 1

            # Date parsing & trends
            date_str = author_info.get("date")
            if date_str:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                days_diff = (now - dt).days
                if days_diff <= 30:
                    recent_30_days_count += 1

                week_key = dt.strftime("%Y-%U")
                weekly_activity[week_key] = weekly_activity.get(week_key, 0) + 1

            # Additions / deletions (present in detailed commit objects)
            stats = c.get("stats", {})
            additions_total += stats.get("additions", 0)
            deletions_total += stats.get("deletions", 0)

        # Sort weekly activity chronologically, format for Recharts
        sorted_weeks = sorted(weekly_activity.items())
        weekly_chart_data = [
            {"week": f"W{wk.split('-')[1]}", "commits": count}
            for wk, count in sorted_weeks
        ][-16:]  # Keep last 16 weeks for chart readability

        # Sort contributors by commit count desc, cap list
        contributor_breakdown = [
            {"name": name, "commits": count}
            for name, count in sorted(contributors.items(), key=lambda x: x[1], reverse=True)
        ][:10]

        return {
            "total_commits_fetched": len(commits),
            "active_contributors_count": len(contributors),
            "recent_commits_30_days": recent_30_days_count,
            "weekly_activity": weekly_activity,
            "weekly_chart_data": weekly_chart_data,
            "contributor_breakdown": contributor_breakdown,
            "additions_total": additions_total,
            "deletions_total": deletions_total,
        }