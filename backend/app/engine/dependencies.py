"""
Dependency Health Scanner
Parses package.json and requirements.txt manifests to detect
unpinned versions and apply major-outdated framework heuristics.
"""
import json
import re
from typing import List, Dict, Any


# Heuristic: known frameworks with minimum acceptable major version
_OUTDATED_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    # npm / package.json
    "react": {"min_major": 18, "ecosystem": "npm"},
    "next": {"min_major": 14, "ecosystem": "npm"},
    "vue": {"min_major": 3, "ecosystem": "npm"},
    "angular": {"min_major": 17, "ecosystem": "npm"},
    "express": {"min_major": 4, "ecosystem": "npm"},
    "typescript": {"min_major": 5, "ecosystem": "npm"},
    "webpack": {"min_major": 5, "ecosystem": "npm"},
    "vite": {"min_major": 5, "ecosystem": "npm"},
    # pip / requirements.txt
    "django": {"min_major": 4, "ecosystem": "pip"},
    "flask": {"min_major": 3, "ecosystem": "pip"},
    "fastapi": {"min_major": 0, "min_minor": 100, "ecosystem": "pip"},
    "sqlalchemy": {"min_major": 2, "ecosystem": "pip"},
    "pydantic": {"min_major": 2, "ecosystem": "pip"},
    "numpy": {"min_major": 1, "min_minor": 24, "ecosystem": "pip"},
    "pandas": {"min_major": 2, "ecosystem": "pip"},
    "tensorflow": {"min_major": 2, "ecosystem": "pip"},
    "torch": {"min_major": 2, "ecosystem": "pip"},
}


def _extract_major(version_str: str) -> int | None:
    """Extract leading major integer from a version string like ^18.2.0 or >=2.0."""
    clean = re.sub(r"[^\d.]", "", version_str.lstrip("^~>=<! "))
    parts = clean.split(".")
    try:
        return int(parts[0])
    except (IndexError, ValueError):
        return None


def _is_pinned_pip(version_spec: str) -> bool:
    """Return True if requirements.txt entry uses ==."""
    return "==" in version_spec


def _is_pinned_npm(version_str: str) -> bool:
    """Return True if package.json entry is an exact version (no ^, ~, *)."""
    stripped = version_str.strip()
    if stripped.startswith(("^", "~", "*", ">=", "<=", ">", "<")):
        return False
    if stripped in ("latest", "next", "*"):
        return False
    return bool(re.match(r"^\d+\.\d+", stripped))


class DependencyScanner:
    @staticmethod
    def analyze_package_json(content: str) -> Dict[str, Any]:
        """Parse a package.json string and return dependency health metrics."""
        try:
            data = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            return DependencyScanner._empty()

        all_deps: Dict[str, str] = {}
        all_deps.update(data.get("dependencies", {}))
        all_deps.update(data.get("devDependencies", {}))

        return DependencyScanner._evaluate(all_deps, ecosystem="npm")

    @staticmethod
    def analyze_requirements_txt(content: str) -> Dict[str, Any]:
        """Parse a requirements.txt string and return dependency health metrics."""
        deps: Dict[str, str] = {}
        for raw_line in content.splitlines():
            line = raw_line.strip()
            # Skip comments and blank lines
            if not line or line.startswith("#"):
                continue
            # Strip inline comments
            line = line.split("#")[0].strip()
            # Split on any version specifier operator
            parts = re.split(r"(==|>=|<=|!=|~=|>|<)", line, maxsplit=1)
            name = parts[0].strip().lower()
            version_spec = "".join(parts[1:]).strip() if len(parts) > 1 else ""
            if name:
                deps[name] = version_spec

        return DependencyScanner._evaluate(deps, ecosystem="pip")

    @staticmethod
    def _evaluate(deps: Dict[str, str], ecosystem: str) -> Dict[str, Any]:
        total = len(deps)
        unpinned: List[str] = []
        outdated_heuristics: List[Dict[str, Any]] = []

        for name, version_spec in deps.items():
            # Pinned check
            if ecosystem == "pip":
                if not _is_pinned_pip(version_spec):
                    unpinned.append(name)
            else:
                if not _is_pinned_npm(version_spec):
                    unpinned.append(name)

            # Outdated heuristic check
            threshold = _OUTDATED_THRESHOLDS.get(name.lower())
            if threshold and threshold["ecosystem"] == ecosystem:
                major = _extract_major(version_spec)
                if major is not None:
                    min_major = threshold.get("min_major", 0)
                    if major < min_major:
                        severity = "critical" if (min_major - major) >= 2 else "warning"
                        outdated_heuristics.append({
                            "name": name,
                            "detected_version": version_spec,
                            "min_recommended_major": min_major,
                            "severity": severity,
                        })
                    else:
                        # Check minor version if present
                        min_minor = threshold.get("min_minor")
                        if min_minor is not None:
                            version_parts = re.sub(r"[^\d.]", "", version_spec).split(".")
                            try:
                                minor = int(version_parts[1])
                                if minor < min_minor:
                                    outdated_heuristics.append({
                                        "name": name,
                                        "detected_version": version_spec,
                                        "min_recommended_major": min_major,
                                        "severity": "info",
                                    })
                            except (IndexError, ValueError):
                                pass

        dep_score = max(0, 100 - (len(unpinned) * 3) - (
            sum(15 if d["severity"] == "critical" else 7 if d["severity"] == "warning" else 2
                for d in outdated_heuristics)
        ))

        return {
            "total_dependencies": total,
            "unpinned_count": len(unpinned),
            "unpinned_packages": unpinned[:10],  # Cap list for payload size
            "outdated_heuristics": outdated_heuristics,
            "dependency_score": min(100, dep_score),
        }

    @staticmethod
    def _empty() -> Dict[str, Any]:
        return {
            "total_dependencies": 0,
            "unpinned_count": 0,
            "unpinned_packages": [],
            "outdated_heuristics": [],
            "dependency_score": 75,
        }
