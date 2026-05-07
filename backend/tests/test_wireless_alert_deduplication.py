from uuid import uuid4

import pytest

from app.models.field_measurement import FieldMeasurement
from app.models.alert import Alert
from app.routers.field_measurements import create_health_alert_if_needed


class _Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeSession:
    def __init__(self, existing=None):
        self.existing = existing
        self.added = []
        self.flushes = 0

    async def execute(self, _query):
        return _Result(self.existing)

    def add(self, value):
        self.added.append(value)

    async def flush(self):
        self.flushes += 1


def poor_measurement():
    return FieldMeasurement(
        id=uuid4(),
        organization_id=uuid4(),
        wireless_link_id=uuid4(),
        link_name="Backhaul A",
        rssi_dbm=-85,
        snr_db=10,
        noise_floor_dbm=-78,
        ccq_percent=55,
        packet_loss_percent=8,
        latency_ms=140,
    )


@pytest.mark.asyncio
async def test_poor_wireless_health_creates_deduped_alert():
    session = FakeSession()

    alert = await create_health_alert_if_needed(poor_measurement(), session)

    assert alert is not None
    assert alert.dedupe_key.startswith("wireless_health:")
    assert alert.occurrence_count == 1
    assert session.added == [alert]


@pytest.mark.asyncio
async def test_existing_open_wireless_health_alert_is_updated():
    existing = Alert(
        title="Existing",
        description="Old",
        occurrence_count=2,
        dedupe_key="wireless_health:old",
    )
    session = FakeSession(existing=existing)

    alert = await create_health_alert_if_needed(poor_measurement(), session)

    assert alert is existing
    assert existing.occurrence_count == 3
    assert existing.last_seen is not None
    assert session.added == []
