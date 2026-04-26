from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, dashboard, leaderboard, logs, tasks

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LifeMaxxing API",
    description="Personal progress tracking with gamification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(logs.router)
app.include_router(dashboard.router)
app.include_router(leaderboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
