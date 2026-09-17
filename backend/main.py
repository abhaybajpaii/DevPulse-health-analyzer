from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.collector import router as collector_router
from app.api.v1.analyzer import router as analyzer_router
from app.api.v1.compare import router as compare_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(collector_router, prefix=f"{settings.API_V1_STR}/github", tags=["GitHub Collector"])
app.include_router(analyzer_router, prefix=f"{settings.API_V1_STR}/github", tags=["Analyzer Engine"])
app.include_router(compare_router, prefix=f"{settings.API_V1_STR}/github", tags=["Repo Comparison"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}


@app.get("/")
async def root():
    return {"message": "DevPulse API is active. Access docs at /docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)