"""
MongoDB document helpers.

Collections:
  users           — {email, username, hashed_password, created_at, is_active}
  tasks           — {user_id, name, description, attribute, xp_reward, is_active, is_default, created_at}
  task_logs       — {user_id, task_id, task_name, attribute, logged_date, xp_earned, note, created_at}
  user_attributes — {user_id, attribute, total_xp}
  streaks         — {user_id, current_streak, longest_streak, last_logged_date}

All _id fields are MongoDB ObjectId. user_id / task_id cross-references are stored
as plain strings (str(ObjectId)) for simple equality filtering.
"""

from datetime import datetime, date
from bson import ObjectId


ATTRIBUTES = ["creativity", "physicality", "mentality", "social"]


def new_id() -> str:
    return str(ObjectId())


def serialize(doc: dict) -> dict:
    """Convert a raw MongoDB document to a JSON-serialisable dict."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, date):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


DEFAULT_TASKS = [
    {"name": "Gym session",       "attribute": "physicality", "xp_reward": 10},
    {"name": "Drink 3L water",    "attribute": "physicality", "xp_reward": 5},
    {"name": "Hit protein goal",  "attribute": "physicality", "xp_reward": 10},
    {"name": "Morning run",       "attribute": "physicality", "xp_reward": 10},
    {"name": "Guitar practice",   "attribute": "creativity",  "xp_reward": 10},
    {"name": "Explore new tech",  "attribute": "creativity",  "xp_reward": 15},
    {"name": "Draw or sketch",    "attribute": "creativity",  "xp_reward": 10},
    {"name": "Reading (30+ min)", "attribute": "mentality",   "xp_reward": 10},
    {"name": "Journaling",        "attribute": "mentality",   "xp_reward": 5},
    {"name": "Meditate",          "attribute": "mentality",   "xp_reward": 10},
    {"name": "Study / deep work", "attribute": "mentality",   "xp_reward": 15},
    {"name": "Talk to a stranger","attribute": "social",      "xp_reward": 15},
    {"name": "Call a friend",     "attribute": "social",      "xp_reward": 10},
    {"name": "Attend social event","attribute": "social",     "xp_reward": 20},
]
