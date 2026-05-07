"""
NetSentinel AI — Main Application Entry Point
"""

import logging
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import engine
from app.models.base import Base

# Import routers
from app.routers import auth, organizations, sites, assets, alerts, incidents, ai_assistant, wireless, logs, security, automation, discovery, field_measurements, radio_devices, dashboard, credentials, agents, syslog, events, setup, system
from app.ingestion import telemetry

settings = get_settings()
logger = logging.getLogger("netsentinel")

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 180
_request_log: dict[str, deque[float]] = defaultdict(deque)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    if settings.uses_unsafe_dev_secret:
        logger.warning(
            "UNSAFE DEVELOPMENT SECRET_KEY is active. Change SECRET_KEY before shared or production-like use."
        )
    production_errors = settings.production_config_errors()
    if settings.is_production and production_errors:
        raise RuntimeError("Production configuration is not safe: " + "; ".join(production_errors))
    async with engine.begin() as conn:
        # MVP bootstrap creates missing tables for fresh local installs.
        # Existing schema changes are managed through Alembic migrations.
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Cleanup on shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API for NetSentinel AI platform",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def basic_rate_limit(request: Request, call_next):
    """Small in-memory rate limiter for MVP abuse protection.

    This is not a distributed production rate limiter; it protects the local MVP
    from accidental floods and simple API abuse while Redis-backed limiting is
    planned.
    """
    if request.url.path == "/health":
        return await call_next(request)

    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _request_log[client]
    while bucket and now - bucket[0] > RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Try again shortly."},
        )
    bucket.append(now)
    return await call_next(request)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(sites.router, prefix="/api/v1")
app.include_router(assets.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(incidents.router, prefix="/api/v1")
app.include_router(ai_assistant.router, prefix="/api/v1")
app.include_router(wireless.router, prefix="/api/v1")
app.include_router(logs.router, prefix="/api/v1")
app.include_router(security.router, prefix="/api/v1")
app.include_router(automation.router, prefix="/api/v1")
app.include_router(discovery.router, prefix="/api/v1")
app.include_router(field_measurements.router, prefix="/api/v1")
app.include_router(radio_devices.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(credentials.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(syslog.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(setup.router, prefix="/api/v1")
app.include_router(system.router, prefix="/api/v1")

# Fast-path telemetry
app.include_router(telemetry.router, prefix="/api/v1")


@app.get("/health", tags=["System"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}
