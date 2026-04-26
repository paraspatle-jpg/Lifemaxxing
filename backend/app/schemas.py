from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models import AttributeType


# Auth
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# Tasks
class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    attribute: AttributeType
    xp_reward: int = 10


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    attribute: Optional[AttributeType] = None
    xp_reward: Optional[int] = None
    is_active: Optional[bool] = None


class TaskOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    attribute: AttributeType
    xp_reward: int
    is_active: bool
    is_default: bool

    model_config = {"from_attributes": True}


# Logs
class LogTaskRequest(BaseModel):
    task_id: int
    logged_date: Optional[date] = None
    note: Optional[str] = None


class TaskLogOut(BaseModel):
    id: int
    task_id: int
    task_name: str
    attribute: AttributeType
    xp_earned: int
    logged_date: date
    note: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# Dashboard / Stats
class AttributeProgress(BaseModel):
    attribute: AttributeType
    level: int
    total_xp: int
    xp_in_level: int
    xp_to_next_level: int
    percent_to_next: float
    title: str


class DashboardOut(BaseModel):
    user: UserOut
    attributes: list[AttributeProgress]
    current_streak: int
    longest_streak: int
    today_logs: list[TaskLogOut]
    today_xp: int


class WeeklySummary(BaseModel):
    week_start: date
    total_xp: int
    xp_by_attribute: dict[str, int]
    tasks_completed: int
    logs: list[TaskLogOut]
