from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from datetime import date, timedelta

from app.auth import get_current_user
from app.database import get_db
from app.models import TaskLog, User, UserAttribute, Streak
from app.utils.xp import level_from_xp, get_title, xp_progress

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            User.id,
            User.username,
            func.coalesce(func.sum(UserAttribute.total_xp), 0).label("total_xp"),
        )
        .join(UserAttribute, UserAttribute.user_id == User.id, isouter=True)
        .filter(User.is_active == True)
        .group_by(User.id, User.username)
        .order_by(func.coalesce(func.sum(UserAttribute.total_xp), 0).desc())
        .limit(50)
        .all()
    )

    # Fetch streaks in one query
    user_ids = [r.id for r in rows]
    streaks = {
        s.user_id: s.current_streak
        for s in db.query(Streak).filter(Streak.user_id.in_(user_ids)).all()
    }

    return [
        {
            "rank": i + 1,
            "user_id": r.id,
            "username": r.username,
            "total_xp": r.total_xp,
            "level": level_from_xp(r.total_xp),
            "title": get_title(level_from_xp(r.total_xp)),
            "streak": streaks.get(r.id, 0),
            "is_you": r.id == current_user.id,
        }
        for i, r in enumerate(rows)
    ]


@router.get("/user/{user_id}")
def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Public read-only stats for any user."""
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    attributes = db.query(UserAttribute).filter(UserAttribute.user_id == user_id).all()
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()

    total_xp = sum(a.total_xp for a in attributes)
    attr_data = [
        {"attribute": a.attribute, **xp_progress(a.total_xp)}
        for a in attributes
    ]

    # Global rank
    rank_row = (
        db.query(func.count(User.id))
        .join(UserAttribute, UserAttribute.user_id == User.id, isouter=True)
        .filter(User.is_active == True)
        .group_by(User.id)
        .having(func.coalesce(func.sum(UserAttribute.total_xp), 0) > total_xp)
        .count()
    )
    rank = rank_row + 1

    return {
        "user_id": user.id,
        "username": user.username,
        "member_since": user.created_at.date().isoformat(),
        "rank": rank,
        "total_xp": total_xp,
        "level": level_from_xp(total_xp),
        "title": get_title(level_from_xp(total_xp)),
        "streak": {
            "current": streak.current_streak if streak else 0,
            "longest": streak.longest_streak if streak else 0,
        },
        "attributes": attr_data,
        "is_you": user.id == current_user.id,
    }


@router.get("/user/{user_id}/activity")
def get_user_activity(
    user_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Public activity feed: recent task logs for any user."""
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    since = date.today() - timedelta(days=max(1, min(days, 30)))
    logs = (
        db.query(TaskLog)
        .filter(TaskLog.user_id == user_id, TaskLog.logged_date >= since)
        .order_by(TaskLog.logged_date.desc(), TaskLog.created_at.desc())
        .all()
    )

    # Group by date
    from collections import defaultdict
    grouped = defaultdict(list)
    for log in logs:
        grouped[log.logged_date.isoformat()].append({
            "task_name": log.task.name,
            "attribute": log.task.attribute.value,
            "xp_earned": log.xp_earned,
        })

    return {
        "username": user.username,
        "days": [
            {"date": d, "logs": grouped[d], "total_xp": sum(l["xp_earned"] for l in grouped[d])}
            for d in sorted(grouped.keys(), reverse=True)
        ],
    }
