# MASTER README — Part 2: Member Prompts & Git Sequences
### AI-Powered Career & Learning Path Recommender

> This is Part 2. Read Part 1 (architecture, diagrams, folder structure) FIRST.
> This file contains the exact AI prompts and git commands for each member,
> in the exact order they must be executed.

---

## 16. Member Prompts

### Quick Reference — Who Does What When

```
DAY 1 — Morning (Hours 0–5)
  Member 5: Create GitHub repo + Supabase project + apply schema
  Member 1: Backend skeleton (all routes stubbed, /health live)
  Member 2: Implement embed_text()
  Member 3: React scaffold + folder structure

DAY 1 — Afternoon (Hours 5–10)
  Member 1: Auth middleware + profile extraction (Groq)
  Member 2: Seed 80 courses + retriever + recommender
  Member 3: AuthContext + routing + Landing + Auth screens + Onboarding
  Member 4: Dashboard skeleton + ProgressHeader + SkillMap + NextActions
  Member 5: Verify each module gate, update PROGRESS_TRACKER

DAY 2 — Morning (Hours 0–5)
  Member 1: Path generation endpoint + feedback endpoint
  Member 2: Wire recommender into path_service (via M1 call)
  Member 3: Roadmap view
  Member 4: FeedbackButtons + feedback loop + dashboard refresh
  Member 5: Deploy backend to Render

DAY 2 — Afternoon (Hours 5–10)
  Member 1: AI assistant endpoint
  Member 3 + 4: AI assistant chat UI + polish pass
  Member 5: Deploy frontend to Vercel, run integration tests
  All: Demo video, docs, ZIP submission
```

---

## Member 1 — Backend Lead

**You own:** `backend/` directory entirely (except `backend/app/ml/` which is Member 2's)
**You never touch:** `frontend/`, `data/`
**Tools:** Claude Code or Cursor, pointing at `backend/` folder

---

### M1 — Step 1: Initialize repo and backend skeleton

**FIRST — coordinate with Member 5 to create the GitHub repo, then clone it:**
```bash
git clone https://github.com/YOUR_ORG/career-path-recommender.git
cd career-path-recommender
```

**Open the `backend/` folder in Claude Code or Cursor and run this prompt:**

```
I am building a FastAPI backend for an AI-powered learning path recommender
that uses Supabase (PostgreSQL + pgvector) and Groq LLM. Set up the complete
backend skeleton with this EXACT folder and file structure:

backend/
  requirements.txt
  Dockerfile
  .env.example
  app/
    __init__.py
    main.py
    config.py
    middleware/
      __init__.py
      auth.py
    routers/
      __init__.py
      profile.py
      paths.py
      steps.py
      feedback.py
      assistant.py
    services/
      __init__.py
      profile_service.py
      path_service.py
      feedback_service.py
      assistant_service.py
    ml/
      __init__.py
      registry.py
      embedder.py
      retriever.py
      recommender.py
    schemas/
      __init__.py
      profile.py
      path.py
      course.py
      feedback.py
    prompts/
      profile_extract.txt
      path_generate.txt
      explain.txt
      assistant.txt

Implement each file exactly as follows:

--- main.py ---
FastAPI app with:
- CORS middleware allowing all origins and all methods and headers (dev mode)
- Mount all 5 routers with prefix /api:
  /api/profile (profile router)
  /api/paths (paths router)
  /api/paths (steps router — it adds /{path_id}/steps)
  /api/steps (feedback router)
  /api/assistant (assistant router)
- GET /health endpoint returning {"status": "ok", "version": "1.0.0"}

--- config.py ---
Use pydantic-settings BaseSettings to load from .env:
  SUPABASE_URL: str
  SUPABASE_ANON_KEY: str
  SUPABASE_SERVICE_ROLE_KEY: str
  SUPABASE_JWT_SECRET: str
  GROQ_API_KEY: str
Create a settings singleton.
Initialize and export:
  supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  groq_client = Groq(api_key=GROQ_API_KEY)

--- middleware/auth.py ---
A FastAPI dependency function verify_jwt that:
  - Takes HTTPAuthorizationCredentials from HTTPBearer
  - Decodes the JWT using PyJWT with SUPABASE_JWT_SECRET and algorithm HS256
  - The audience is "authenticated"
  - Extracts and returns the "sub" field (user_id as string)
  - Raises HTTPException(401, "Invalid or expired token") on any error

--- All 5 router files ---
Each router file should define an APIRouter with the correct prefix.
Every endpoint returns {"message": "not implemented"} for now.
Correct endpoints:
  profile.py:   POST /  (this becomes POST /api/profile)
  paths.py:     POST /generate, GET /{path_id}
  steps.py:     GET /{path_id}/steps   (prefix will be /api/paths)
  feedback.py:  POST /{step_id}/feedback  (prefix: /api/steps)
  assistant.py: POST /ask  (prefix: /api/assistant)
All endpoints require Depends(verify_jwt).

--- All 4 service files ---
Stub functions with correct signatures returning None.
profile_service.py:
  extract_profile(goal_text: str) -> dict
  upsert_profile(user_id: str, data: dict) -> dict
path_service.py:
  generate_path(user_id: str, profile: dict) -> dict
  generate_explanation(profile: dict, course: dict) -> str
  get_path(path_id: str, user_id: str) -> dict
feedback_service.py:
  handle_feedback(step_id: str, event_type: str, note: str, user_id: str) -> dict
assistant_service.py:
  ask(question: str, path_id: str, user_id: str) -> str

--- ml/ files (stubs only — Member 2 will implement) ---
embedder.py:
  def embed_text(text: str) -> list[float]:
      return [0.0] * 384
retriever.py:
  def retrieve_candidates(embedding: list[float], n: int = 15) -> list[dict]:
      return []
recommender.py:
  class Recommender:
      def recommend(self, profile: dict) -> list[dict]:
          return []
registry.py:
  from app.ml.recommender import Recommender
  _instance = None
  def get_recommender() -> Recommender:
      global _instance
      if _instance is None:
          _instance = Recommender()
      return _instance

--- schemas/ ---
profile.py:
  class ProfileCreateSchema(BaseModel): goal_text: str
  class ProfileSchema(BaseModel):
    id: str; user_id: str; goal_text: str; target_role: str
    current_level: str; interests: list[str]; weekly_hours: int
path.py:
  class StepSchema(BaseModel):
    step_id: str; course_id: str; title: str; provider: str
    duration_hrs: int; difficulty: str; explanation: str; status: str
  class MilestoneSchema(BaseModel):
    label: str; sequence_order: int; steps: list[StepSchema]
  class PathSchema(BaseModel):
    path_id: str; milestones: list[MilestoneSchema]
course.py:
  class CourseSchema(BaseModel):
    id: str; title: str; description: str; provider: str
    skill_tags: list[str]; difficulty: str; duration_hrs: int
    prerequisites: list[str]; resource_url: str; similarity: float = 0.0
feedback.py:
  class FeedbackCreateSchema(BaseModel):
    event_type: str  # "completed" | "too_easy" | "not_interested"
    note: str = ""

--- requirements.txt ---
fastapi
uvicorn[standard]
supabase
groq
pyjwt[crypto]
pydantic-settings
sentence-transformers
python-dotenv
httpx
numpy

--- .env.example ---
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
GROQ_API_KEY=your_groq_api_key_here

--- Dockerfile ---
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

--- Root .gitignore (place at repo root, not inside backend/) ---
__pycache__/
*.pyc
.env
venv/
.DS_Store
node_modules/
dist/
*.egg-info/
.pytest_cache/
```

**Verify locally:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill your real keys in .env
uvicorn app.main:app --reload --port 8000

# Test 1: health check
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"1.0.0"}

# Test 2: docs page loads
# Open http://localhost:8000/docs in browser — should show all 6 endpoints
```

**Push:**
```bash
cd ..   # back to repo root
git add .
git commit -m "feat(M1-S1): backend skeleton, /health live, all routes stubbed"
git push origin main
```
> 📢 **ANNOUNCE IN TEAM CHAT:** "M1-S1 done — backend skeleton pushed.
> Member 2: clone and start ml/embedder.py
> Member 3: clone and start React scaffold
> Member 4: clone after Member 3 pushes scaffold"

---

### M1 — Step 2: Auth middleware + real profile endpoint

**Wait for:** Member 5 confirms Supabase schema is applied (Module 0 gate ✅)
**Get:** `SUPABASE_JWT_SECRET` from Supabase → Settings → API → JWT Settings

```bash
git pull origin main
```

**Prompt:**
```
I have a FastAPI backend with stubs. Implement auth and the profile endpoint properly.

In backend/app/middleware/auth.py, fully implement verify_jwt():
  from fastapi import Depends, HTTPException
  from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
  import jwt
  from app.config import settings

  security = HTTPBearer()

  def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
      token = credentials.credentials
      try:
          payload = jwt.decode(
              token,
              settings.SUPABASE_JWT_SECRET,
              algorithms=["HS256"],
              audience="authenticated"
          )
          user_id: str = payload.get("sub")
          if not user_id:
              raise HTTPException(status_code=401, detail="Invalid token: no sub claim")
          return user_id
      except jwt.ExpiredSignatureError:
          raise HTTPException(status_code=401, detail="Token expired")
      except jwt.InvalidTokenError as e:
          raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

