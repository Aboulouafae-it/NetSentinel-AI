"""
NetSentinel AI — Telemetry Ingestion Fast-Path

These endpoints are optimized for high-throughput data ingestion from Edge Agents.
Instead of heavy CRUD validations, they parse payloads and push directly to Redis queues 
or timeseries stores.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/ingestion", tags=["Telemetry Ingestion"])

class TelemetryPayload(BaseModel):
    agent_id: str
    asset_id: str
    metric_type: str
    value: float
    timestamp: str

@router.post("/metrics", status_code=status.HTTP_202_ACCEPTED)
async def ingest_metrics(payloads: List[TelemetryPayload]):
    """
    Fast-path endpoint for edge agents to submit bulk metrics.
    In the future, this will push directly to Redis/ARQ rather than doing synchronous DB inserts.
    """
    # TODO: Enqueue to ARQ `process_telemetry_batch`
    return {"status": "queued", "count": len(payloads)}
