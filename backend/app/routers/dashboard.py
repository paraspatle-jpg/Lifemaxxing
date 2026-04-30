from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.auth import get_current_user
from app.database import get_db
from app.models import ATTRIBUTES, serialize
from app.schemas import AttributeProgress, DashboardOut, TaskLogOut, UserOut
from app.utils.xp import xp_progress

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _log_out(doc: dict) -> TaskLogOut:
    s = serialize(doc)
    if isinstance(s.get("logged_date"), str):
        from datetime import date as d_
        s["logged_date"] = d_.fromisoformat(s["logged_date"])
    return TaskLogOut(**s)


@router.get("", response_model=DashboardOut)
def get_dashboard(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]

    attrs = list(db.user_attributes.find({"user_id": user_id}))
    attr_progress = []
    for a in ATTRIBUTES:
        doc = next((x for x in attrs if x["attribute"] == a), {"total_xp": 0})
        p = xp_progress(doc.get("total_xp", 0))
        attr_progress.append(AttributeProgress(attribute=a, **p))

    streak = db.streaks.find_one({"user_id": user_id}) or {}
    today = date.today().isoformat()
    today_logs = list(db.task_logs.find({"user_id": user_id, "logged_date": today}).sort("created_at", -1))

    return DashboardOut(
        user=UserOut(**{k: current_user[k] for k in ("id", "email", "username", "created_at")}),
        attributes=attr_progress,
        current_streak=streak.get("current_streak", 0),
        longest_streak=streak.get("longest_streak", 0),
        today_logs=[_log_out(l) for l in today_logs],
        today_xp=sum(l["xp_earned"] for l in today_logs),
    )


@router.get("/weekly")
def get_weekly(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()

    logs = list(db.task_logs.find({"user_id": user_id, "logged_date": {"$gte": week_start}}).sort("logged_date", -1))
    xp_by_attr: dict[str, int] = {}
    for log in logs:
        key = log["attribute"]
        xp_by_attr[key] = xp_by_attr.get(key, 0) + log["xp_earned"]

    return {
        "week_start": week_start,
        "total_xp": sum(l["xp_earned"] for l in logs),
        "xp_by_attribute": xp_by_attr,
        "tasks_completed": len(logs),
        "logs": [serialize(l) for l in logs],
    }


@router.get("/heatmap")
def get_heatmap(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    cutoff = (date.today() - timedelta(days=364)).isoformat()

    pipeline = [
        {"$match": {"user_id": user_id, "logged_date": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$logged_date",
            "xp": {"$sum": "$xp_earned"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    return [{"date": r["_id"], "xp": r["xp"], "count": r["count"]} for r in db.task_logs.aggregate(pipeline)]


@router.get("/stats")
def get_stats(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    attrs = list(db.user_attributes.find({"user_id": user_id}))
    streak = db.streaks.find_one({"user_id": user_id}) or {}

    # Monthly breakdown via aggregation
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": {"year": {"$substr": ["$logged_date", 0, 4]}, "month": {"$substr": ["$logged_date", 5, 2]}},
            "total_xp": {"$sum": "$xp_earned"},
            "tasks_done": {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    monthly = [
        {"year": int(r["_id"]["year"]), "month": int(r["_id"]["month"]), "total_xp": r["total_xp"], "tasks_done": r["tasks_done"]}
        for r in db.task_logs.aggregate(pipeline)
    ]

    attr_data = []
    for a in ATTRIBUTES:
        doc = next((x for x in attrs if x["attribute"] == a), {"total_xp": 0})
        attr_data.append({"attribute": a, **xp_progress(doc.get("total_xp", 0))})

    return {
        "total_xp": sum(a.get("total_xp", 0) for a in attrs),
        "attributes": attr_data,
        "streak": {
            "current": streak.get("current_streak", 0),
            "longest": streak.get("longest_streak", 0),
            "last_logged": streak.get("last_logged_date"),
        },
        "monthly": monthly,
    }
