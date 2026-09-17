"""
Enhanced Code Quality Analyzer
Uses Radon for Python cyclomatic complexity + AST-based hotspot extraction.
Lightweight regex heuristics for JS/TS files.
"""
import re
import ast
from radon.complexity import cc_visit
from radon.metrics import mi_visit
from typing import List, Dict, Any, Optional


# Maintainability index grade thresholds (Radon MI scale)
def _mi_grade(mi_score: float) -> str:
    if mi_score >= 85:
        return "A"
    elif mi_score >= 65:
        return "B"
    elif mi_score >= 40:
        return "C"
    else:
        return "D"


def _smell_tags(avg_cc: float, loc: int) -> List[str]:
    """Return code smell tags based on complexity and size."""
    smells = []
    if avg_cc > 15:
        smells.append("High Complexity")
    elif avg_cc > 10:
        smells.append("Moderate Complexity")
    if loc > 500:
        smells.append("Long File")
    if loc > 300 and avg_cc > 8:
        smells.append("God Class Risk")
    return smells if smells else ["Clean"]


def _analyze_python_content(path: str, content: str) -> Optional[Dict[str, Any]]:
    """Compute complexity metrics for a Python file."""
    try:
        lines = content.splitlines()
        loc = len([l for l in lines if l.strip() and not l.strip().startswith("#")])

        blocks = cc_visit(content)
        complexities = [b.complexity for b in blocks]
        avg_cc = round(sum(complexities) / len(complexities), 2) if complexities else 1.0

        try:
            mi_score = mi_visit(content, multi=True)
            maintainability = _mi_grade(mi_score)
        except Exception:
            maintainability = "B"

        return {
            "file": path,
            "loc": loc,
            "cyclomatic_complexity": avg_cc,
            "maintainability_rating": maintainability,
            "smells": _smell_tags(avg_cc, loc),
            "language": "Python",
        }
    except Exception:
        return None


def _analyze_js_ts_content(path: str, content: str) -> Optional[Dict[str, Any]]:
    """Lightweight regex-based heuristics for JS/TS files."""
    try:
        lines = content.splitlines()
        loc = len([l for l in lines if l.strip() and not l.strip().startswith("//")])

        # Count function declarations (function keyword + arrow functions)
        fn_keyword = len(re.findall(r"\bfunction\b", content))
        arrow_fns = len(re.findall(r"=>\s*[\{\(]", content))
        total_fns = fn_keyword + arrow_fns

        # Estimate cyclomatic complexity: 1 baseline + branching keywords
        branch_keywords = len(re.findall(
            r"\b(if|else if|for|while|switch|catch|&&|\|\||\?[^:])\b", content
        ))
        avg_cc = round(1 + (branch_keywords / max(total_fns, 1)), 2) if total_fns > 0 else 1.0

        # Nesting depth heuristic: count max sequential indentation
        max_indent = 0
        for line in lines:
            stripped = line.lstrip()
            if stripped:
                indent = (len(line) - len(stripped)) // 2
                max_indent = max(max_indent, indent)

        if max_indent > 7:
            maintainability = "D"
        elif max_indent > 5:
            maintainability = "C"
        elif avg_cc > 8:
            maintainability = "B"
        else:
            maintainability = "A"

        return {
            "file": path,
            "loc": loc,
            "cyclomatic_complexity": avg_cc,
            "maintainability_rating": maintainability,
            "smells": _smell_tags(avg_cc, loc),
            "language": "TypeScript" if path.endswith((".ts", ".tsx")) else "JavaScript",
        }
    except Exception:
        return None


class CodeQualityAnalyzer:
    @staticmethod
    def analyze_file_tree(file_tree: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze file tree to produce code quality summary metrics."""
        python_files = [
            f for f in file_tree
            if f.get("type") == "blob" and f.get("path", "").endswith(".py")
        ]
        js_ts_files = [
            f for f in file_tree
            if f.get("type") == "blob" and f.get("path", "").endswith((".js", ".jsx", ".ts", ".tsx"))
            and "node_modules" not in f.get("path", "")
        ]
        test_files = [
            f for f in file_tree
            if "test" in f.get("path", "").lower() or "spec" in f.get("path", "").lower()
        ]

        return {
            "total_files": len(file_tree),
            "python_files_count": len(python_files),
            "js_ts_files_count": len(js_ts_files),
            "test_files_count": len(test_files),
            "test_to_source_ratio": round(
                len(test_files) / max(len(file_tree) - len(test_files), 1), 2
            ),
        }

    @staticmethod
    def calculate_file_complexity(code_contents: str) -> Dict[str, Any]:
        """Single-file complexity calculation (legacy compatibility)."""
        try:
            blocks = cc_visit(code_contents)
            complexities = [b.complexity for b in blocks]
            avg_complexity = sum(complexities) / len(complexities) if complexities else 1.0
            return {
                "block_count": len(blocks),
                "average_complexity": round(avg_complexity, 2),
                "is_hotspot": avg_complexity > 10.0,
            }
        except Exception:
            return {"block_count": 0, "average_complexity": 1.0, "is_hotspot": False}

    @staticmethod
    def analyze_hotspots(
        file_tree: List[Dict[str, Any]],
        file_contents: Dict[str, str],  # path → raw content
        top_n: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Compute per-file complexity metrics for sampled files.
        Returns top-N hotspots sorted by complexity descending.

        Args:
            file_tree: GitHub file tree objects.
            file_contents: Dict mapping file path to raw file content string.
            top_n: Number of hotspots to return.
        """
        results: List[Dict[str, Any]] = []

        for path, content in file_contents.items():
            if path.endswith(".py"):
                result = _analyze_python_content(path, content)
            elif path.endswith((".js", ".jsx", ".ts", ".tsx")):
                result = _analyze_js_ts_content(path, content)
            else:
                continue

            if result:
                results.append(result)

        # Sort by complexity descending, then by LOC as tiebreaker
        results.sort(key=lambda x: (x["cyclomatic_complexity"], x["loc"]), reverse=True)
        return results[:top_n]