In backend/app/services/profile_service.py implement:
  from app.config import supabase_client

  def upsert_profile(user_id: str, data: dict) -> dict:
      """Upserts a profile row in Supabase. Returns the saved row dict."""
      payload = {
          "id": user_id,
          "goal_text": data.get("goal_text", ""),
          "target_role": data.get("target_role", ""),
          "current_level": data.get("current_level", "beginner"),
          "interests": data.get("interests", []),
          "weekly_hours": data.get("weekly_hours", 10)
      }
      result = supabase_client.table("profiles").upsert(payload).execute()
      return result.data[0] if result.data else payload

  def extract_profile(goal_text: str) -> dict:
      """STUB — returns hardcoded mock for now. Member 2 will trigger real call in M1-S3."""
      return {
          "target_role": "Software Engineer",
          "current_level": "beginner",
          "interests": ["python", "web development", "databases"],
          "weekly_hours": 10
      }

In backend/app/routers/profile.py implement POST /:
  from fastapi import APIRouter, Depends
  from app.middleware.auth import verify_jwt
  from app.schemas.profile import ProfileCreateSchema, ProfileSchema
  from app.services import profile_service

  router = APIRouter(prefix="/profile", tags=["profile"])

  @router.post("/", response_model=dict)
  async def create_or_update_profile(
      body: ProfileCreateSchema,
      user_id: str = Depends(verify_jwt)
  ):
      extracted = profile_service.extract_profile(body.goal_text)
      extracted["goal_text"] = body.goal_text
      saved = profile_service.upsert_profile(user_id, extracted)
      return saved
```

**Test:**
```bash
# Restart the server
uvicorn app.main:app --reload --port 8000

# Get a test JWT: sign up a user in Supabase Auth dashboard
# Supabase Dashboard → Authentication → Users → Add user
# Then: Supabase Dashboard → Authentication → Users → [click user] → Generate access token

curl -X POST http://localhost:8000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "Content-Type: application/json" \
  -d '{"goal_text": "I want to learn web development"}'

# Expected: JSON with target_role, current_level, interests
# Also check: Supabase Table Editor → profiles table shows a new row
```

**Update PROGRESS_TRACKER.md:**
```markdown
- [x] M1-S2: Auth middleware + profile upsert — working as of [DATE TIME]
```

**Push:**
```bash
git add backend/app/middleware/auth.py backend/app/services/profile_service.py \
        backend/app/routers/profile.py PROGRESS_TRACKER.md
git commit -m "feat(M1-S2): auth middleware live, profile upsert to Supabase working"
git push origin main
```
> 📢 **ANNOUNCE:** "M1-S2 done — auth + profile endpoint live. No JWT → 401 confirmed."

---

### M1 — Step 3: Groq profile extraction (replaces the mock)

**Wait for:** Member 2's M2-S2 push (embed_text working — confirms Groq/ML env is set up)

```bash
git pull origin main
```

**Prompt:**
```
Replace the stub extract_profile() in backend/app/services/profile_service.py
with a real Groq LLM call.

Also write the system prompt file at backend/app/prompts/profile_extract.txt.

--- profile_extract.txt content ---
You are a career advisor AI. A learner has described their learning goal in
natural language. Your job is to extract structured information from their text.

Return ONLY a valid JSON object with exactly these keys:
- "target_role": string — the job title or skill area they want to reach
- "current_level": string — must be exactly one of: "beginner", "intermediate", "advanced"
- "interests": array of strings — 2 to 6 specific skill keywords (e.g. "python", "machine learning", "react")
- "weekly_hours": integer — hours per week they can study (between 5 and 40)

Do NOT include any text, explanation, or markdown formatting outside the JSON object.
Do NOT use code fences. Return raw JSON only.

Example output:
{"target_role": "Data Scientist", "current_level": "beginner", "interests": ["python", "statistics", "machine learning"], "weekly_hours": 10}
--- end of file ---

--- profile_service.py: replace extract_profile() ---
import json
from app.config import groq_client, settings
from pathlib import Path

def _load_prompt(name: str) -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / name
    return prompt_path.read_text()

def extract_profile(goal_text: str) -> dict:
    system_prompt = _load_prompt("profile_extract.txt")

    def call_groq(messages):
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=400,
            temperature=0.1
        )
        return response.choices[0].message.content.strip()

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": goal_text}
    ]

    raw = call_groq(messages)

    try:
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        # Validate required keys exist
        assert "target_role" in result
        assert result.get("current_level") in ["beginner", "intermediate", "advanced"]
        assert isinstance(result.get("interests"), list)
        assert isinstance(result.get("weekly_hours"), int)
        return result
    except (json.JSONDecodeError, AssertionError, KeyError):
        # Retry once with explicit instruction
        messages.append({"role": "assistant", "content": raw})
        messages.append({
            "role": "user",
            "content": "Return ONLY raw JSON. No markdown, no explanation, no code fences."
        })
        raw2 = call_groq(messages)
        try:
            return json.loads(raw2.strip())
        except Exception:
            # Safe fallback if both attempts fail
            return {
                "target_role": "Software Developer",
                "current_level": "beginner",
                "interests": ["programming", "software development"],
                "weekly_hours": 10
            }
```

**Test:**
```bash
curl -X POST http://localhost:8000/api/profile \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"goal_text": "I am a marketing manager who wants to learn data analysis and build dashboards with Python. I have about 15 hours a week."}'

# Expected: real extracted JSON like:
# {"target_role":"Data Analyst","current_level":"beginner",
#  "interests":["python","data analysis","visualization","dashboards"],"weekly_hours":15}
# AND a real row in Supabase profiles table with those values
```

**Update PROGRESS_TRACKER.md:**
```markdown
- [x] M1-S3: Groq profile extraction — live and writing real rows to Supabase
```

**Push:**
```bash
git add backend/app/services/profile_service.py backend/app/prompts/profile_extract.txt \
        PROGRESS_TRACKER.md
git commit -m "feat(M1-S3): Groq profile extraction live, Pydantic-validated, fallback on retry"
git push origin main
```
> 📢 **ANNOUNCE:** "M1-S3 done — real profile extraction with Groq is live and writing to DB."

---

### M1 — Step 4: Path generation endpoint

**Wait for:** Member 2's M2-S5 push (Recommender.recommend() complete ✅)

```bash
git pull origin main
```

**Prompt:**
```
Implement backend/app/services/path_service.py fully and wire up the
POST /api/paths/generate and GET /api/paths/{path_id} endpoints.

--- backend/app/prompts/path_generate.txt ---
You are a learning path architect. You will receive a learner profile and a list
of candidate courses. Your task is to create a structured learning path.

Rules:
1. Select 8 to 15 courses total from the candidates list.
2. Group them into 3 to 5 milestones ordered from foundational to advanced.
3. Each milestone should have 1 to 4 courses.
4. Respect prerequisite relationships — beginner courses before advanced ones.
5. Fit the path to the learner's weekly_hours — mention estimated weeks per milestone.
6. course_ids in your output MUST come ONLY from the provided candidates — never invent new ones.

Return ONLY a valid JSON object with this exact structure:
{
  "milestones": [
    {
      "label": "short milestone name",
      "estimated_weeks": 2,
      "course_ids": ["uuid1", "uuid2"],
      "rationale": "One sentence explaining why these courses are grouped here and why they fit this learner."
    }
  ]
}
--- end of file ---

--- backend/app/prompts/explain.txt ---
You are a learning advisor. Explain in exactly 2 sentences why this specific course
was recommended for this specific learner. Reference their stated goal and current level.
Be concrete and specific — mention the course name and the learner's goal directly.
Return only the 2-sentence explanation, no preamble.
--- end of file ---

--- path_service.py full implementation ---
import json
from pathlib import Path
from app.config import supabase_client, groq_client
from app.ml.registry import get_recommender

def _load_prompt(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text()

def _call_groq(messages: list, max_tokens: int = 1500) -> str:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2
    )
    return response.choices[0].message.content.strip()

def generate_explanation(profile: dict, course: dict) -> str:
    system = _load_prompt("explain.txt")
    user_msg = f"Learner goal: {profile.get('goal_text','')}. Target role: {profile.get('target_role','')}. Level: {profile.get('current_level','')}. Course: {course.get('title','')} — {course.get('description','')}"
    return _call_groq([
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg}
    ], max_tokens=150)

def generate_path(user_id: str, profile: dict) -> dict:
    # Step 1: Get ranked course recommendations from ML module
    rec = get_recommender()
    courses = rec.recommend(profile)

    if not courses:
        raise ValueError("No courses returned from recommender")

    # Step 2: Build candidate list for LLM
    candidates_for_llm = [
        {"id": c["id"], "title": c["title"], "description": c["description"],
         "difficulty": c["difficulty"], "skill_tags": c.get("skill_tags", []),
         "duration_hrs": c.get("duration_hrs", 10)}
        for c in courses
    ]

    # Step 3: Call LLM to sequence into milestones
    system_prompt = _load_prompt("path_generate.txt")
    user_msg = f"""LEARNER PROFILE:
{json.dumps(profile, indent=2)}

CANDIDATE COURSES (use ONLY these course IDs):
{json.dumps(candidates_for_llm, indent=2)}

Generate the learning path JSON now."""

    def parse_milestones(raw: str) -> list:
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())["milestones"]

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_msg}
    ]
    raw = _call_groq(messages)

    try:
        milestones = parse_milestones(raw)
    except Exception:
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": "Return ONLY the JSON object. No markdown fences."})
        raw2 = _call_groq(messages)
        milestones = parse_milestones(raw2)

    # Step 4: Save learning_path row
    path_result = supabase_client.table("learning_paths").insert({
        "user_id": user_id,
        "goal_text": profile.get("goal_text", ""),
        "status": "active"
    }).execute()
    path_id = path_result.data[0]["id"]

    # Step 5: Build course lookup from candidates
    course_lookup = {c["id"]: c for c in courses}

    # Step 6: Save path_steps and build response
    response_milestones = []
    sequence_order = 0

    for m_idx, milestone in enumerate(milestones):
        steps = []
        for course_id in milestone.get("course_ids", []):
            course = course_lookup.get(course_id)
            if not course:
                continue
            sequence_order += 1
            explanation = generate_explanation(profile, course)

            supabase_client.table("path_steps").insert({
                "path_id": path_id,
                "course_id": course_id,
                "sequence_order": sequence_order,
                "milestone_label": milestone["label"],
                "status": "not_started",
                "explanation": explanation
            }).execute()

            steps.append({
                "step_id": "",  # will be filled on GET
                "course_id": course_id,
                "title": course.get("title", ""),
                "provider": course.get("provider", ""),
                "duration_hrs": course.get("duration_hrs", 0),
                "difficulty": course.get("difficulty", ""),
                "explanation": explanation,
                "status": "not_started"
            })

        response_milestones.append({
            "label": milestone["label"],
            "sequence_order": m_idx + 1,
            "estimated_weeks": milestone.get("estimated_weeks", 2),
            "steps": steps
        })

    return {"path_id": path_id, "milestones": response_milestones}

