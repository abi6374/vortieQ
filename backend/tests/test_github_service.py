import pytest
from app.services.github_service import analyze_github_repositories, _classify_project_complexity


def test_classify_project_complexity():
    """Verify that projects are properly categorized by complexity."""
    basic_repo = {
        "name": "python-calculator",
        "description": "Simple CLI calculator",
        "size": 50,
        "topics": ["python"],
        "stargazers_count": 0,
    }
    assert _classify_project_complexity(basic_repo, {"python": 1200}) == "basic"

    advanced_repo = {
        "name": "distributed-transformer-rag",
        "description": "Production PyTorch LLM inference pipeline with Docker",
        "size": 12000,
        "topics": ["pytorch", "rag", "docker", "transformer"],
        "stargazers_count": 12,
        "forks_count": 3,
    }
    assert _classify_project_complexity(advanced_repo, {"python": 95000}) == "advanced"


def test_analyze_github_repositories():
    """Verify skill extraction, confidence calculation, and active years from mock repos."""
    mock_repos = [
        {
            "name": "fastapi-microservice",
            "description": "High-throughput API with Docker",
            "language": "Python",
            "size": 4000,
            "topics": ["fastapi", "docker"],
            "created_at": "2023-04-10T12:00:00Z",
            "fork": False,
            "stargazers_count": 4,
        },
        {
            "name": "pytorch-classifier",
            "description": "Deep learning model training pipeline",
            "language": "Python",
            "size": 15000,
            "topics": ["pytorch", "machine learning"],
            "created_at": "2024-01-15T10:00:00Z",
            "fork": False,
            "stargazers_count": 8,
        },
        {
            "name": "portfolio-frontend",
            "description": "React Next.js portfolio website",
            "language": "TypeScript",
            "size": 3000,
            "topics": ["react", "nextjs"],
            "created_at": "2024-06-20T08:00:00Z",
            "fork": False,
            "stargazers_count": 1,
        }
    ]

    analysis = analyze_github_repositories(mock_repos)
    assert len(analysis["topics"]) > 0
    assert analysis["portfolio_depth"] == "advanced"
    assert analysis["detected_years_experience"] >= 2
    assert "Python" in analysis["top_languages"]

    # Check that Python was derived as advanced level with high confidence
    python_topic = next((t for t in analysis["topics"] if t["name"] == "Python"), None)
    assert python_topic is not None
    assert python_topic["suggested_level"] in ("intermediate", "advanced")
    assert python_topic["confidence_pct"] >= 80
