import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import profile, paths, steps, feedback, assistant, roadmap, account

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
app.include_router(roadmap.router, prefix="/api/roadmap", tags=["roadmap"])
app.include_router(account.router, prefix="/api", tags=["account"])


# Log any unhandled exception with the full traceback so backend logs (docker
# logs on EC2) tell us exactly why a request 500'd. Without this, FastAPI
# swallows the trace and the frontend just sees "Internal Server Error".
@app.exception_handler(Exception)
async def _log_unhandled(request: Request, exc: Exception):
    if isinstance(exc, StarletteHTTPException):  # let normal HTTPExceptions pass through
        raise exc
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(
        f"[UNHANDLED 500] {request.method} {request.url.path}\n"
        f"  exc: {type(exc).__name__}: {exc}\n{tb}",
        flush=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {type(exc).__name__}: {exc}"},
    )


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