def get_path(path_id: str, user_id: str) -> dict:
    # Verify ownership
    path_result = supabase_client.table("learning_paths").select("*").eq("id", path_id).eq("user_id", user_id).execute()
    if not path_result.data:
        raise ValueError("Path not found or access denied")

    # Fetch steps with course data
    steps_result = supabase_client.table("path_steps").select(
        "*, courses(id, title, provider, duration_hrs, difficulty, skill_tags, resource_url)"
    ).eq("path_id", path_id).order("sequence_order").execute()

    steps_data = steps_result.data or []

    # Group steps into milestones
    milestones_dict = {}
    for step in steps_data:
        label = step.get("milestone_label", "Milestone")
        if label not in milestones_dict:
            milestones_dict[label] = {"label": label, "sequence_order": len(milestones_dict)+1, "steps": []}
        course = step.get("courses", {}) or {}
        milestones_dict[label]["steps"].append({
            "step_id": step["id"],
            "course_id": step.get("course_id", ""),
            "title": course.get("title", ""),
            "provider": course.get("provider", ""),
            "duration_hrs": course.get("duration_hrs", 0),
            "difficulty": course.get("difficulty", ""),
            "skill_tags": course.get("skill_tags", []),
            "resource_url": course.get("resource_url", ""),
            "explanation": step.get("explanation", ""),
            "status": step.get("status", "not_started")
        })

    return {"path_id": path_id, "milestones": list(milestones_dict.values())}

--- Update routers/paths.py ---
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import verify_jwt
from app.services import path_service, profile_service

router = APIRouter(prefix="/paths", tags=["paths"])

@router.post("/generate")
async def generate_path(user_id: str = Depends(verify_jwt)):
    profile_result = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if not profile_result.data:
        raise HTTPException(404, "Profile not found. Create a profile first.")
    profile = profile_result.data[0]
    return path_service.generate_path(user_id, profile)

@router.get("/{path_id}")
async def get_path(path_id: str, user_id: str = Depends(verify_jwt)):
    try:
        return path_service.get_path(path_id, user_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
```

**Test:**
```bash
curl -X POST http://localhost:8000/api/paths/generate \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: JSON with path_id and 3-5 milestones with real course names
# Check Supabase: learning_paths table has 1 row, path_steps has 8-15 rows
```

**Update PROGRESS_TRACKER.md**, then push:
```bash
git add backend/ PROGRESS_TRACKER.md
git commit -m "feat(M1-S4): path generation end-to-end, milestones in Supabase"
git push origin main
```
> 📢 **ANNOUNCE:** "M1-S4 done — POST /api/paths/generate live. Member 3 — wire this into your onboarding flow now."

---

### M1 — Step 5: Feedback + adaptation endpoint

**Wait for:** Module 6 gate (M3's onboarding + roadmap UI done)

```bash
git pull origin main
```

**Prompt:**
```
Implement backend/app/services/feedback_service.py fully and
POST /api/steps/{step_id}/feedback in routers/feedback.py.

--- feedback_service.py ---
from app.config import supabase_client
from app.services.path_service import generate_path

def handle_feedback(step_id: str, event_type: str, note: str, user_id: str) -> dict:

    # 1. Fetch the step and verify it belongs to user via learning_paths
    step_result = supabase_client.table("path_steps").select(
        "*, learning_paths(id, user_id, goal_text)"
    ).eq("id", step_id).execute()

    if not step_result.data:
        raise ValueError("Step not found")

    step = step_result.data[0]
    path_info = step.get("learning_paths", {})
    if path_info.get("user_id") != user_id:
        raise PermissionError("Access denied")

    path_id = step["path_id"]

    # 2. Write feedback event first (always, before any mutation)
    supabase_client.table("feedback_events").insert({
        "user_id": user_id,
        "path_id": path_id,
        "step_id": step_id,
        "event_type": event_type,
        "note": note
    }).execute()

    # 3. Handle "completed" — simple status update
    if event_type == "completed":
        supabase_client.table("path_steps").update(
            {"status": "completed"}
        ).eq("id", step_id).execute()
        return {"feedback_id": step_id, "path_updated": False}

    # 4. Handle "too_easy" or "not_interested"
    if event_type in ["too_easy", "not_interested"]:

        # Mark this step as skipped
        supabase_client.table("path_steps").update(
            {"status": "skipped"}
        ).eq("id", step_id).execute()

        # Get the user's current profile
        profile_result = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
        profile = profile_result.data[0] if profile_result.data else {}

        # Adjust profile based on feedback type
        if event_type == "too_easy":
            level_map = {"beginner": "intermediate", "intermediate": "advanced", "advanced": "advanced"}
            profile["current_level"] = level_map.get(profile.get("current_level", "beginner"), "intermediate")

        elif event_type == "not_interested":
            step_course_result = supabase_client.table("courses").select("skill_tags").eq(
                "id", step.get("course_id")
            ).execute()
            if step_course_result.data:
                course_tags = step_course_result.data[0].get("skill_tags", [])
                current_interests = profile.get("interests", [])
                # Remove the first matching tag
                for tag in course_tags:
                    if tag in current_interests:
                        current_interests.remove(tag)
                        break
                profile["interests"] = current_interests

        # Fetch remaining not_started steps for this path
        remaining_result = supabase_client.table("path_steps").select("id").eq(
            "path_id", path_id
        ).eq("status", "not_started").execute()

        remaining_count = len(remaining_result.data) if remaining_result.data else 0

        if remaining_count > 0:
            # Delete old not_started steps
            supabase_client.table("path_steps").delete().eq(
                "path_id", path_id
            ).eq("status", "not_started").execute()

            # Re-generate path for remaining slots
            new_path = generate_path(user_id, profile)

            return {
                "feedback_id": step_id,
                "path_updated": True,
                "updated_steps": new_path.get("milestones", [])
            }

    return {"feedback_id": step_id, "path_updated": False}

--- routers/feedback.py ---
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import verify_jwt
from app.schemas.feedback import FeedbackCreateSchema
from app.services import feedback_service

router = APIRouter(prefix="/steps", tags=["feedback"])

@router.post("/{step_id}/feedback")
async def post_feedback(
    step_id: str,
    body: FeedbackCreateSchema,
    user_id: str = Depends(verify_jwt)
):
    try:
        result = feedback_service.handle_feedback(step_id, body.event_type, body.note, user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError:
        raise HTTPException(status_code=403, detail="Access denied")

--- Also implement GET /api/paths/{path_id}/steps in routers/steps.py ---
from fastapi import APIRouter, Depends
from app.middleware.auth import verify_jwt
from app.config import supabase_client

router = APIRouter(prefix="/paths", tags=["steps"])

@router.get("/{path_id}/steps")
async def get_steps(path_id: str, user_id: str = Depends(verify_jwt)):
    result = supabase_client.table("path_steps").select(
        "*, courses(id, title, provider, duration_hrs, difficulty, skill_tags, resource_url)"
    ).eq("path_id", path_id).order("sequence_order").execute()
    return result.data or []
```

**Push:**
```bash
git add backend/ PROGRESS_TRACKER.md
git commit -m "feat(M1-S5): feedback handling, path adaptation, steps endpoint"
git push origin main
```
> 📢 **ANNOUNCE:** "M1-S5 done — feedback + path adaptation live. Member 4 can wire FeedbackButtons now."

---

### M1 — Step 6: AI Assistant endpoint

**Prompt:**
```
Implement backend/app/services/assistant_service.py and POST /api/assistant/ask.

--- prompts/assistant.txt ---
You are a helpful AI learning advisor. You have full context of the learner's
profile and their personalized learning path. Your job is to answer questions
about the learning path clearly and helpfully.

Rules:
- Keep answers under 3 sentences.
- Always ground your answer in the specific path context provided.
- If asked "why this course", mention the course name and the learner's stated goal.
- If asked about order, reference the prerequisite logic.
- Never make up courses that aren't in the provided path.
- Be encouraging and supportive.
--- end of file ---

--- assistant_service.py ---
import json
from pathlib import Path
from app.config import supabase_client, groq_client

def ask(question: str, path_id: str, user_id: str) -> str:
    # Fetch user profile
    profile_result = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    profile = profile_result.data[0] if profile_result.data else {}

    # Fetch path steps with course details
    steps_result = supabase_client.table("path_steps").select(
        "sequence_order, milestone_label, status, explanation, courses(title, provider, skill_tags, difficulty)"
    ).eq("path_id", path_id).order("sequence_order").execute()
    steps = steps_result.data or []

    # Build context string
    context = f"""LEARNER PROFILE:
Goal: {profile.get('goal_text', 'Not specified')}
Target Role: {profile.get('target_role', 'Not specified')}
Level: {profile.get('current_level', 'beginner')}
Interests: {', '.join(profile.get('interests', []))}
Weekly Hours: {profile.get('weekly_hours', 10)}

LEARNING PATH STEPS:
"""
    for step in steps:
        course = step.get("courses", {}) or {}
        context += f"  Step {step['sequence_order']} [{step['status']}] — {course.get('title','?')} ({step['milestone_label']})\n"
        context += f"    Why: {step.get('explanation','')}\n"

    system_prompt = (Path(__file__).parent.parent / "prompts" / "assistant.txt").read_text()

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt + "\n\n" + context},
            {"role": "user", "content": question}
        ],
        max_tokens=300,
        temperature=0.3
    )
    return response.choices[0].message.content.strip()

