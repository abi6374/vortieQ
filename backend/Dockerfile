# Deploys automatically to the career-path-backend EC2 instance (13.206.51.130)
# via .github/workflows/deploy-backend.yml on every push to main under backend/**.
# EBS root volume resized 8GB -> 16GB (image tarball is ~1.5GB and the 8GB
# default didn't leave enough headroom for `docker load` to unpack it).
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface

COPY requirements.txt .

# Install CPU-only torch first. The default PyPI wheel bundles CUDA and is
# 3-4x larger (and heavier at runtime) than needed on a CPU-only EC2 box.
# pip will then see torch already satisfied when requirements.txt pulls it
# in as a transitive dependency of sentence-transformers.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model at BUILD time (not first request) so the
# container starts in seconds and never depends on runtime internet access.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# Retried after a transient Actions queue glitch on run 32985846108
