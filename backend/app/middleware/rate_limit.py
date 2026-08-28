"""Per-user rate limiting for the LLM-backed endpoints.

Every route that ends up calling app.llm_client.chat_completion() (path
generation, step swap, coach practice/projects, the assistant, profile/resume
extraction) costs real Groq/Bedrock spend per call and has no cap today - any
signed-in user can currently script a loop against /api/paths/generate and run
up a real bill or just make the app unusable for everyone else. This closes
that gap.

Deliberately in-memory, not Redis-backed: this app runs as a single container
on one EC2 instance (see PROGRESS_TRACKER.md deployment section), so a
per-process sliding-window counter is both correct and simplest. It resets on
container restart/redeploy - acceptable here; the goal is stopping runaway
abuse within a session; it isn't a hard billing guarantee across process
restarts.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from app.middleware.auth import verify_jwt

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)

# Once the number of distinct keys we're tracking gets large, opportunistically
# drop the empty ones so memory doesn't grow unbounded over the container's
# lifetime (a demo/hackathon-scale app won't have enough concurrent distinct
# users to make this a real bottleneck, but it costs nothing to guard it).
_PRUNE_THRESHOLD = 5000


def _check(key: str, max_calls: int, window_seconds: int) -> None:
    now = time.time()
    with _lock:
        dq = _hits[key]
        cutoff = now - window_seconds
        while dq and dq[0] < cutoff:
            dq.popleft()

        if len(dq) >= max_calls:
            retry_after = max(1, int(dq[0] + window_seconds - now) + 1)
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests - please wait {retry_after}s and try again.",
                headers={"Retry-After": str(retry_after)},
            )

        dq.append(now)

        if len(_hits) > _PRUNE_THRESHOLD:
            for k in [k for k, v in _hits.items() if not v]:
                del _hits[k]


def rate_limit(name: str, max_calls: int, window_seconds: int = 300):
    """FastAPI dependency factory - per-user sliding-window rate limit.

    Usage: `user_id: str = Depends(rate_limit("paths.generate", max_calls=5))`
    instead of `Depends(verify_jwt)` directly. Still resolves and returns the
    real user_id (verify_jwt is depended on, and FastAPI caches it per-request,
    so this doesn't add a second JWT verification), it just also enforces the
    budget first. `name` scopes the budget per endpoint so one user hammering
    /coach/practice doesn't burn their /paths/generate allowance too.
    """
    def _dep(user_id: str = Depends(verify_jwt)) -> str:
        _check(f"{name}:{user_id}", max_calls, window_seconds)
        return user_id

    return _dep
