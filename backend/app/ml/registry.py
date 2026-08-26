from app.ml.recommender import Recommender

_instance = None


def get_recommender() -> Recommender:
    global _instance
    if _instance is None:
        _instance = Recommender()
    return _instance
