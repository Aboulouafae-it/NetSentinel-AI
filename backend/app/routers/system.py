"""Appliance/system status endpoints."""

import shutil
from pathlib import Path

import redis.asyncio as redis
from fastapi import APIRouter, Depends
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.edge_agent import EdgeAgent, EdgeAgentStatus
from app.models.user import User

router = APIRouter(prefix="/system", tags=["System"])


async def database_revision(db: AsyncSession) -> str | None:
    try:
        return await db.scalar(text("select version_num from alembic_version limit 1"))
    except Exception:
        return None


@router.get("/version")
async def appliance_version(db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    git_commit = settings.git_commit
    if not git_commit:
        git_head = Path.cwd().parent / ".git" / "HEAD"
        try:
            head = git_head.read_text(encoding="utf-8").strip()
            if head.startswith("ref:"):
                ref_path = Path.cwd().parent / ".git" / head.split(" ", 1)[1]
                git_commit = ref_path.read_text(encoding="utf-8").strip()[:12]
            else:
                git_commit = head[:12]
        except Exception:
            git_commit = None
    return {
        "app_version": settings.app_version,
        "build_date": settings.build_date or None,
        "edition": settings.edition,
        "environment": settings.environment,
        "git_commit": git_commit,
        "database_revision": await database_revision(db),
    }


@router.get("/health")
async def appliance_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_settings()
    database = {"status": "unknown"}
    redis_status = {"status": "unknown"}
    worker = {"status": "configured", "detail": "ARQ worker entrypoint available"}

    try:
        await db.scalar(select(1))
        database = {"status": "healthy"}
    except Exception as exc:
        database = {"status": "error", "detail": str(exc)}

    client = None
    try:
        client = redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
        await client.ping()
        redis_status = {"status": "healthy"}
    except Exception as exc:
        redis_status = {"status": "error", "detail": str(exc)}
    finally:
        if client:
            await client.aclose()

    agents = await db.execute(select(EdgeAgent).where(EdgeAgent.organization_id == current_user.organization_id))
    agent_list = list(agents.scalars().all())
    healthy_agents = sum(1 for agent in agent_list if agent.status == EdgeAgentStatus.HEALTHY and not agent.revoked_at)
    revoked_agents = sum(1 for agent in agent_list if agent.revoked_at)

    usage = shutil.disk_usage(Path.cwd())
    backup_dir = Path(settings.backup_dir)
    backups = sorted(backup_dir.glob("netsentinel-backup-*.tar.gz")) if backup_dir.exists() else []

    return {
        "app": {
            "name": settings.app_name,
            "version": settings.app_version,
            "build_date": settings.build_date or None,
            "edition": settings.edition,
            "environment": settings.environment,
            "debug": settings.debug,
            "production_ready": not settings.production_config_errors(),
            "config_warnings": settings.production_config_errors(),
        },
        "backend": {"status": "healthy"},
        "database": database,
        "redis": redis_status,
        "worker": worker,
        "edge_agents": {
            "status": "healthy" if healthy_agents == len(agent_list) and agent_list else "attention" if agent_list else "empty",
            "total": len(agent_list),
            "healthy": healthy_agents,
            "revoked": revoked_agents,
        },
        "disk": {
            "total_bytes": usage.total,
            "used_bytes": usage.used,
            "free_bytes": usage.free,
        },
        "backup": {
            "status": "available" if backups else "not_configured",
            "latest": backups[-1].name if backups else None,
        },
    }
