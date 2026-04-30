from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from bson import ObjectId

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import DEFAULT_TASKS, ATTRIBUTES, serialize
from app.schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Database = Depends(get_db)):
    if db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.users.find_one({"username": payload.username}):
        raise HTTPException(status_code=400, detail="Username already taken")

    oid = ObjectId()
    user_id = str(oid)
    now = datetime.now(timezone.utc)

    user_doc = {
        "_id": oid,
        "_id_str": user_id,
        "email": payload.email,
        "username": payload.username,
        "hashed_password": hash_password(payload.password),
        "created_at": now,
        "is_active": True,
    }
    db.users.insert_one(user_doc)

    # Bootstrap attributes
    db.user_attributes.insert_many([
        {"user_id": user_id, "attribute": attr, "total_xp": 0}
        for attr in ATTRIBUTES
    ])

    # Bootstrap streak
    db.streaks.insert_one({
        "user_id": user_id,
        "current_streak": 0,
        "longest_streak": 0,
        "last_logged_date": None,
    })

    # Seed default tasks
    db.tasks.insert_many([
        {
            "user_id": user_id,
            "is_default": True,
            "is_active": True,
            "description": None,
            "created_at": now,
            **t,
        }
        for t in DEFAULT_TASKS
    ])

    token = create_access_token({"sub": user_id})
    user_out = UserOut(id=user_id, email=payload.email, username=payload.username, created_at=now)
    return Token(access_token=token, token_type="bearer", user=user_out)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Database = Depends(get_db)):
    user = db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    s = serialize(user)
    token = create_access_token({"sub": s["id"]})
    user_out = UserOut(**{k: s[k] for k in ("id", "email", "username", "created_at")})
    return Token(access_token=token, token_type="bearer", user=user_out)


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return UserOut(**{k: current_user[k] for k in ("id", "email", "username", "created_at")})