--- routers/assistant.py ---
from fastapi import APIRouter, Depends
from app.middleware.auth import verify_jwt
from app.services import assistant_service
from pydantic import BaseModel

router = APIRouter(prefix="/assistant", tags=["assistant"])

class AskSchema(BaseModel):
    question: str
    path_id: str

@router.post("/ask")
async def ask(body: AskSchema, user_id: str = Depends(verify_jwt)):
    answer = assistant_service.ask(body.question, body.path_id, user_id)
    return {"answer": answer}
```

**Push:**
```bash
git add backend/ PROGRESS_TRACKER.md
git commit -m "feat(M1-S6): AI assistant endpoint live, grounded on path context"
git push origin main
```
> 📢 **ANNOUNCE:** "M1-S6 done — ALL backend endpoints complete. Frontend can wire assistant chat."

---

## Member 2 — ML Engineer

**You own:** `backend/app/ml/` exclusively, and `data/` for seeding
**You never touch:** routers/, services/ (except to call your functions), frontend/
**Interface contract:** Your functions MUST keep the exact signatures in §5.2 of Part 1

---

### M2 — Step 1: Clone and read your interface

```bash
# After Member 1 pushes M1-S1:
git clone https://github.com/YOUR_ORG/career-path-recommender.git
cd career-path-recommender
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Read `backend/app/ml/` carefully. You will see stub files. Your job is to
replace the stub function bodies WITHOUT changing function names or signatures.

---

### M2 — Step 2: Implement embed_text()

**Prompt:**
```
In backend/app/ml/embedder.py, fully implement embed_text():

The file must look exactly like this:

from sentence_transformers import SentenceTransformer
import numpy as np

# Load ONCE at module level — loading takes a few seconds and must not happen
# inside the function (it would make every call slow)
_model = SentenceTransformer('all-MiniLM-L6-v2')

def embed_text(text: str) -> list[float]:
    """
    Converts a text string into a 384-dimensional float vector.
    Uses sentence-transformers all-MiniLM-L6-v2 (free, local, no API key).
    Returns an L2-normalized vector as a plain Python list of floats.
    L2 normalization ensures cosine similarity works correctly in pgvector.
    """
    embedding = _model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    return embedding.tolist()

if __name__ == "__main__":
    vec = embed_text("I want to learn machine learning with Python")
    assert len(vec) == 384, f"Expected 384 dimensions, got {len(vec)}"
    assert isinstance(vec[0], float), "Expected list of floats"
    magnitude = sum(x**2 for x in vec) ** 0.5
    assert abs(magnitude - 1.0) < 0.001, "Vector should be L2 normalized (magnitude ≈ 1.0)"
    print(f"✅ embed_text works correctly")
    print(f"   Vector length: {len(vec)}")
    print(f"   Magnitude: {magnitude:.6f}")
    print(f"   First 5 values: {vec[:5]}")
```

**Test:**
```bash
cd backend
python -m app.ml.embedder
# Expected output:
# ✅ embed_text works correctly
#    Vector length: 384
#    Magnitude: 1.000000
#    First 5 values: [0.05..., -0.01..., ...]
```

**Update PROGRESS_TRACKER.md**, then push:
```bash
git add backend/app/ml/embedder.py PROGRESS_TRACKER.md
git commit -m "feat(M2-S2): embed_text() implemented, all-MiniLM-L6-v2, L2 normalized, tested"
git push origin main
```
> 📢 **ANNOUNCE:** "M2-S2 done — embed_text() working. Member 1 can now use it in profile_service."

---

### M2 — Step 3: Generate the course dataset CSV

**Run this prompt in Claude to generate the data (do this in the main Claude chat, not Claude Code):**

```
Generate a CSV of exactly 80 online courses. Output ONLY the CSV content, starting
with the header row, no explanation before or after.

Columns: title,description,provider,skill_tags,difficulty,duration_hrs,prerequisites,resource_url

Strict rules:
- Cover 4 domains evenly (~20 courses each):
  Domain 1 — Data Science & ML: python basics, numpy/pandas, statistics, ML algorithms,
    deep learning, NLP, computer vision, MLOps, model deployment
  Domain 2 — Web Development: HTML/CSS, JavaScript, React, Node.js, REST APIs,
    TypeScript, databases (SQL/NoSQL), fullstack projects
  Domain 3 — Cloud & DevOps: Linux basics, Git, Docker, Kubernetes, AWS fundamentals,
    CI/CD pipelines, Terraform, cloud security
  Domain 4 — Product & Business Tech: SQL for analytics, Tableau/PowerBI, product
    management, agile/scrum, business intelligence, Excel/Sheets advanced
- difficulty: exactly one of beginner, intermediate, advanced
- skill_tags: 3 to 5 skills joined by semicolons, e.g. python;pandas;statistics
- prerequisites: skill_tags that this course requires, semicolons, empty string if beginner
- description: 1-2 sentences. Must mention skills taught. Under 150 characters total.
- provider: real platform — Coursera, edX, Udemy, MIT OCW, fast.ai, Google, freeCodeCamp, etc.
- resource_url: format https://provider.com/course-slug (realistic but not verified)
- duration_hrs: integer between 4 and 60
- No commas inside fields. Wrap any field containing spaces or special chars in double quotes.
- 80 courses exactly — count them.
```

**Save** the output as `data/courses_raw.csv`.

**Then implement the seeding script with this prompt in Claude Code:**

```
In data/seed_courses.py, implement a complete course seeding script:

import csv
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

from supabase import create_client

# Import embedder from the backend app
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from app.ml.embedder import embed_text

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def seed_courses(csv_path: str = "data/courses_raw.csv"):
    seeded = 0
    skipped = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row["title"].strip()

            # Check if already exists
            existing = supabase.table("courses").select("id").eq("title", title).execute()
            if existing.data:
                print(f"  SKIP (exists): {title}")
                skipped += 1
                continue

            # Parse list fields
            skill_tags = [s.strip() for s in row["skill_tags"].split(";") if s.strip()]
            prerequisites = [p.strip() for p in row["prerequisites"].split(";") if p.strip()]

            # Build embedding input: title + description + skills
            embed_input = f"{title}. {row['description'].strip()} Skills: {', '.join(skill_tags)}"
            embedding = embed_text(embed_input)

            # Insert into Supabase
            supabase.table("courses").insert({
                "title": title,
                "description": row["description"].strip(),
                "provider": row["provider"].strip(),
                "skill_tags": skill_tags,
                "difficulty": row["difficulty"].strip(),
                "duration_hrs": int(row["duration_hrs"]),
                "prerequisites": prerequisites,
                "resource_url": row["resource_url"].strip(),
                "embedding": embedding
            }).execute()

            print(f"  ✅ Seeded: {title}")
            seeded += 1

    print(f"\nDone. Seeded: {seeded}, Skipped: {skipped}, Total: {seeded + skipped}")

def verify_retrieval():
    print("\nVerification — top 5 matches for 'learn python for data science':")
    test_embedding = embed_text("learn python for data science machine learning")
    result = supabase.rpc("match_courses", {
        "query_embedding": test_embedding,
        "match_count": 5
    }).execute()
    for i, course in enumerate(result.data or [], 1):
        print(f"  {i}. [{course['similarity']:.3f}] {course['title']} ({course['difficulty']})")

if __name__ == "__main__":
    if "--verify" in sys.argv:
        verify_retrieval()
    else:
        seed_courses()
        verify_retrieval()
```

**Run it:**
```bash
# From repo root
cd backend && source venv/bin/activate && cd ..
python data/seed_courses.py

# Should print 80 ✅ Seeded lines (or SKIPs if you ran it before)
# Then prints top-5 verification results

# Verify in Supabase: Table Editor → courses → should show 80 rows
# Check that embedding column is NOT null for any row
```

**Push:**
```bash
git add data/ PROGRESS_TRACKER.md
git commit -m "feat(M2-S3): 80 courses seeded in Supabase with pgvector embeddings, retrieval verified"
git push origin main
```
> 📢 **ANNOUNCE:** "M2-S3 done — 80 courses in Supabase with embeddings. Verify script passes top-5 check."

---

### M2 — Step 4: Implement retrieve_candidates()

**Prompt:**
```
In backend/app/ml/retriever.py, implement retrieve_candidates():

import os
from supabase import create_client
from app.config import supabase_client

def retrieve_candidates(embedding: list[float], n: int = 15) -> list[dict]:
    """
    Calls the Supabase match_courses() RPC function.
    embedding: a 384-element list of floats (L2 normalized)
    n: max number of results to return
    Returns a list of course dicts sorted by similarity (highest first).
    Each dict has: id, title, description, skill_tags, difficulty,
                   duration_hrs, prerequisites, resource_url, similarity
    """
    result = supabase_client.rpc("match_courses", {
        "query_embedding": embedding,
        "match_count": n
    }).execute()

    return result.data if result.data else []

if __name__ == "__main__":
    from app.ml.embedder import embed_text
    print("Testing retriever with query: 'React web development JavaScript'")
    emb = embed_text("React web development JavaScript frontend")
    results = retrieve_candidates(emb, n=5)
    print(f"Got {len(results)} results:")
    for r in results:
        print(f"  [{r['similarity']:.3f}] {r['title']} ({r['difficulty']})")
    assert len(results) > 0, "Should return results — check that courses are seeded"
    print("✅ retriever works")
```

