from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database

from app.config import settings

_client: MongoClient = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGODB_URL)
    return _client


def get_db() -> Database:
    return get_client()[settings.MONGODB_DB]


def init_db():
    """Create indexes on startup."""
    db = get_db()
    db.users.create_index("email", unique=True)
    db.users.create_index("username", unique=True)
    db.tasks.create_index([("user_id", ASCENDING), ("attribute", ASCENDING)])
    db.task_logs.create_index([("user_id", ASCENDING), ("logged_date", DESCENDING)])
    db.user_attributes.create_index([("user_id", ASCENDING), ("attribute", ASCENDING)])
    db.streaks.create_index("user_id", unique=True)

    # Backfill reminder_message on existing default tasks (added after initial seed).
    from app.models import DEFAULT_TASKS
    for t in DEFAULT_TASKS:
        msg = t.get("reminder_message")
        if not msg:
            continue
        db.tasks.update_many(
            {"is_default": True, "name": t["name"], "reminder_message": {"$in": [None, ""]}},
            {"$set": {"reminder_message": msg}},
        )
        # Also catch docs where the field is entirely missing
        db.tasks.update_many(
            {"is_default": True, "name": t["name"], "reminder_message": {"$exists": False}},
            {"$set": {"reminder_message": msg}},
        )
