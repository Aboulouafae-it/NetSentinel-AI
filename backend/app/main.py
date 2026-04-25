"""
NetSentinel AI — Main Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import engine
from app.models.base import Base

# Import routers
from app.routers import auth, organizations, sites, assets, alerts, incidents, ai_assistant, wireless, logs, security, automation, discovery, field_measurements, radio_devices
from app.ingestion import telemetry

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    async with engine.begin() as conn:
        # Create new tables
        await conn.run_sync(Base.metadata.create_all)

        # Safe migrations: make FK columns nullable for standalone operation
        migrations = [
            "ALTER TABLE alerts ALTER COLUMN organization_id DROP NOT NULL",
            "ALTER TABLE incidents ALTER COLUMN organization_id DROP NOT NULL",
            "ALTER TABLE assets ALTER COLUMN site_id DROP NOT NULL",
        ]
        for sql in migrations:
            try:
                await conn.execute(__import__('sqlalchemy').text(sql))
            except Exception:
                pass  # Column already nullable or table doesn't exist yet
    
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

# Fast-path telemetry
app.include_router(telemetry.router, prefix="/api/v1")


@app.get("/health", tags=["System"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}
