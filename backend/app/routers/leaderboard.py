from datetime import date, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.auth import get_current_user
from app.database import get_db
from app.models import serialize
from app.utils.xp import level_from_xp, get_title, xp_progress

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def get_leaderboard(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Sum total_xp per user via aggregation
    pipeline = [
        {"$group": {"_id": "$user_id", "total_xp": {"$sum": "$total_xp"}}},
        {"$sort": {"total_xp": -1}},
        {"$limit": 50},
    ]
    rows = list(db.user_attributes.aggregate(pipeline))
    user_ids = [r["_id"] for r in rows]

    # Fetch usernames
    users = {str(u["_id_str"]): u for u in db.users.find({"_id_str": {"$in": user_ids}})}

    # Fetch streaks
    streaks = {s["user_id"]: s.get("current_streak", 0) for s in db.streaks.find({"user_id": {"$in": user_ids}})}

    result = []
    for i, r in enumerate(rows):
        uid = r["_id"]
        user = users.get(uid)
        if not user:
            continue
        xp = r["total_xp"]
        level = level_from_xp(xp)
        result.append({
            "rank": i + 1,
            "user_id": uid,
            "username": user["username"],
            "total_xp": xp,
            "level": level,
            "title": get_title(level),
            "streak": streaks.get(uid, 0),
            "is_you": uid == current_user["id"],
        })
    return result


@router.get("/user/{user_id}")
def get_user_stats(
    user_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.users.find_one({"_id_str": user_id, "is_active": True})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    attrs = list(db.user_attributes.find({"user_id": user_id}))
    streak = db.streaks.find_one({"user_id": user_id}) or {}
    total_xp = sum(a.get("total_xp", 0) for a in attrs)

    # Compute rank: count users with strictly more total XP
    higher = list(db.user_attributes.aggregate([
        {"$group": {"_id": "$user_id", "total_xp": {"$sum": "$total_xp"}}},
        {"$match": {"total_xp": {"$gt": total_xp}}},
        {"$count": "n"},
    ]))
    rank = (higher[0]["n"] + 1) if higher else 1

    from app.models import ATTRIBUTES
    attr_data = []
    for a in ATTRIBUTES:
        doc = next((x for x in attrs if x["attribute"] == a), {"total_xp": 0})
        attr_data.append({"attribute": a, **xp_progress(doc.get("total_xp", 0))})

    return {
        "user_id": user_id,
        "username": user["username"],
        "member_since": user["created_at"].date().isoformat() if hasattr(user.get("created_at"), "date") else str(user.get("created_at", ""))[:10],
        "rank": rank,
        "total_xp": total_xp,
        "level": level_from_xp(total_xp),
        "title": get_title(level_from_xp(total_xp)),
        "streak": {
            "current": streak.get("current_streak", 0),
            "longest": streak.get("longest_streak", 0),
        },
        "attributes": attr_data,
        "is_you": user_id == current_user["id"],
    }


@router.get("/user/{user_id}/activity")
def get_user_activity(
    user_id: str,
    days: int = 7,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.users.find_one({"_id_str": user_id, "is_active": True})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    since = (date.today() - timedelta(days=max(1, min(days, 30)))).isoformat()
    logs = list(db.task_logs.find({"user_id": user_id, "logged_date": {"$gte": since}}).sort([("logged_date", -1), ("created_at", -1)]))

    grouped = defaultdict(list)
    for log in logs:
        grouped[log["logged_date"]].append({
            "task_name": log["task_name"],
            "attribute": log["attribute"],
            "xp_earned": log["xp_earned"],
        })

    return {
        "username": user["username"],
        "days": [
            {"date": d, "logs": grouped[d], "total_xp": sum(l["xp_earned"] for l in grouped[d])}
            for d in sorted(grouped.keys(), reverse=True)
        ],
    }
