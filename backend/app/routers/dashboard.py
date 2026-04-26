from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Streak, TaskLog, User, UserAttribute
from app.schemas import AttributeProgress, DashboardOut, TaskLogOut, WeeklySummary
from app.utils.xp import xp_progress
from app.routers.logs import _to_log_out

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attributes = db.query(UserAttribute).filter(UserAttribute.user_id == current_user.id).all()
    attr_progress = []
    for a in attributes:
        p = xp_progress(a.total_xp)
        attr_progress.append(AttributeProgress(attribute=a.attribute, **p))

    streak = db.query(Streak).filter(Streak.user_id == current_user.id).first()
    today = date.today()
    today_logs = (
        db.query(TaskLog)
        .filter(TaskLog.user_id == current_user.id, TaskLog.logged_date == today)
        .order_by(TaskLog.created_at.desc())
        .all()
    )

    return DashboardOut(
        user=current_user,
        attributes=attr_progress,
        current_streak=streak.current_streak if streak else 0,
        longest_streak=streak.longest_streak if streak else 0,
        today_logs=[_to_log_out(l) for l in today_logs],
        today_xp=sum(l.xp_earned for l in today_logs),
    )


@router.get("/weekly", response_model=WeeklySummary)
def get_weekly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    logs = (
        db.query(TaskLog)
        .filter(TaskLog.user_id == current_user.id, TaskLog.logged_date >= week_start)
        .order_by(TaskLog.logged_date.desc())
        .all()
    )

    xp_by_attr: dict[str, int] = {}
    for log in logs:
        key = log.task.attribute.value
        xp_by_attr[key] = xp_by_attr.get(key, 0) + log.xp_earned

    return WeeklySummary(
        week_start=week_start,
        total_xp=sum(l.xp_earned for l in logs),
        xp_by_attribute=xp_by_attr,
        tasks_completed=len(logs),
        logs=[_to_log_out(l) for l in logs],
    )


@router.get("/heatmap")
def get_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily XP totals for the last 365 days, formatted for a contribution heatmap."""
    from sqlalchemy import func

    cutoff = date.today() - timedelta(days=364)
    rows = (
        db.query(
            TaskLog.logged_date,
            func.sum(TaskLog.xp_earned).label("xp"),
            func.count(TaskLog.id).label("count"),
        )
        .filter(TaskLog.user_id == current_user.id, TaskLog.logged_date >= cutoff)
        .group_by(TaskLog.logged_date)
        .all()
    )
    return [{"date": str(r.logged_date), "xp": r.xp, "count": r.count} for r in rows]


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Extended stats: all-time totals, monthly breakdown."""
    from sqlalchemy import extract, func

    monthly = (
        db.query(
            extract("year", TaskLog.logged_date).label("year"),
            extract("month", TaskLog.logged_date).label("month"),
            func.sum(TaskLog.xp_earned).label("total_xp"),
            func.count(TaskLog.id).label("tasks_done"),
        )
        .filter(TaskLog.user_id == current_user.id)
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )

    attributes = db.query(UserAttribute).filter(UserAttribute.user_id == current_user.id).all()
    streak = db.query(Streak).filter(Streak.user_id == current_user.id).first()

    return {
        "total_xp": sum(a.total_xp for a in attributes),
        "attributes": [
            {**xp_progress(a.total_xp), "attribute": a.attribute}
            for a in attributes
        ],
        "streak": {
            "current": streak.current_streak if streak else 0,
            "longest": streak.longest_streak if streak else 0,
            "last_logged": streak.last_logged_date if streak else None,
        },
        "monthly": [
            {
                "year": int(m.year),
                "month": int(m.month),
                "total_xp": m.total_xp,
                "tasks_done": m.tasks_done,
            }
            for m in monthly
        ],
    }