**Test:**
```bash
cd backend
python -m app.ml.retriever
# Should show 5 courses related to React/JavaScript
# Similarity scores should be between 0.0 and 1.0
```

**Push:**
```bash
git add backend/app/ml/retriever.py PROGRESS_TRACKER.md
git commit -m "feat(M2-S4): retrieve_candidates() pgvector cosine search verified"
git push origin main
```

---

### M2 — Step 5: Implement Recommender class

**Prompt:**
```
In backend/app/ml/recommender.py, implement the full Recommender class:

from app.ml.embedder import embed_text
from app.ml.retriever import retrieve_candidates

LEVEL_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}

class Recommender:
    """
    Given a learner profile, returns an ordered and filtered list of courses.
    Strategy:
      1. Build composite query from goal + interests + target role
      2. Embed and retrieve top 20 candidates via pgvector
      3. Re-rank: beginner learners see beginner/intermediate first,
         advanced learners see advanced first.
      4. Boost courses where all prerequisite tags are in learner's interests
         (they're a good fit for this learner's current knowledge).
      5. Deprioritize courses more than one level above the learner.
      6. Return top 15.
    """

    def recommend(self, profile: dict) -> list[dict]:
        goal_text = profile.get("goal_text", "")
        target_role = profile.get("target_role", "")
        interests = profile.get("interests", [])
        current_level = profile.get("current_level", "beginner")

        query = f"{goal_text} {target_role} {' '.join(interests)}"
        embedding = embed_text(query)
        candidates = retrieve_candidates(embedding, n=20)

        ranked = self._rerank(candidates, current_level, interests)
        return ranked[:15]

    def _rerank(self, candidates: list[dict], current_level: str, interests: list[str]) -> list[dict]:
        learner_level = LEVEL_ORDER.get(current_level, 0)
        interests_set = set(tag.lower() for tag in interests)

        scored = []
        for course in candidates:
            course_level = LEVEL_ORDER.get(course.get("difficulty", "beginner"), 0)
            level_diff = course_level - learner_level

            # Priority score: lower is better (will be sorted ascending)
            priority = 0

            # Penalize courses more than 1 level above learner
            if level_diff > 1:
                priority += 10

            # Boost courses at learner's level or one level above
            if level_diff == 0:
                priority -= 2
            elif level_diff == 1:
                priority -= 1

            # Boost if course prerequisites are subset of learner's interests
            prereqs = set(p.lower() for p in course.get("prerequisites", []))
            if prereqs and prereqs.issubset(interests_set):
                priority -= 2  # Good fit — learner has the prerequisites

            # Boost by similarity score (higher similarity = lower priority number)
            similarity = course.get("similarity", 0.0)
            priority -= similarity  # similarity is 0.0-1.0

            scored.append((priority, course))

        # Sort by priority score ascending (lowest = most relevant)
        scored.sort(key=lambda x: x[0])
        return [course for _, course in scored]

if __name__ == "__main__":
    rec = Recommender()
    test_profile = {
        "goal_text": "I want to become a data scientist",
        "target_role": "Data Scientist",
        "current_level": "beginner",
        "interests": ["python", "statistics", "data analysis"],
        "weekly_hours": 10
    }
    results = rec.recommend(test_profile)
    print(f"Recommendations for beginner data scientist ({len(results)} courses):")
    for i, course in enumerate(results[:5], 1):
        print(f"  {i}. {course['title']} ({course['difficulty']}) [{course.get('similarity',0):.3f}]")
    assert len(results) > 0
    print("✅ Recommender works")
```

**Test:**
```bash
cd backend
python -m app.ml.recommender
# Should show 5 relevant courses for a beginner data scientist
# Beginner-level courses should appear first
```

**Push:**
```bash
git add backend/app/ml/recommender.py backend/app/ml/registry.py PROGRESS_TRACKER.md
git commit -m "feat(M2-S5): Recommender with priority re-ranking, level filtering, prerequisite boost"
git push origin main
```
> 📢 **ANNOUNCE:** "M2-S5 done — ML module fully complete. Member 1, recommend() is ready to use in path_service."

---

## Member 3 — Frontend Lead

**You own:** React scaffold, routing, AuthContext, LandingPage, OnboardingPage, RoadmapPage
**You never touch:** backend/, data/
**Member 4 depends on your scaffold** — push M3-S1 early so they can start

---

### M3 — Step 1: Scaffold the React app

**After Member 1 pushes M1-S1, clone and scaffold:**
```bash
git clone https://github.com/YOUR_ORG/career-path-recommender.git
cd career-path-recommender
```

**Prompt:**
```
Scaffold a complete Vite + React + TailwindCSS frontend inside a folder
called "frontend/" at the current directory. Do not create it inside backend/.

Run these setup commands (show me the exact terminal commands to run):
1. npm create vite@latest frontend -- --template react
2. cd frontend && npm install
3. npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
4. npm install @supabase/supabase-js axios react-router-dom

Then set up TailwindCSS:
- tailwind.config.js: content array should be ["./index.html","./src/**/*.{js,jsx}"]
- src/index.css: replace contents with @tailwind base; @tailwind components; @tailwind utilities;

Create ALL of these files with placeholder content (an h1 showing the filename):
  src/lib/supabaseClient.js          → placeholder comment
  src/lib/apiClient.js               → placeholder comment
  src/contexts/AuthContext.jsx       → placeholder export
  src/hooks/useAuth.js               → placeholder export
  src/hooks/usePath.js               → placeholder export
  src/hooks/useFeedback.js           → placeholder export
  src/pages/LandingPage.jsx          → <h1>LandingPage</h1>
  src/pages/OnboardingPage.jsx       → <h1>OnboardingPage</h1>
  src/pages/RoadmapPage.jsx          → <h1>RoadmapPage</h1>
  src/pages/DashboardPage.jsx        → <h1>DashboardPage</h1>
  src/components/auth/AuthCard.jsx
  src/components/auth/ProtectedRoute.jsx
  src/components/onboarding/ChatInput.jsx
  src/components/onboarding/GoalConfirm.jsx
  src/components/onboarding/GeneratingLoader.jsx
  src/components/roadmap/RoadmapTimeline.jsx
  src/components/roadmap/MilestoneCard.jsx
  src/components/roadmap/ResourceItem.jsx
  src/components/roadmap/WhyThisDrawer.jsx
  src/components/dashboard/ProgressHeader.jsx
  src/components/dashboard/SkillMap.jsx
  src/components/dashboard/NextActions.jsx
  src/components/dashboard/FeedbackButtons.jsx
  src/components/assistant/AssistantChat.jsx
  src/components/assistant/MessageBubble.jsx

Create frontend/.env.example:
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your_anon_key
  VITE_API_URL=http://localhost:8000

Create frontend/vercel.json:
  {"rewrites":[{"source":"/(.*)", "destination":"/index.html"}]}

Update App.jsx to just render <h1>App works</h1> for now.
```

**Test:**
```bash
cd frontend && cp .env.example .env
npm run dev
# Open http://localhost:5173 — should show "App works" without errors
```

**Push:**
```bash
cd ..
git add frontend/ PROGRESS_TRACKER.md
git commit -m "feat(M3-S1): React+Vite+Tailwind scaffold, all component files created"
git push origin main
```
> 📢 **ANNOUNCE:** "M3-S1 done — React scaffold pushed. Member 4: clone now and start dashboard components."

---

### M3 — Step 2: supabaseClient, apiClient, AuthContext, Routing

**Prompt:**
```
Implement the shared infrastructure in frontend/src:

--- src/lib/supabaseClient.js ---
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

--- src/lib/apiClient.js ---
import axios from 'axios'
import { supabase } from './supabaseClient'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
}, (error) => Promise.reject(error))

export default api

--- src/contexts/AuthContext.jsx ---
Full implementation:
- AuthContext created with createContext
- AuthProvider component that:
  * Tracks: session (null), loading (true)
  * On mount: calls supabase.auth.getSession() to restore existing session
  * Subscribes to supabase.auth.onAuthStateChange to keep session updated
  * Unsubscribes on cleanup
  * Provides: session, loading, signIn(email,password), signUp(email,password,fullName), signOut()
  * signIn: supabase.auth.signInWithPassword({email,password}), throws on error
  * signUp: supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}}), throws on error
  * signOut: supabase.auth.signOut()
- Export AuthProvider as default
- Export useAuth hook: useContext(AuthContext), throws if outside provider

--- src/hooks/useAuth.js ---
export { useAuth } from '../contexts/AuthContext'

--- src/components/auth/ProtectedRoute.jsx ---
import { useAuth } from '../../hooks/useAuth'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
  </div>
  if (!session) return <Navigate to="/" replace />
  return children
}

--- src/App.jsx ---
Full routing setup with React Router v6:
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import RoadmapPage from './pages/RoadmapPage'
import DashboardPage from './pages/DashboardPage'

Routes:
  /           → LandingPage (public)
  /onboarding → OnboardingPage (wrapped in ProtectedRoute)
  /roadmap/:pathId → RoadmapPage (wrapped in ProtectedRoute)
  /roadmap    → RoadmapPage without pathId (wrapped in ProtectedRoute)
  /dashboard  → DashboardPage (wrapped in ProtectedRoute)
  *           → Navigate to /

Wrap everything in AuthProvider and BrowserRouter.
```

**Push:**
```bash
git add frontend/src/ PROGRESS_TRACKER.md
git commit -m "feat(M3-S2): AuthContext, supabaseClient, apiClient, routing with ProtectedRoute"
git push origin main
```

---

### M3 — Step 3: Landing page + AuthCard

