import re
from typing import Tuple, List, Dict, Any
import httpx
from fastapi import HTTPException, status
from app.core.config import settings

class GitHubCollectorService:
    BASE_URL = "https://api.github.com"

    def __init__(self):
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DevPulse-Analyzer"
        }
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
        
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers=headers,
            timeout=15.0,
            follow_redirects=True
        )

    @staticmethod
    def parse_github_url(url: str) -> Tuple[str, str]:
        """Extracts owner and repository name from a GitHub URL."""
        pattern = r"github\.com/([^/]+)/([^/]+)"
        match = re.search(pattern, url.strip().rstrip("/"))
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub repository URL format. Example: https://github.com/owner/repo"
            )
        
        owner = match.group(1)
        repo = match.group(2).replace(".git", "")
        return owner, repo

    async def _get(self, endpoint: str, params: Dict[str, Any] = None) -> Any:
        try:
            response = await self.client.get(endpoint, params=params)
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Resource not found on GitHub: {endpoint}"
                )
            elif response.status_code == 403:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="GitHub API rate limit exceeded. Please provide a GITHUB_TOKEN in backend/.env"
                )
            
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to GitHub API: {str(exc)}"
            )

    async def get_repo_metadata(self, owner: str, repo: str) -> Dict[str, Any]:
        return await self._get(f"/repos/{owner}/{repo}")

    async def get_commits(self, owner: str, repo: str, per_page: int = 100) -> List[Dict[str, Any]]:
        return await self._get(f"/repos/{owner}/{repo}/commits", params={"per_page": per_page})

    async def get_issues(self, owner: str, repo: str, per_page: int = 100) -> List[Dict[str, Any]]:
        # GitHub's /issues endpoint includes PRs; filter out PRs in analysis
        return await self._get(
            f"/repos/{owner}/{repo}/issues",
            params={"state": "all", "per_page": per_page}
        )

    async def get_pull_requests(self, owner: str, repo: str, per_page: int = 100) -> List[Dict[str, Any]]:
        return await self._get(
            f"/repos/{owner}/{repo}/pulls",
            params={"state": "all", "per_page": per_page}
        )

    async def get_file_tree(self, owner: str, repo: str, default_branch: str) -> List[Dict[str, Any]]:
        try:
            tree_data = await self._get(
                f"/repos/{owner}/{repo}/git/trees/{default_branch}",
                params={"recursive": "1"}
            )
            return tree_data.get("tree", [])
        except HTTPException:
            return []

    async def collect_all(self, url: str) -> Dict[str, Any]:
        owner, repo = self.parse_github_url(url)
        
        # 1. Fetch metadata first to know the default branch
        metadata = await self.get_repo_metadata(owner, repo)
        default_branch = metadata.get("default_branch", "main")

        # 2. Fetch remaining core datasets
        commits = await self.get_commits(owner, repo)
        issues_and_prs = await self.get_issues(owner, repo)
        pull_requests = await self.get_pull_requests(owner, repo)
        file_tree = await self.get_file_tree(owner, repo, default_branch)

        # Pure issues (GitHub issues endpoint includes PRs)
        pure_issues = [i for i in issues_and_prs if "pull_request" not in i]

        return {
            "metadata": {
                "name": metadata.get("name"),
                "full_name": metadata.get("full_name"),
                "description": metadata.get("description"),
                "owner": metadata.get("owner", {}).get("login"),
                "stars": metadata.get("stargazers_count", 0),
                "forks": metadata.get("forks_count", 0),
                "open_issues_count": metadata.get("open_issues_count", 0),
                "primary_language": metadata.get("language"),
                "default_branch": default_branch,
                "created_at": metadata.get("created_at"),
                "updated_at": metadata.get("updated_at"),
                "size_kb": metadata.get("size", 0),
            },
            "commits": commits,
            "issues": pure_issues,
            "pull_requests": pull_requests,
            "file_tree": file_tree
        }

    async def close(self):
        await self.client.aclose()