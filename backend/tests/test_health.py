import pytest

from app.main import health_check


@pytest.mark.asyncio
async def test_backend_health_payload():
    payload = await health_check()

    assert payload["status"] == "healthy"
    assert "version" in payload
