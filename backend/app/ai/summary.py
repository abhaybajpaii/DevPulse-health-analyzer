"""
Enhanced AI Insight Service
Returns a structured 3-bullet executive summary:
  { strengths: [...], bottlenecks: [...], recommendations: [...] }
Both Gemini-powered and deterministic fallback return the same shape.
"""
import os
import json
from typing import Dict, Any


class AIInsightService:
    @staticmethod
    async def generate_summary(
        metrics: Dict[str, Any],
        health_score: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate a structured executive summary with 3 categories:
        strengths, bottlenecks, and maintenance recommendations.
        Uses Gemini API if GEMINI_API_KEY is set, otherwise falls back
        to the deterministic rule engine — both return the same dict shape.
        """
        api_key = os.getenv("GEMINI_API_KEY")

        # ── Deterministic fallback ──────────────────────────────────────────
        overall = health_score.get("overall_score", 0)
        breakdown = health_score.get("breakdown", {})
        reasons = health_score.get("reasons", [])

        positives = [r.replace("✓ ", "") for r in reasons if r.startswith("✓")]
        warnings = [r.replace("⚠ ", "") for r in reasons if r.startswith("⚠")]

        fallback_strengths = positives[:2] if positives else [
            "Codebase structure is stable and well-organized."
        ]
        fallback_bottlenecks = warnings[:2] if warnings else [
            "No critical bottlenecks detected at this time."
        ]

        activity = metrics.get("activity", {})
        docs = metrics.get("documentation", {})
        dep = metrics.get("dependencies", {})

        fallback_recommendations = []
        if activity.get("recent_commits_30_days", 10) < 5:
            fallback_recommendations.append(
                "Increase commit cadence to improve project velocity signal."
            )
        if dep and dep.get("unpinned_count", 0) > 3:
            fallback_recommendations.append(
                "Pin dependency versions to reduce supply-chain risk."
            )
        if docs and docs.get("documentation_score", 100) < 60:
            fallback_recommendations.append(
                "Add CONTRIBUTING.md and CHANGELOG.md to improve onboarding."
            )
        if not fallback_recommendations:
            fallback_recommendations.append(
                "Consider adding integration tests to maintain long-term code quality."
            )

        fallback: Dict[str, Any] = {
            "overall_score": overall,
            "strengths": fallback_strengths,
            "bottlenecks": fallback_bottlenecks,
            "recommendations": fallback_recommendations,
        }

        # ── Gemini LLM path ────────────────────────────────────────────────
        if api_key:
            try:
                from google import genai

                client = genai.Client(api_key=api_key)
                prompt = f"""
You are a senior DevOps and Software Architecture consultant.
Analyze the following repository metrics and produce a structured JSON executive summary.
Return ONLY valid JSON. Do NOT invent facts outside these metrics.

Metrics:
- Health Score: {overall}/100
- Score Breakdown: {json.dumps(breakdown)}
- Key Observations: {reasons}
- Activity: {json.dumps(metrics.get('activity', {}))}
- Issues: {json.dumps(metrics.get('issues', {}))}
- Dependencies: {json.dumps(metrics.get('dependencies', {}))}
- Documentation: {json.dumps(metrics.get('documentation', {}))}

Return a JSON object with exactly these keys:
{{
  "strengths": ["<one concise bullet>", "<one concise bullet>"],
  "bottlenecks": ["<one concise bullet>", "<one concise bullet>"],
  "recommendations": ["<one actionable bullet>", "<one actionable bullet>"]
}}
"""
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )
                if response.text:
                    # Strip possible markdown code fences
                    raw = response.text.strip()
                    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                    parsed = json.loads(raw)
                    return {
                        "overall_score": overall,
                        "strengths": parsed.get("strengths", fallback_strengths),
                        "bottlenecks": parsed.get("bottlenecks", fallback_bottlenecks),
                        "recommendations": parsed.get("recommendations", fallback_recommendations),
                    }
            except Exception:
                pass  # Fall back to deterministic summary on any error

        return fallback