**Prompt:**
```
Build frontend/src/pages/LandingPage.jsx and
frontend/src/components/auth/AuthCard.jsx using only Tailwind CSS (no UI library).

LandingPage:
- Full-screen gradient background: bg-gradient-to-br from-indigo-900 to-blue-900
- Centered vertically and horizontally with flex
- Content: Logo icon (brain emoji or simple SVG), title "PathAI", tagline
  "Your AI-powered career learning roadmap — personalized to your goals"
- Below: render <AuthCard />
- If user already has a session (use useAuth), navigate to /dashboard immediately
- Use useNavigate from react-router-dom

AuthCard (src/components/auth/AuthCard.jsx):
- White card, rounded-2xl, shadow-xl, max-w-md, padding p-8
- Two tab buttons at top: "Sign In" | "Sign Up" — active tab has indigo background
- State: activeTab ("signin" | "signup"), email, password, fullName (signup only),
  isLoading (bool), error (string or null)

Sign In tab:
  - Email input (type=email)
  - Password input (type=password)
  - "Sign In" button (indigo, full width)
  - On submit: call signIn(email, password), navigate to /dashboard on success
  - Show error message in red text below form on failure

Sign Up tab:
  - Full Name input
  - Email input
  - Password input (min 6 chars)
  - "Create Account" button (indigo, full width)
  - On submit: call signUp(email, password, fullName), navigate to /onboarding on success
  - Show error message in red text below form on failure

Both tabs:
  - Disable button and show spinner while loading (isLoading state)
  - Clear error when user types in any field

Tailwind styling for inputs: w-full px-3 py-2 border border-gray-300 rounded-lg
  focus:outline-none focus:ring-2 focus:ring-indigo-500
```

**Push:**
```bash
git add frontend/src/pages/LandingPage.jsx frontend/src/components/auth/ PROGRESS_TRACKER.md
git commit -m "feat(M3-S3): Landing page + AuthCard with sign in/sign up tabs"
git push origin main
```

---

### M3 — Step 4: Onboarding (Chat intake)

**Wait for:** M1-S3 gate (POST /api/profile returns real extracted data)

```bash
git pull origin main
```

**Prompt:**
```
Build frontend/src/pages/OnboardingPage.jsx and all three onboarding components.

OnboardingPage uses a state machine with 3 phases: "chat" → "confirm" → "generating"

STATE AND LOGIC:
  const [phase, setPhase] = useState("chat")
  const [goalText, setGoalText] = useState("")
  const [extractedProfile, setExtractedProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  handleGoalSubmit(text):
    setIsLoading(true)
    try:
      result = await api.post("/api/profile", { goal_text: text })
      setExtractedProfile(result.data)
      setPhase("confirm")
    catch: setError("Could not process your goal. Please try again.")
    finally: setIsLoading(false)

  handleConfirm():
    setPhase("generating")
    try:
      result = await api.post("/api/paths/generate", {})
      navigate(`/roadmap/${result.data.path_id}`)
    catch: setError("Path generation failed. Please try again.")

  handleEdit():
    setPhase("chat")
    setExtractedProfile(null)

RENDER:
  Phase "chat": show welcome card + <ChatInput onSubmit={handleGoalSubmit} isLoading={isLoading} />
  Phase "confirm": show <GoalConfirm profile={extractedProfile} onConfirm={handleConfirm} onEdit={handleEdit} />
  Phase "generating": show <GeneratingLoader />
  Always show error in red text if error is set.

ChatInput component:
  - Props: onSubmit(text), isLoading
  - Textarea with placeholder: "e.g. I'm a marketing professional who wants to transition
    into data science. I have basic Excel skills and can study 10 hours a week."
  - "Generate My Path →" button, disabled when isLoading or text is empty
  - Show spinner inside button when loading

GoalConfirm component:
  - Props: profile {target_role, current_level, interests, weekly_hours}, onConfirm, onEdit
  - Card with title "Here's what I understood:"
  - Show: Target Role (bold), Level (colored badge), Skills/Interests (colored tags), Weekly Hours
  - Two buttons: "✨ Generate My Learning Path" (indigo) and "Let me rephrase" (gray outline)

GeneratingLoader component:
  - 4 stages shown in order: ["🔍 Understanding your goals", "📚 Finding relevant courses",
    "🧠 Sequencing your learning path", "✨ Preparing your roadmap"]
  - Use setInterval to advance the active stage every 1.5 seconds
  - Highlight the active stage (indigo text + bold), others gray
  - Show a pulsing progress bar at the bottom

Page layout: indigo gradient background matching Landing. Center content vertically.
```

**Push:**
```bash
git add frontend/src/pages/OnboardingPage.jsx frontend/src/components/onboarding/ PROGRESS_TRACKER.md
git commit -m "feat(M3-S4): Onboarding chat intake, 3-phase state machine, loading stages"
git push origin main
```

---

### M3 — Step 5: Roadmap view

**Wait for:** M1-S4 gate (GET /api/paths/:id working)

```bash
git pull origin main
```

**Prompt:**
```
Build frontend/src/pages/RoadmapPage.jsx and all roadmap components.

RoadmapPage:
  - Extract pathId from useParams()
  - On mount: GET /api/paths/{pathId} via apiClient
  - Show loading spinner while fetching, error card if fails
  - Render: a top nav bar, <RoadmapTimeline milestones={data.milestones} />,
    and <AssistantChat pathId={pathId} /> (from components/assistant/ — render as stub for now)

Top nav bar (simple):
  - Left: "← PathAI" text button → navigate to /dashboard
  - Right: "My Dashboard" link → navigate to /dashboard

RoadmapTimeline:
  - Props: milestones (array)
  - Vertical list of <MilestoneCard> for each milestone
  - Show a vertical line connecting the milestone cards (use relative/absolute positioning)

MilestoneCard:
  - Props: milestone {label, sequence_order, steps, estimated_weeks}
  - Header: circle with number, milestone label, "~X weeks" badge
  - Collapsible body: open by default for index 0, closed for others
  - Toggle open/closed on header click
  - Body: map steps to <ResourceItem step={step} />

ResourceItem:
  - Props: step {step_id, title, provider, duration_hrs, difficulty, explanation, status}
  - Left: a circle checkbox (visual only — Member 4 will wire feedback)
  - Main: course title (bold), provider in gray, difficulty badge, duration badge
  - Right: "Why this? →" button that opens WhyThisDrawer
  - Completed status: gray out the entire row with line-through on title

WhyThisDrawer:
  - Props: explanation (string), isOpen (bool), onClose (fn)
  - Fixed overlay on the right side: fixed inset-y-0 right-0 w-80 bg-white shadow-2xl p-6
  - Title "Why this course?" + explanation text + close button
  - Overlay backdrop (dark semi-transparent) on the left that closes drawer on click

Styling: clean white cards on a light gray background (bg-gray-50). Indigo accents.
Difficulty badges: beginner=green, intermediate=yellow, advanced=red.
```

**Push:**
```bash
git add frontend/src/pages/RoadmapPage.jsx frontend/src/components/roadmap/ PROGRESS_TRACKER.md
git commit -m "feat(M3-S5): Roadmap view with milestone cards, WhyThis drawer, collapsible"
git push origin main
```
> 📢 **ANNOUNCE:** "M3-S5 done — Roadmap view complete. Module 6 gate passed. Member 4, pull now and wire feedback buttons."

---

## Member 4 — Frontend Engineer

**You own:** DashboardPage, ProgressHeader, SkillMap, NextActions, FeedbackButtons, AssistantChat
**You depend on:** Member 3's scaffold (must wait for M3-S1 before cloning)
**You share:** frontend/src/components/ with Member 3 — always pull before working

---

### M4 — Step 1: Clone and set up

**Wait for:** M3-S1 push.

```bash
git clone https://github.com/YOUR_ORG/career-path-recommender.git
cd career-path-recommender/frontend
npm install
cp .env.example .env   # fill in Supabase keys
npm run dev
# Should see Member 3's scaffold running
```

---

### M4 — Step 2: Dashboard page + ProgressHeader

**Wait for:** M3-S2 push (AuthContext + routing live)

```bash
git pull origin main
```

**Prompt:**
```
Build frontend/src/pages/DashboardPage.jsx and
frontend/src/components/dashboard/ProgressHeader.jsx.

DashboardPage:
  import { supabase } from '../lib/supabaseClient'
  import { useAuth } from '../hooks/useAuth'
  import { useNavigate } from 'react-router-dom'

  On mount, fetch path data directly from Supabase (RLS limits to own data):
    const { data: paths } = await supabase
      .from('learning_paths')
      .select(`
        id, goal_text, status, generated_at,
        path_steps (
          id, sequence_order, milestone_label, status, explanation,
          courses ( id, title, provider, difficulty, skill_tags, duration_hrs, resource_url )
        )
      `)
      .eq('status', 'active')
      .order('generated_at', { ascending: false })
      .limit(1)

  Compute from the fetched data:
    const allSteps = paths?.[0]?.path_steps || []
    const totalSteps = allSteps.length
    const completedSteps = allSteps.filter(s => s.status === 'completed').length
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps/totalSteps)*100) : 0
    const skillsGained = [...new Set(
      allSteps
        .filter(s => s.status === 'completed')
        .flatMap(s => s.courses?.skill_tags || [])
    )]
    const nextSteps = allSteps
      .filter(s => s.status === 'not_started')
      .sort((a,b) => a.sequence_order - b.sequence_order)
      .slice(0, 3)

  If no active path: show empty state card with navigate to /onboarding button.
  If has path: render ProgressHeader, SkillMap, NextActions with the computed data.
  Show a top nav: left "PathAI", right link to /roadmap/{path_id}

ProgressHeader:
  - Props: percent (0-100), totalSteps, completedSteps, pathId
  - Show a circular SVG progress ring (use SVG circle with stroke-dasharray/dashoffset)
    Radius 40, stroke-width 8, circumference = 2 * PI * 40 = 251.2
    stroke-dashoffset = circumference * (1 - percent/100)
    Background circle: stroke gray-200, Foreground: stroke indigo-600
  - Center text: "{percent}%"
  - Below ring: "{completedSteps} of {totalSteps} steps completed"
  - Link: "View full roadmap →" → navigate to /roadmap/{pathId}
  - Card styling: white, rounded-2xl, shadow, p-6, centered content
```

