from sentence_transformers import SentenceTransformer

# Load ONCE at module level — loading takes a few seconds and must not happen
# inside the function (it would make every call slow).
_model = SentenceTransformer("all-MiniLM-L6-v2")


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
    print("OK - embed_text works correctly")
    print(f"   Vector length: {len(vec)}")
    print(f"   Magnitude: {magnitude:.6f}")
    print(f"   First 5 values: {vec[:5]}")
