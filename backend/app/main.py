from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import profile, paths, steps, feedback, assistant

app = FastAPI(title="AI Learning Path Recommender", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(paths.router, prefix="/api/paths", tags=["paths"])
app.include_router(steps.router, prefix="/api/paths", tags=["steps"])
app.include_router(feedback.router, prefix="/api/steps", tags=["feedback"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
