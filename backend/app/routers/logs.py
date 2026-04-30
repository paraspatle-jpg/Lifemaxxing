from datetime import date, datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.auth import get_current_user
from app.database import get_db
from app.models import serialize
from app.schemas import LogTaskRequest, TaskLogOut
from app.utils.xp import streak_bonus_multiplier

router = APIRouter(prefix="/logs", tags=["logs"])


def _log_out(doc: dict) -> TaskLogOut:
    s = serialize(doc)
    if isinstance(s.get("logged_date"), str):
        s["logged_date"] = date.fromisoformat(s["logged_date"])
    return TaskLogOut(**s)


def _update_streak(db: Database, user_id: str, logged_date: date):
    streak = db.streaks.find_one({"user_id": user_id})
    if not streak:
        db.streaks.insert_one({"user_id": user_id, "current_streak": 1, "longest_streak": 1, "last_logged_date": logged_date.isoformat()})
        return

    last = streak.get("last_logged_date")
    last_date = date.fromisoformat(last) if isinstance(last, str) else last

    if last_date is None:
        new_streak = 1
    elif last_date == logged_date:
        return  # already logged today
    elif last_date == logged_date - timedelta(days=1):
        new_streak = streak["current_streak"] + 1
    else:
        new_streak = 1

    longest = max(streak["longest_streak"], new_streak)
    db.streaks.update_one(
        {"user_id": user_id},
        {"$set": {"current_streak": new_streak, "longest_streak": longest, "last_logged_date": logged_date.isoformat()}},
    )


@router.post("", response_model=TaskLogOut, status_code=201)
def log_task(
    payload: LogTaskRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    task = db.tasks.find_one({"_id": ObjectId(payload.task_id), "user_id": user_id, "is_active": True})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logged_date = payload.logged_date or date.today()
    streak = db.streaks.find_one({"user_id": user_id})
    current_streak = streak["current_streak"] if streak else 0
    xp_earned = round(task["xp_reward"] * streak_bonus_multiplier(current_streak))

    now = datetime.now(timezone.utc)
    log_doc = {
        "user_id": user_id,
        "task_id": payload.task_id,
        "task_name": task["name"],
        "attribute": task["attribute"],
        "logged_date": logged_date.isoformat(),
        "xp_earned": xp_earned,
        "note": payload.note,
        "created_at": now,
    }
    result = db.task_logs.insert_one(log_doc)
    log_doc["_id"] = result.inserted_id

    # Update attribute XP
    db.user_attributes.update_one(
        {"user_id": user_id, "attribute": task["attribute"]},
        {"$inc": {"total_xp": xp_earned}},
    )

    _update_streak(db, user_id, logged_date)
    return _log_out(log_doc)


@router.delete("/{log_id}", status_code=204)
def delete_log(
    log_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    log = db.task_logs.find_one({"_id": ObjectId(log_id), "user_id": user_id})
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    db.user_attributes.update_one(
        {"user_id": user_id, "attribute": log["attribute"]},
        {"$inc": {"total_xp": -log["xp_earned"]}},
    )
    # Clamp to 0
    db.user_attributes.update_one(
        {"user_id": user_id, "attribute": log["attribute"], "total_xp": {"$lt": 0}},
        {"$set": {"total_xp": 0}},
    )
    db.task_logs.delete_one({"_id": ObjectId(log_id)})


@router.get("", response_model=list[TaskLogOut])
def get_logs(
    start_date: date = None,
    end_date: date = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    filt = {"user_id": current_user["id"]}
    if start_date:
        filt.setdefault("logged_date", {})["$gte"] = start_date.isoformat()
    if end_date:
        filt.setdefault("logged_date", {})["$lte"] = end_date.isoformat()
    docs = list(db.task_logs.find(filt).sort([("logged_date", -1), ("created_at", -1)]))
    return [_log_out(d) for d in docs]
