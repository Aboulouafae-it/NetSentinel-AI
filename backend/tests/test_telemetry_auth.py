from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.ingestion.telemetry import TelemetryPayload, ingest_metrics


def payload(agent_id="dev-agent", timestamp=None):
    return [
        TelemetryPayload(
            agent_id=agent_id,
            asset_id="asset-1",
            metric_type="rssi",
            value=-60,
            timestamp=timestamp or datetime.now(timezone.utc).isoformat(),
        )
    ]


@pytest.mark.asyncio
async def test_telemetry_rejects_missing_agent_credentials():
    with pytest.raises(HTTPException) as exc:
        await ingest_metrics(payload())

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_telemetry_accepts_valid_agent_credentials():
    result = await ingest_metrics(
        payload(),
        x_agent_id="dev-agent",
        x_agent_token="dev-agent-token-change-me",
    )

    assert result == {"status": "queued", "count": 1}


@pytest.mark.asyncio
async def test_telemetry_rejects_agent_id_mismatch():
    with pytest.raises(HTTPException) as exc:
        await ingest_metrics(
            payload(agent_id="other-agent"),
            x_agent_id="dev-agent",
            x_agent_token="dev-agent-token-change-me",
        )

    assert exc.value.status_code == 403