**Push:**
```bash
git add frontend/src/pages/DashboardPage.jsx frontend/src/components/dashboard/ProgressHeader.jsx \
        PROGRESS_TRACKER.md
git commit -m "feat(M4-S2): Dashboard page, ProgressHeader with SVG ring, Supabase real data"
git push origin main
```

---

### M4 — Step 3: SkillMap + NextActions + FeedbackButtons

**Prompt:**
```
Build the remaining dashboard components.

SkillMap (src/components/dashboard/SkillMap.jsx):
  - Props: skills (string array)
  - Section heading: "Skills Gained" with a brain icon (emoji ok)
  - Render each skill as a badge: bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-medium
  - If empty: gray italic text "Complete steps in your roadmap to see skills you've earned"

NextActions (src/components/dashboard/NextActions.jsx):
  - Props: steps (array), pathId (string), onRefresh (function)
  - Section heading: "Up Next"
  - For each step (max 3), render a white card with:
    * Course title (bold), provider + difficulty badge + duration in gray
    * A horizontal rule
    * <FeedbackButtons stepId={step.id} onFeedbackGiven={onRefresh} />
  - If no steps: show "🎉 You're all caught up! View your full roadmap for more."

FeedbackButtons (src/components/dashboard/FeedbackButtons.jsx):
  - Props: stepId (string), onFeedbackGiven (function(response))
  - Import apiClient from ../../lib/apiClient
  - State: loadingType (null | "completed" | "too_easy" | "not_interested"), error

  Three buttons in a row:
    ✅ "Mark Done" — green (bg-green-100 text-green-700 hover:bg-green-200)
    ⚡ "Too Easy" — amber (bg-amber-100 text-amber-700 hover:bg-amber-200)
    🙅 "Not for Me" — red (bg-red-100 text-red-700 hover:bg-red-200)

  On any button click:
    setLoadingType(buttonType)
    try:
      response = await apiClient.post(`/api/steps/${stepId}/feedback`,
        { event_type: buttonType, note: "" })
      onFeedbackGiven(response.data)
    catch:
      setError("Failed to update. Try again.")
    finally:
      setLoadingType(null)

  While loading: all three buttons disabled, clicked button shows spinner
  On error: red text error message below buttons (auto-hide after 3 seconds)
  After success: onFeedbackGiven is called (parent re-fetches data)
```

**Push:**
```bash
git add frontend/src/components/dashboard/ PROGRESS_TRACKER.md
git commit -m "feat(M4-S3): SkillMap, NextActions, FeedbackButtons with loading states"
git push origin main
```

---

### M4 — Step 4: Wire feedback loop + dashboard refresh

**Prompt:**
```
In DashboardPage.jsx, complete the feedback loop:

1. Extract the data fetch into a function called fetchDashboardData() so it can
   be called again after feedback:
   const fetchDashboardData = async () => {
     setLoading(true)
     // ... same Supabase fetch as before ...
     setLoading(false)
   }
   useEffect(() => { fetchDashboardData() }, [])

2. Create a handleFeedback function:
   const handleFeedback = async (response) => {
     if (response.path_updated) {
       setToastMessage("✨ Path updated based on your feedback!")
       setTimeout(() => setToastMessage(null), 3000)
     }
     await fetchDashboardData()  // re-fetch everything
   }

3. Pass onRefresh={handleFeedback} to <NextActions>

4. Add a toast notification div (fixed top-center):
   {toastMessage && (
     <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50
       bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce">
       {toastMessage}
     </div>
   )}

5. In src/components/roadmap/ResourceItem.jsx, replace the visual checkbox
   with a real FeedbackButtons component:
   - Import FeedbackButtons from '../dashboard/FeedbackButtons'
   - Add a prop: onRefresh (function) that the ResourceItem passes to FeedbackButtons
   - In RoadmapPage.jsx, pass onRefresh={() => refetchPath()} to RoadmapTimeline
     and down through MilestoneCard to ResourceItem
   - refetchPath should re-call GET /api/paths/{pathId} and update state
```

**Push:**
```bash
git add frontend/src/ PROGRESS_TRACKER.md
git commit -m "feat(M4-S4): feedback loop wired, dashboard auto-refreshes, toast notification"
git push origin main
```

---

### M4 — Step 5: AI Assistant Chat

**Wait for:** M1-S6 push (POST /api/assistant/ask live)

```bash
git pull origin main
```

**Prompt:**
```
Build the full AI assistant chat in frontend/src/components/assistant/

AssistantChat.jsx:
  - Props: pathId (string)
  - State: isOpen (bool, starts false), messages (array of {role,text}), inputText, isTyping

  Floating button (when isOpen is false):
    Fixed bottom-right: fixed bottom-6 right-6
    Blue circle button, 56px diameter, with 💬 emoji or chat icon
    onClick: setIsOpen(true)
    If messages is empty and opening for first time, add welcome message:
    {role:"assistant", text:"Hi! Ask me anything about your learning path —
      like why a course is here, or what to study first."}

  Chat panel (when isOpen is true):
    Fixed bottom-right: fixed bottom-6 right-6 w-80 h-96
    White background, rounded-2xl, shadow-2xl, flex column layout
    Header: "🤖 AI Learning Assistant" (left) + X button (right) → setIsOpen(false)
    Messages area: scrollable flex-1 overflow-y-auto p-3, gap-2 between bubbles
    Input area: fixed at bottom, flex row, input + send button

  Message handling:
    const sendMessage = async () => {
      if (!inputText.trim()) return
      const question = inputText.trim()
      setInputText("")
      setMessages(prev => [...prev, {role:"user", text:question}])
      setIsTyping(true)
      try:
        const res = await apiClient.post("/api/assistant/ask",
          {question, path_id: pathId})
        setMessages(prev => [...prev, {role:"assistant", text:res.data.answer}])
      catch:
        setMessages(prev => [...prev,
          {role:"assistant", text:"Sorry, I couldn't answer that. Please try again."}])
      finally: setIsTyping(false)
    }
    Send on Enter key (but Shift+Enter = newline), or click send button.
    Auto-scroll messages to bottom after each new message (useRef + scrollIntoView).

  Typing indicator: when isTyping is true, show an animated "..." bubble on the left.

MessageBubble.jsx:
  - Props: role ("user" | "assistant"), text
  - User messages: right-aligned, bg-indigo-600 text-white, rounded-2xl rounded-br-sm
  - Assistant messages: left-aligned, bg-gray-100 text-gray-800, rounded-2xl rounded-bl-sm
  - Max width: max-w-[85%], padding: px-4 py-2, text-sm
```

**Push:**
```bash
git add frontend/src/components/assistant/ PROGRESS_TRACKER.md
git commit -m "feat(M4-S5): AI assistant chat panel, floating button, typing indicator"
git push origin main
```

---

### M4 — Step 6: Polish pass

**Prompt:**
```
Do a final polish pass on the entire frontend. Fix all of these:

1. LOADING SKELETONS: On DashboardPage and RoadmapPage, while data loads show
   a skeleton loader. Create src/components/ui/SkeletonBlock.jsx:
   export default function SkeletonBlock({className=""}) {
     return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
   }
   Use it: 3 skeleton blocks of varying width/height in place of actual content.

2. ERROR CARD: Create src/components/ui/ErrorCard.jsx:
   Props: message (string), onRetry (function optional)
   Red-bordered card with an error icon (⚠️), the message, and an optional
   "Try again" button that calls onRetry.
   Use this on DashboardPage and RoadmapPage when API calls fail.

3. EMPTY STATE on Dashboard: White card, centered, with a 🗺️ large emoji,
   "No learning path yet" heading, and a "Generate my first path →" button.

4. NAVIGATION BAR: Create src/components/ui/NavBar.jsx and use it on all
   three protected pages (/onboarding, /roadmap, /dashboard):
   - Left: "🧠 PathAI" text (font-bold, indigo)
   - Right: "Sign Out" button (small, gray) that calls signOut() from useAuth
   Fixed at top, white background, subtle shadow.

5. RESPONSIVE: Ensure all pages work at 375px wide:
   - Tailwind: sm: prefixes where needed
   - Assistant panel: full width on mobile (w-full instead of w-80)
   - Cards: full width on mobile

6. CONSOLE CLEAN: Run the app and fix any red console errors.

7. PAGE TITLE: In frontend/index.html, change <title> to "PathAI — Your Career Learning Path"
```

**Push:**
```bash
git add frontend/ PROGRESS_TRACKER.md
git commit -m "feat(M4-S6): polish - skeletons, error cards, empty states, nav bar, mobile responsive"
git push origin main
```
> 📢 **ANNOUNCE:** "M4-S6 done — frontend fully complete. Member 5, run the integration checklist."

---

## Member 5 — Data & DevOps Lead

**You own:** GitHub repo creation, Supabase setup, data/schema.sql, courses CSV, deploy, packaging
**You also:** verify every module gate and update PROGRESS_TRACKER.md after verification

---

### M5 — Step 1: Create GitHub repo + apply Supabase schema

**This is the VERY FIRST thing that happens — do this before anyone else starts:**

