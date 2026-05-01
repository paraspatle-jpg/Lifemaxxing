from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.auth import get_current_user
from app.database import get_db
from app.models import ATTRIBUTES, serialize
from app.schemas import TaskCreate, TaskOut, TaskUpdate
from app.utils.xp import validate_task_xp

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_out(doc: dict) -> TaskOut:
    s = serialize(doc)
    return TaskOut(**s)


@router.get("", response_model=list[TaskOut])
def get_tasks(
    attribute: str = None,
    active_only: bool = True,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    filt = {"user_id": current_user["id"]}
    if active_only:
        filt["is_active"] = True
    if attribute:
        filt["attribute"] = attribute
    docs = list(db.tasks.find(filt).sort([("attribute", 1), ("name", 1)]))
    return [_task_out(d) for d in docs]


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if payload.attribute not in ATTRIBUTES:
        raise HTTPException(status_code=422, detail=f"attribute must be one of {ATTRIBUTES}")
    err = validate_task_xp(payload.xp_reward)
    if err:
        raise HTTPException(status_code=422, detail=err)

    doc = {
        "user_id": current_user["id"],
        "is_default": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        **payload.model_dump(),
    }
    result = db.tasks.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _task_out(doc)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = db.tasks.find_one({"_id": ObjectId(task_id), "user_id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = payload.model_dump(exclude_unset=True)
    if doc.get("is_default") and any(k != "reminder" for k in updates):
        raise HTTPException(status_code=403, detail="Only reminders can be edited on default tasks")
    if payload.xp_reward is not None:
        err = validate_task_xp(payload.xp_reward)
        if err:
            raise HTTPException(status_code=422, detail=err)

    db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": updates})
    doc.update(updates)
    return _task_out(doc)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = db.tasks.find_one({"_id": ObjectId(task_id), "user_id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    if doc.get("is_default"):
        raise HTTPException(status_code=403, detail="Default tasks cannot be deleted")
    db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": {"is_active": False}})
