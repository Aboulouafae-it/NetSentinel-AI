"""
NetSentinel AI — Telemetry Ingestion Fast-Path

These endpoints are optimized for high-throughput data ingestion from Edge Agents.
Instead of heavy CRUD validations, they parse payloads and push directly to Redis queues 
or timeseries stores.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.routers.agents import authenticate_agent
from app.services.activity import create_activity_event
from app.services.telemetry_processor import process_asset_telemetry

router = APIRouter(prefix="/ingestion", tags=["Telemetry Ingestion"])

class TelemetryPayload(BaseModel):
    agent_id: str
    asset_id: str | None = None
    ip_address: str | None = None
    metric_type: str
    value: float | str
    timestamp: str

@router.post("/metrics", status_code=status.HTTP_202_ACCEPTED)
async def ingest_metrics(
    payloads: List[TelemetryPayload],
    db: AsyncSession = Depends(get_db),
    x_agent_id: str | None = Header(default=None),
    x_agent_token: str | None = Header(default=None),
    x_agent_uid: str | None = Header(default=None),
):
    """
    Fast-path endpoint for edge agents to submit bulk metrics.
    In the future, this will push directly to Redis/ARQ rather than doing synchronous DB inserts.
    """
    if not isinstance(x_agent_id, str):
        x_agent_id = None
    if not isinstance(x_agent_uid, str):
        x_agent_uid = None
    if not isinstance(x_agent_token, str):
        x_agent_token = None
    agent = None
    settings = get_settings()
    allowed_tokens = dict(item.split(":", 1) for item in settings.edge_agent_tokens.split(",") if ":" in item)
    if x_agent_uid:
        agent = await authenticate_agent(db, x_agent_uid, x_agent_token)
        x_agent_id = x_agent_uid
    elif not x_agent_id or not x_agent_token or allowed_tokens.get(x_agent_id) != x_agent_token:
        if db:
            # Organization is unknown here; rejection is represented at HTTP boundary.
            pass
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid edge agent credentials")
    now = datetime.now(timezone.utc)
    for payload in payloads:
        if payload.agent_id != x_agent_id:
            if agent:
                await create_activity_event(db, agent.organization_id, "telemetry_rejected", "telemetry", "Telemetry rejected due to agent mismatch", actor_type="agent", actor_id=str(agent.id), severity="warning")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Payload agent_id does not match credentials")
        try:
            timestamp = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid telemetry timestamp")
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        skew = abs((now - timestamp).total_seconds())
        if skew > settings.telemetry_max_clock_skew_seconds:
            if agent:
                await create_activity_event(db, agent.organization_id, "telemetry_rejected", "telemetry", "Telemetry rejected due to replay window", actor_type="agent", actor_id=str(agent.id), severity="warning")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telemetry timestamp is outside replay window")
        if agent:
            await process_asset_telemetry(db, agent.organization_id, payload, actor_id=str(agent.id))

    return {"status": "queued", "count": len(payloads)}
