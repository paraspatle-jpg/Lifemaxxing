from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# Auth
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# Tasks
class Reminder(BaseModel):
    enabled: bool = False
    time: Optional[str] = None       # "HH:MM", local time
    repeat: str = "daily"            # "daily" | "none"
    message: Optional[str] = None    # null → use reminder_message fallback


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    attribute: str
    xp_reward: int = 10
    reminder: Optional[Reminder] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    attribute: Optional[str] = None
    xp_reward: Optional[int] = None
    is_active: Optional[bool] = None
    reminder: Optional[Reminder] = None


class TaskOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    attribute: str
    xp_reward: int
    is_active: bool
    is_default: bool
    reminder: Optional[Reminder] = None
    reminder_message: Optional[str] = None


# Logs
class LogTaskRequest(BaseModel):
    task_id: str
    logged_date: Optional[date] = None
    note: Optional[str] = None


class TaskLogOut(BaseModel):
    id: str
    task_id: str
    task_name: str
    attribute: str
    xp_earned: int
    logged_date: date
    note: Optional[str]
    created_at: datetime


# Dashboard / Stats
class AttributeProgress(BaseModel):
    attribute: str
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
