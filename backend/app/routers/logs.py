from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Streak, Task, TaskLog, User, UserAttribute
from app.schemas import LogTaskRequest, TaskLogOut
from app.utils.xp import streak_bonus_multiplier

router = APIRouter(prefix="/logs", tags=["logs"])


def _to_log_out(log: TaskLog) -> TaskLogOut:
    return TaskLogOut(
        id=log.id,
        task_id=log.task_id,
        task_name=log.task.name,
        attribute=log.task.attribute,
        xp_earned=log.xp_earned,
        logged_date=log.logged_date,
        note=log.note,
        created_at=log.created_at,
    )


def _update_streak(db: Session, user_id: int, logged_date: date) -> Streak:
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if not streak:
        streak = Streak(user_id=user_id)
        db.add(streak)

    today = logged_date
    if streak.last_logged_date is None:
        streak.current_streak = 1
    elif streak.last_logged_date == today:
        pass  # already logged today, no streak change
    elif streak.last_logged_date == today - timedelta(days=1):
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_logged_date = today
    return streak


@router.post("", response_model=TaskLogOut, status_code=201)
def log_task(
    payload: LogTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == payload.task_id, Task.user_id == current_user.id).first()
    if not task or not task.is_active:
        raise HTTPException(status_code=404, detail="Task not found")

    logged_date = payload.logged_date or date.today()

    streak = db.query(Streak).filter(Streak.user_id == current_user.id).first()
    current_streak = streak.current_streak if streak else 0
    multiplier = streak_bonus_multiplier(current_streak)
    xp_earned = round(task.xp_reward * multiplier)

    log = TaskLog(
        user_id=current_user.id,
        task_id=task.id,
        logged_date=logged_date,
        xp_earned=xp_earned,
        note=payload.note,
    )
    db.add(log)

    # Update attribute XP
    attr = (
        db.query(UserAttribute)
        .filter(UserAttribute.user_id == current_user.id, UserAttribute.attribute == task.attribute)
        .first()
    )
    if attr:
        attr.total_xp += xp_earned

    _update_streak(db, current_user.id, logged_date)
    db.commit()
    db.refresh(log)
    return _to_log_out(log)


@router.delete("/{log_id}", status_code=204)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(TaskLog).filter(TaskLog.id == log_id, TaskLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    # Reverse the XP
    attr = (
        db.query(UserAttribute)
        .filter(UserAttribute.user_id == current_user.id, UserAttribute.attribute == log.task.attribute)
        .first()
    )
    if attr:
        attr.total_xp = max(0, attr.total_xp - log.xp_earned)

    db.delete(log)
    db.commit()


@router.get("", response_model=list[TaskLogOut])
def get_logs(
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TaskLog).filter(TaskLog.user_id == current_user.id)
    if start_date:
        q = q.filter(TaskLog.logged_date >= start_date)
    if end_date:
        q = q.filter(TaskLog.logged_date <= end_date)
    logs = q.order_by(TaskLog.logged_date.desc(), TaskLog.created_at.desc()).all()
    return [_to_log_out(log) for log in logs]
