from datetime import date, datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, String, Text, func
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class AttributeType(str, enum.Enum):
    creativity = "creativity"
    physicality = "physicality"
    mentality = "mentality"
    social = "social"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)

    tasks = relationship("Task", back_populates="owner")
    task_logs = relationship("TaskLog", back_populates="user")
    attributes = relationship("UserAttribute", back_populates="user")
    streaks = relationship("Streak", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    attribute = Column(Enum(AttributeType), nullable=False)
    xp_reward = Column(Integer, nullable=False, default=10)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="tasks")
    logs = relationship("TaskLog", back_populates="task")


class TaskLog(Base):
    __tablename__ = "task_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    logged_date = Column(Date, nullable=False, default=date.today)
    xp_earned = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="task_logs")
    task = relationship("Task", back_populates="logs")


class UserAttribute(Base):
    __tablename__ = "user_attributes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    attribute = Column(Enum(AttributeType), nullable=False)
    total_xp = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="attributes")


class Streak(Base):
    __tablename__ = "streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_logged_date = Column(Date, nullable=True)

    user = relationship("User", back_populates="streaks")
