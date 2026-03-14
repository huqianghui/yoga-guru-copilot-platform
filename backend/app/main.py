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
    from app.routers import auth, users, agents, dashboard
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


register_routers()


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
