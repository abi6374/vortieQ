import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import profile, paths, feedback, assistant, roadmap, account, resources, coach, github

app = FastAPI(title="AI Learning Path Recommender", version="1.0.0")

# SECURITY: allow_origins=["*"] + allow_credentials=True used to be set here.
# Starlette cannot literally send "Access-Control-Allow-Origin: *" alongside
# credentials (the fetch spec forbids it), so it falls back to reflecting
# whatever Origin header the caller sent — meaning ANY website could make a
# credentialed request and have the browser hand its JS the response. This
# app authenticates with a Bearer token (not cookies), which limits practical
# exploitability today — an attacker's page can't forge a token it doesn't
# have — but it's still a spec violation with no upside, and it would become
# a real cross-site issue the moment any cookie-based flow is added. Locked
# to an explicit allowlist: production Vercel domain + local dev ports.
ALLOWED_ORIGINS = [
    "https://vortie-q.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(github.router)
app.include_router(paths.router, prefix="/api/paths", tags=["paths"])
app.include_router(feedback.router, prefix="/api/steps", tags=["feedback"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])
app.include_router(roadmap.router, prefix="/api/roadmap", tags=["roadmap"])
app.include_router(account.router, prefix="/api", tags=["account"])
app.include_router(resources.router, prefix="/api/resources", tags=["resources"])
app.include_router(coach.router, prefix="/api/coach", tags=["coach"])


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
    # Full exception type/message/traceback go to server logs only (above) -
    # the client never sees raw exception internals (DB errors, stack frames,
    # etc.), just a generic message it can show the user.
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
