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
        "match_count": n,
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
    assert len(results) > 0, "Should return results - check that courses are seeded"
    print("OK - retriever works")