```bash
# 1. Go to github.com → New Repository
#    Name: career-path-recommender
#    Visibility: Public
#    Initialize: No (don't add README yet)
#    Click Create

# 2. Add all 5 members as collaborators:
#    Settings → Collaborators → Add people → (add each member's GitHub username)

# 3. Clone and create initial files:
git clone https://github.com/YOUR_ORG/career-path-recommender.git
cd career-path-recommender

# Create initial files
touch README.md PROGRESS_TRACKER.md .gitignore

# Copy the schema SQL from §13 of MASTER_README_part1.md into:
mkdir data docs
# data/schema.sql

# Initial .gitignore content:
cat > .gitignore << 'EOF'
__pycache__/
*.pyc
.env
venv/
.DS_Store
node_modules/
dist/
*.egg-info/
.pytest_cache/
*.db
EOF

git add .
git commit -m "init: repo setup, schema.sql, gitignore"
git push origin main
```

**Create Supabase project:**
```
1. Go to supabase.com → Sign in → New Project
2. Name: career-path-recommender
3. Database Password: SAVE THIS — you'll need it
4. Region: Singapore (ap-southeast-1) — closest for India
5. Wait 2 minutes for project to provision

6. Supabase Dashboard → SQL Editor → New Query
   Paste the ENTIRE SQL from §13 of Part 1 of this README
   Click "RUN"
   Expected: No errors, all commands succeed

7. Verify: Table Editor should show 5 tables:
   profiles, courses, learning_paths, path_steps, feedback_events

8. Get keys from Settings → API:
   - Project URL (SUPABASE_URL)
   - anon / public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY)
   From Settings → API → JWT Settings:
   - JWT Secret (SUPABASE_JWT_SECRET)
```

**Share keys securely** (use a private Notion page or shared password manager — not group chat):

**Update PROGRESS_TRACKER.md and push:**
```bash
# Edit PROGRESS_TRACKER.md: check off Module 0 gate
git add PROGRESS_TRACKER.md
git commit -m "feat(M5-S1): Supabase schema applied, all 5 tables live"
git push origin main
```
> 📢 **ANNOUNCE TO ALL:** "Repo is live: github.com/YOUR_ORG/career-path-recommender
> Supabase is up, all 5 tables exist. Keys shared at [secure location].
> Everyone clone and start your Step 1 now."

---

### M5 — Step 2: Verify Module gates (your ongoing job)

After each module gate, test it yourself and check it off:

**MODULE 1 gate test (after M1-S2):**
```bash
git pull origin main
cd backend && source venv/bin/activate

# Test health
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"1.0.0"}

# Test auth: no token
curl http://localhost:8000/api/profile -X POST \
  -H "Content-Type: application/json" -d '{"goal_text":"test"}'
# Expected: 401 or 403

echo "MODULE 1 ✅" && git add PROGRESS_TRACKER.md && \
  git commit -m "ops(M5): MODULE 1 gate verified" && git push origin main
```

**MODULE 2 gate test (after M2-S3):**
```bash
git pull origin main
cd backend && source venv/bin/activate

# Check Supabase: Table Editor → courses → should show 80 rows
python data/seed_courses.py --verify
# Expected: 5 relevant courses printed with similarity scores

echo "MODULE 2 ✅" && git add PROGRESS_TRACKER.md && \
  git commit -m "ops(M5): MODULE 2 gate verified" && git push origin main
```

**MODULE 4 gate test (after M3-S2):**
```bash
cd frontend && npm run dev
# Open http://localhost:5173
# Sign up with a new email → should redirect to /onboarding
# Reload /dashboard without signing in → should redirect to /

echo "MODULE 4 ✅"
```

---

### M5 — Step 3: Deploy backend to Render

**Wait for:** Module 5 gate (M1-S4 — path generation working)

```
1. Go to render.com → Sign in → New → Web Service

2. Connect GitHub → find career-path-recommender repo → Connect

3. Configure:
   Name: career-path-recommender-api
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT

4. Environment Variables — add ALL of these:
   SUPABASE_URL          = (from your Supabase project)
   SUPABASE_ANON_KEY     = (from Supabase)
   SUPABASE_SERVICE_ROLE_KEY = (from Supabase)
   SUPABASE_JWT_SECRET   = (from Supabase JWT settings)
   GROQ_API_KEY          = (from console.groq.com)

5. Click Create Web Service
   Wait 3-5 minutes for first deploy

6. Test your Render URL:
   curl https://your-app-name.onrender.com/health
   Expected: {"status":"ok","version":"1.0.0"}
```

**Save the Render URL**, share with team. Member 3 and 4 need it for their VITE_API_URL.

---

### M5 — Step 4: Deploy frontend to Vercel

**Wait for:** Module 7 gate (M4-S4 — dashboard + feedback done)

```
1. Go to vercel.com → Add New Project → Import Git Repository
   Find career-path-recommender → Import

2. Configure:
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist

3. Environment Variables — add these:
   VITE_SUPABASE_URL     = (your Supabase URL)
   VITE_SUPABASE_ANON_KEY = (your Supabase anon key)
   VITE_API_URL          = https://your-render-backend-url.onrender.com

4. Click Deploy — wait 2 minutes

5. Test: open your Vercel URL in a fresh incognito window
   Should show the PathAI landing page

6. Set Supabase Auth redirect URL:
   Supabase Dashboard → Authentication → URL Configuration
   Site URL: https://your-app.vercel.app
   Redirect URLs: https://your-app.vercel.app/**
   Click Save
```

---

### M5 — Step 5: Full integration test checklist

**Run this on the DEPLOYED Vercel URL from an incognito window:**

```bash
# Print and check off each item
[ ] 1. Landing page loads with gradient background and PathAI title
[ ] 2. Sign Up with new email → redirected to /onboarding
[ ] 3. Type goal: "I'm a marketing manager wanting to learn data analysis with Python"
[ ] 4. Click send → extracted profile shown with target_role + interests
[ ] 5. Click "Generate My Learning Path" → generating loader shows 4 stages
[ ] 6. Roadmap appears with at least 3 milestone cards and real course names
[ ] 7. Click "Why this?" on any course → explanation panel slides in with specific text
[ ] 8. Navigate to /dashboard → progress bar shows 0%, next 3 steps visible
[ ] 9. Click "Mark Done" on first step → page refreshes, progress bar updates
[ ] 10. Click "Too Easy" on second step → toast "Path updated" appears, remaining steps change
[ ] 11. Open AI Assistant (bottom-right button) → welcome message shows
[ ] 12. Ask "Why is the first course in my path?" → answer mentions the course name and goal
[ ] 13. Sign out → back to landing page
[ ] 14. Sign in again → dashboard shows saved progress from step 9

# For each failure: create a GitHub Issue with member name and "bug" label
```

---

### M5 — Step 6: Final submission packaging

```bash
git pull origin main

# 1. Update MASTER_README_part1.md with real URLs:
#    Replace "your-vercel-url.vercel.app" with actual Vercel URL
#    Replace "your-render-backend-url.onrender.com" with actual Render URL

# 2. Ensure PROGRESS_TRACKER.md has all boxes checked

# 3. Create submission ZIP (from repo root):
cd ..
zip -r career-path-recommender-submission.zip career-path-recommender/ \
  --exclude "*/node_modules/*" \
  --exclude "*/.git/*" \
  --exclude "*/venv/*" \
  --exclude "*/__pycache__/*" \
  --exclude "*/.env" \
  --exclude "*.pyc" \
  --exclude "*/dist/*"

# Verify ZIP size (should be under 10MB)
ls -lh career-path-recommender-submission.zip

# 4. Record demo video following this script (3-5 minutes):
#    0:00-0:30  Show deployed URL, landing page
#    0:30-1:20  Sign up, type: "I'm a junior software engineer who wants
#               to become a data scientist. I know Python basics. 12 hrs/week."
#    1:20-1:50  Show extracted profile, click Generate
#    1:50-2:30  Walk through roadmap — 3 milestones, open one "Why this?" drawer
#    2:30-3:00  Navigate to dashboard — show progress ring, skill tags, next steps
#    3:00-3:30  Click "Too Easy" — show toast + path updating
#    3:30-4:20  Ask AI assistant: "Why is Python Basics first in my path?"
#    4:20-5:00  Show architecture diagram from README — name the 5 AI/ML techniques:
#               1. Structured profile extraction (Groq LLM + Pydantic)
#               2. Embedding-based retrieval (all-MiniLM-L6-v2 + pgvector)
#               3. Constrained path sequencing (LLM with prerequisite constraints)
#               4. Grounded explanation generation (per-step, anchored to profile)
#               5. Feedback-triggered adaptive re-ranking
```

---

## Submission Deliverables Checklist

```
[ ] 1. Source Code ZIP
       File: career-path-recommender-submission.zip
       Excludes: node_modules, venv, .env, __pycache__, .git, dist
       Includes: all source, .env.example files, README, schema.sql

[ ] 2. GitHub Repository
       URL: https://github.com/YOUR_ORG/career-path-recommender
       Public: YES
       Commit history: shows real commits from all 5 members over 2 days

[ ] 3. Solution Documentation (PDF or PPT)
       Cover: Problem understanding, architecture diagram (from this README),
       5 AI/ML techniques (named above), key workflows (onboarding flow,
       feedback loop), challenges faced (cold starts, JSON parse retries, etc.)

[ ] 4. Demo Video (3-5 minutes)
       Follow the script in M5-S6 above
       Show the deployed URL, not localhost

[ ] 5. Deployed Application URL
       Frontend: https://your-app.vercel.app
       Backend: https://your-api.onrender.com/health
```

---

*End of MASTER README Part 2*
*Part 1 covers: What we build, team roles, tech stack, all UML diagrams, folder structure, DB schema, API contract, module build order*
