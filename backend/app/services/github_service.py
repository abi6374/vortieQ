"""GitHub Profile & Repository Analyzer.

Fetches user repositories, language breakdowns, commit velocity, and topics from GitHub API.
Derives skill levels, calculates confidence scores, detects active years, and categorizes
portfolio project complexity (e.g. beginner script vs. production ML pipeline).
"""

import httpx
import re
from typing import Dict, List, Any, Optional

GITHUB_API_BASE = "https://api.github.com"

# Map common language names and repository topics to normalized skill taxonomies
LANGUAGE_SKILL_MAP = {
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "html": "HTML/CSS",
    "css": "HTML/CSS",
    "jupyter notebook": "Python",
    "c++": "C++",
    "java": "Java",
    "go": "Go",
    "rust": "Rust",
    "sql": "SQL",
    "shell": "Linux/Bash",
}

FRAMEWORK_TOPICS_MAP = {
    "pytorch": "Machine Learning",
    "tensorflow": "Machine Learning",
    "scikit-learn": "Machine Learning",
    "keras": "Machine Learning",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "django": "Django",
    "react": "React",
    "nextjs": "Next.js",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "nlp": "Natural Language Processing",
    "llm": "Large Language Models",
    "rag": "RAG & Vector Search",
    "langchain": "LangChain",
    "transformers": "Transformers",
}


def _classify_project_complexity(repo: Dict[str, Any], languages: Dict[str, int]) -> str:
    """Classifies repository into 'basic', 'intermediate', or 'advanced'."""
    size_kb = repo.get("size", 0)
    stars = repo.get("stargazers_count", 0)
    forks = repo.get("forks_count", 0)
    topics = [t.lower() for t in repo.get("topics", [])]
    name_and_desc = f"{repo.get('name', '')} {repo.get('description', '')}".lower()
    
    # Advanced indicators: ML/Deep Learning frameworks, distributed systems, MLOps, or large codebases
    advanced_keywords = ["transformer", "pytorch", "tensorflow", "fine-tuning", "rag", "docker", "kubernetes", "mlops", "microservice", "distributed"]
    is_advanced_topic = any(kw in topics or kw in name_and_desc for kw in advanced_keywords)
    
    total_loc_approx = sum(languages.values()) // 30  # approx bytes to LOC
    
    if (is_advanced_topic and total_loc_approx > 1000) or size_kb > 5000 or stars >= 5 or forks >= 2:
        return "advanced"
    if total_loc_approx > 500 or len(languages) >= 2 or size_kb > 500:
        return "intermediate"
    return "basic"


async def fetch_github_repos(token: Optional[str] = None, username: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches user repositories from GitHub REST API."""
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{GITHUB_API_BASE}/user/repos?per_page=100&sort=updated" if token else f"{GITHUB_API_BASE}/users/{username}/repos?per_page=100&sort=updated"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            print(f"[github_service] API responded with status {resp.status_code}: {resp.text}", flush=True)
            return []
        except Exception as exc:
            print(f"[github_service] Failed to fetch repos: {exc}", flush=True)
            return []


def analyze_github_repositories(repos: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyzes a list of GitHub repositories and produces skills, confidence, and project depth."""
    if not repos:
        return {
            "topics": [],
            "detected_years_experience": 0,
            "github_projects": [],
            "portfolio_depth": "beginner",
            "top_languages": []
        }

    lang_bytes: Dict[str, int] = {}
    skill_evidence: Dict[str, Dict[str, Any]] = {}
    projects_analyzed = []
    earliest_year = 9999
    current_year = 2026

    for repo in repos:
        if repo.get("fork"):
            continue  # Focus on original repositories
        
        name = repo.get("name", "")
        desc = repo.get("description") or ""
        created_at = repo.get("created_at", "")
        if created_at:
            try:
                yr = int(created_at[:4])
                if yr < earliest_year and yr > 2005:
                    earliest_year = yr
            except ValueError:
                pass
        
        lang = (repo.get("language") or "").lower()
        if lang in LANGUAGE_SKILL_MAP:
            normalized_lang = LANGUAGE_SKILL_MAP[lang]
            lang_bytes[normalized_lang] = lang_bytes.get(normalized_lang, 0) + repo.get("size", 100) * 1024
            
            if normalized_lang not in skill_evidence:
                skill_evidence[normalized_lang] = {"repo_count": 0, "advanced_repos": 0, "names": []}
            skill_evidence[normalized_lang]["repo_count"] += 1
            skill_evidence[normalized_lang]["names"].append(name)
        
        # Check topics & description for framework keywords
        topics = [t.lower() for t in repo.get("topics", [])]
        combined_text = f"{name} {desc} {' '.join(topics)}".lower()
        
        for kw, skill_name in FRAMEWORK_TOPICS_MAP.items():
            if kw in combined_text:
                if skill_name not in skill_evidence:
                    skill_evidence[skill_name] = {"repo_count": 0, "advanced_repos": 0, "names": []}
                skill_evidence[skill_name]["repo_count"] += 1
                if name not in skill_evidence[skill_name]["names"]:
                    skill_evidence[skill_name]["names"].append(name)

        complexity = _classify_project_complexity(repo, {lang: repo.get("size", 100) * 1024})
        if complexity == "advanced":
            if lang in LANGUAGE_SKILL_MAP:
                skill_evidence[LANGUAGE_SKILL_MAP[lang]]["advanced_repos"] += 1
        
        projects_analyzed.append({
            "name": name,
            "description": desc,
            "language": repo.get("language"),
            "complexity": complexity,
            "stars": repo.get("stargazers_count", 0),
            "url": repo.get("html_url", "")
        })

    # Calculate years experience from earliest repo creation
    detected_years = max(1, current_year - earliest_year) if earliest_year < 9999 else 1

    # Formulate structured topics and confidence ratings
    topics_list = []
    for skill_name, data in skill_evidence.items():
        count = data["repo_count"]
        adv_count = data["advanced_repos"]
        
        if adv_count >= 1 or count >= 4:
            suggested_level = "advanced"
            base_confidence = 90
        elif count >= 2:
            suggested_level = "intermediate"
            base_confidence = 78
        else:
            suggested_level = "basic"
            base_confidence = 65

        confidence_pct = min(98, base_confidence + min(count * 2, 8))
        repo_names_sample = ", ".join(data["names"][:3])
        evidence = f"Found in {count} repos ({repo_names_sample}) with {suggested_level} project complexity."

        topics_list.append({
            "name": skill_name,
            "suggested_level": suggested_level,
            "evidence": evidence,
            "confidence_pct": confidence_pct
        })

    # Sort topics by confidence descending
    topics_list.sort(key=lambda x: x["confidence_pct"], reverse=True)

    # Determine overall portfolio depth
    has_advanced = any(p["complexity"] == "advanced" for p in projects_analyzed)
    portfolio_depth = "advanced" if has_advanced else "intermediate" if len(projects_analyzed) >= 2 else "basic"

    # Top languages by size
    top_langs = sorted(lang_bytes.keys(), key=lambda k: lang_bytes[k], reverse=True)[:5]

    return {
        "topics": topics_list,
        "detected_years_experience": detected_years,
        "github_projects": projects_analyzed[:8],
        "portfolio_depth": portfolio_depth,
        "top_languages": top_langs
    }
