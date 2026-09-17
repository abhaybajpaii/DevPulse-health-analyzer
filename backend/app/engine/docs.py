"""
Documentation Completeness Evaluator
Grades README.md, CONTRIBUTING.md, LICENSE, CHANGELOG.md presence and depth
from a repository file tree.
"""
from typing import List, Dict, Any


# Scoring weights for each doc artifact
_DOC_WEIGHTS = {
    "README.md": 40,
    "CONTRIBUTING.md": 20,
    "LICENSE": 15,
    "CHANGELOG.md": 15,
    "CODE_OF_CONDUCT.md": 5,
    ".github/PULL_REQUEST_TEMPLATE.md": 5,
}

# Minimum size (bytes) for README to be considered "substantial"
_README_SUBSTANTIAL_BYTES = 500


class DocScoreEngine:
    @staticmethod
    def analyze(
        file_tree: List[Dict[str, Any]],
        readme_size_bytes: int = 0,
    ) -> Dict[str, Any]:
        """
        Evaluate documentation completeness from a GitHub file tree.

        Args:
            file_tree: List of GitHub tree blob objects with 'path' and 'size' keys.
            readme_size_bytes: Raw byte size of README (fetched separately if available).
        """
        # Build a fast lookup of lowercase paths → actual path
        paths_lower = {
            item.get("path", "").lower(): item
            for item in file_tree
            if item.get("type") == "blob"
        }

        checklist: List[Dict[str, Any]] = []
        earned_score = 0

        for doc_name, weight in _DOC_WEIGHTS.items():
            key = doc_name.lower()
            # Check both root-level and .github/ variants
            found_item = (
                paths_lower.get(key)
                or paths_lower.get(f".github/{key}")
                or paths_lower.get(f"docs/{key}")
            )
            present = found_item is not None

            note = ""
            item_score = 0

            if present:
                item_score = weight
                # Extra quality check for README
                if doc_name == "README.md":
                    size = found_item.get("size", readme_size_bytes)
                    if size and size < _README_SUBSTANTIAL_BYTES:
                        item_score = weight // 2
                        note = "Present but appears sparse (< 500 bytes)"
                    else:
                        note = "Present and substantial"
                else:
                    note = "Present"
            else:
                note = "Missing"

            earned_score += item_score
            checklist.append({
                "file": doc_name,
                "present": present,
                "weight": weight,
                "note": note,
            })

        # Clamp to [0, 100]
        doc_score = min(100, max(0, earned_score))

        return {
            "documentation_score": doc_score,
            "checklist": checklist,
        }
