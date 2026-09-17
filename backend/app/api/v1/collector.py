from fastapi import APIRouter, HTTPException, status
from app.schemas.github import RepoAnalyzeRequest
from app.services.github_service import GitHubCollectorService

router = APIRouter()

@router.post("/fetch-raw", summary="Fetch raw repository data from GitHub")
async def fetch_raw_repo_data(payload: RepoAnalyzeRequest):
    collector = GitHubCollectorService()
    try:
        data = await collector.collect_all(payload.url)
        return {
            "status": "success",
            "repository": data["metadata"]["full_name"],
            "data": data
        }
    finally:
        await collector.close()