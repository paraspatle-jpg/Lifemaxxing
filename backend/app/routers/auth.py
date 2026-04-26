from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import AttributeType, Streak, User, UserAttribute
from app.schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_TASKS = [
    {"name": "Gym session", "attribute": AttributeType.physicality, "xp_reward": 10},
    {"name": "Drink 3L water", "attribute": AttributeType.physicality, "xp_reward": 5},
    {"name": "Hit protein goal", "attribute": AttributeType.physicality, "xp_reward": 10},
    {"name": "Morning run", "attribute": AttributeType.physicality, "xp_reward": 10},
    {"name": "Guitar practice", "attribute": AttributeType.creativity, "xp_reward": 10},
    {"name": "Explore new tech", "attribute": AttributeType.creativity, "xp_reward": 15},
    {"name": "Draw or sketch", "attribute": AttributeType.creativity, "xp_reward": 10},
    {"name": "Reading (30+ min)", "attribute": AttributeType.mentality, "xp_reward": 10},
    {"name": "Journaling", "attribute": AttributeType.mentality, "xp_reward": 5},
    {"name": "Meditate", "attribute": AttributeType.mentality, "xp_reward": 8},
    {"name": "Study / deep work", "attribute": AttributeType.mentality, "xp_reward": 15},
    {"name": "Talk to a stranger", "attribute": AttributeType.social, "xp_reward": 15},
    {"name": "Call a friend", "attribute": AttributeType.social, "xp_reward": 10},
    {"name": "Attend social event", "attribute": AttributeType.social, "xp_reward": 20},
]


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    # Bootstrap attributes
    for attr in AttributeType:
        db.add(UserAttribute(user_id=user.id, attribute=attr, total_xp=0))

    # Bootstrap streak
    db.add(Streak(user_id=user.id))

    # Seed default tasks
    from app.models import Task
    for t in DEFAULT_TASKS:
        db.add(Task(user_id=user.id, is_default=True, **t))

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
