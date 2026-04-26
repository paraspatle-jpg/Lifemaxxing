# LifeMaxxing

Personal progress tracking system with Solo Leveling-style gamification. Level up across 4 attributes — Physicality, Mentality, Creativity, and Social Skills — by logging daily tasks.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + SQLAlchemy |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose + bcrypt) |
| Frontend | React 18 + Vite + Tailwind CSS |
| State | TanStack Query v5 |

---

## Running Locally

### Option A: Docker (recommended, zero setup)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### Option B: Manual

**Prerequisites:** PostgreSQL running locally, Python 3.11+, Node 20+

**Backend:**
```bash
cd backend
cp .env.example .env          # edit DATABASE_URL if needed
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The DB tables are auto-created on first backend start.

---

## XP & Level System

| Level → Level+1 | XP Required |
|---|---|
| 1 → 2 | 100 XP |
| 2 → 3 | 200 XP |
| 3 → 4 | 300 XP |
| n → n+1 | n × 100 XP |

**Titles:** Novice (1-5) → Apprentice (6-10) → Adept (11-20) → Expert (21-30) → Master (31-50) → Elite (51+)

**Streak multipliers:**
- 3+ day streak: 1.1× XP
- 7+ day streak: 1.2× XP
- 14+ day streak: 1.3× XP
- 30+ day streak: 1.5× XP

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register + get JWT |
| POST | `/auth/login` | Login + get JWT |
| GET | `/auth/me` | Current user |
| GET | `/tasks` | List tasks (filterable by attribute) |
| POST | `/tasks` | Create custom task |
| PATCH | `/tasks/{id}` | Update task |
| DELETE | `/tasks/{id}` | Soft-delete task |
| POST | `/logs` | Log a completed task |
| GET | `/logs` | Get logs (filterable by date range) |
| DELETE | `/logs/{id}` | Remove log + reverse XP |
| GET | `/dashboard` | Full dashboard data |
| GET | `/dashboard/weekly` | This week summary |
| GET | `/dashboard/stats` | All-time stats + monthly |

Full interactive docs at `/docs` (Swagger UI) when backend is running.

---

## Scaling to Mobile

The backend is fully API-first — no server-side rendering, no session cookies. To add a mobile app:

1. **React Native / Expo** — reuse the same API client logic, rebuild UI with React Native components
2. **Auth** — same JWT flow works; store token in SecureStore instead of localStorage
3. **Push notifications** — add an FCM token field to the User model; send reminders via Firebase when `last_logged_date` is yesterday
4. **Offline support** — cache today's task list in AsyncStorage, queue log submissions when offline

---

## Folder Structure

```
lifemaxxing/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app + CORS
│       ├── models.py        # SQLAlchemy ORM models
│       ├── schemas.py       # Pydantic request/response schemas
│       ├── auth.py          # JWT helpers + dependency
│       ├── config.py        # Settings (env vars)
│       ├── database.py      # DB engine + session
│       ├── routers/
│       │   ├── auth.py      # Signup, login, me
│       │   ├── tasks.py     # CRUD tasks
│       │   ├── logs.py      # Log tasks, undo
│       │   └── dashboard.py # Dashboard + stats
│       └── utils/
│           └── xp.py        # Level formula + streak multipliers
└── frontend/
    └── src/
        ├── App.jsx           # Routes + auth guards
        ├── context/          # Auth context
        ├── api/              # Axios client
        ├── components/       # Reusable UI (AttributeCard, Layout)
        └── pages/
            ├── Dashboard.jsx # Overview + today's XP
            ├── DailyLog.jsx  # Quick task logging (< 60s)
            ├── Tasks.jsx     # Task management
            └── Stats.jsx     # All-time stats + charts
```
