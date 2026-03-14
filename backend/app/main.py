from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables + seed data (idempotent)
    from app.services.startup import ensure_tables, seed_initial_data
    await ensure_tables()
    await seed_initial_data()
    # Register agent adapters
    from app.services.agents.adapters import register_all_adapters
    register_all_adapters()
    yield


app = FastAPI(
    title="Yoga Guru Copilot Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def register_routers():
    """Register routers — called after all router modules exist."""
    from app.routers import auth, users, agents, dashboard, courses, surveys, videos, health, admin
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
    app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
    app.include_router(surveys.router, prefix="/api/surveys", tags=["surveys"])
    app.include_router(videos.router, prefix="/api/videos", tags=["videos"])


register_routers()

# Serve uploaded files (videos, frames)
from pathlib import Path
from fastapi.staticfiles import StaticFiles

_uploads_dir = Path(__file__).parent.parent / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")
