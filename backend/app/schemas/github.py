from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class RepoAnalyzeRequest(BaseModel):
    url: str


class RepoCompareRequest(BaseModel):
    url_a: str
    url_b: str


class RepoTarget(BaseModel):
    owner: str
    repo: str


class RawRepoData(BaseModel):
    metadata: Dict[str, Any]
    commits: List[Dict[str, Any]]
    issues: List[Dict[str, Any]]
    pull_requests: List[Dict[str, Any]]
    file_tree: List[Dict[str, Any]]