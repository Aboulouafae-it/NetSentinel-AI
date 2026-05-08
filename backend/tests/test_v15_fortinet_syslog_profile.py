import json
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.alert import Alert, AlertStatus
from app.models.asset import Asset, AssetStatus
from app.models.edge_agent import ActivityEvent, EdgeAgent, EdgeAgentStatus
from app.routers.syslog import SyslogIngestRequest, ingest_syslog
from app.services.agent_security import hash_agent_token
from app.services.syslog_profiles.fortinet import (
    build_fortinet_alert_payload,
    dedupe_key_for_fortinet,
    fortinet_to_log_level,
    looks_like_fortinet,
    normalize_fortinet_syslog,
    should_alert_fortinet,
)


FIXTURES = Path(__file__).parent / "fixtures" / "devices" / "syslog" / "fortinet"


class Result:
    def __init__(self, values):
        self.values = values if isinstance(values, list) else [values] if values else []

    def scalar_one_or_none(self):
        return self.values[0] if self.values else None

    def scalars(self):
        return self

    def all(self):
        return self.values


class FakeSession:
    def __init__(self, scalars=None):
        self.scalars_queue = list(scalars or [])
        self.added = []

    async def scalar(self, _query):
        if self.scalars_queue:
            value = self.scalars_queue.pop(0)
            return value[0] if isinstance(value, list) else value
        return None

    async def execute(self, _query):
        if self.scalars_queue:
            return Result(self.scalars_queue.pop(0))
        return Result([])

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        if getattr(value, "created_at", None) is None:
            value.created_at = datetime.now(timezone.utc)
            value.updated_at = value.created_at
        self.added.append(value)

    async def flush(self):
        pass


def load_samples():
    return json.loads((FIXTURES / "fortigate_samples.json").read_text())["samples"]


def edge_agent(org_id):
    now = datetime.now(timezone.utc)
    return EdgeAgent(
        id=uuid4(),
        organization_id=org_id,
        name="edge-fw",
        agent_uid="edge-fw",
        token_hash=hash_agent_token("secret"),
        status=EdgeAgentStatus.HEALTHY,
        created_at=now,
        updated_at=now,
    )


def test_fortinet_fixture_loading_and_key_value_parsing():
    sample = next(item for item in load_samples() if item["name"] == "traffic_deny")
    normalized = normalize_fortinet_syslog(sample["message"])

    assert looks_like_fortinet(sample["message"]) is True
    assert normalized.parsed["devname"] == "FGT-EDGE"
    assert normalized.parsed["srcip"] == "198.51.100.10"
    assert normalized.parsed["dstport"] == "22"
    assert normalized.parsed["action"] == "deny"
    assert normalized.classification.category == "firewall_blocked_traffic"
    assert normalized.classification.confidence >= 0.8


def test_fortinet_fixture_categories_and_severity_mapping():
    expected_severities = {
        "firewall_blocked_traffic": "low",
        "vpn_login_success": "info",
        "vpn_login_failure": "medium",
        "admin_login_failure": "high",
        "ips_attack_detected": "high",
        "malware_detected": "critical",
        "web_filter_block": "medium",
        "interface_down": "high",
        "ha_failover": "critical",
        "config_changed": "medium",
    }
    for sample in load_samples():
        normalized = normalize_fortinet_syslog(sample["message"])
        assert normalized.classification.category == sample["expected_category"]
        assert normalized.classification.severity == expected_severities[sample["expected_category"]]
        assert normalized.classification.recommended_action
        assert fortinet_to_log_level(normalized.classification).value in {"info", "warning", "error", "critical"}


def test_fortinet_malformed_partial_log_is_preserved_without_fake_fields():
    normalized = normalize_fortinet_syslog('devname="FGT-EDGE" msg="odd event without enough fields"')

    assert normalized.partial is True
    assert "type" in normalized.missing_fields
    assert normalized.parsed["devname"] == "FGT-EDGE"
    assert normalized.raw_message
    assert normalized.classification.category in {"unknown_fortinet_event", "system_event"}


def test_fortinet_alert_policy_is_not_noisy_for_single_denied_packet():
    blocked = normalize_fortinet_syslog(next(item for item in load_samples() if item["name"] == "traffic_deny")["message"])
    malware = normalize_fortinet_syslog(next(item for item in load_samples() if item["name"] == "malware_antivirus")["message"])
    admin_fail = normalize_fortinet_syslog(next(item for item in load_samples() if item["name"] == "admin_login_failure")["message"])

    assert should_alert_fortinet(blocked) is False
    assert should_alert_fortinet(malware) is True
    assert should_alert_fortinet(admin_fail) is True


def test_fortinet_alert_payload_contains_evidence_without_secrets():
    sample = next(item for item in load_samples() if item["name"] == "ips_attack")
    normalized = normalize_fortinet_syslog(sample["message"])
    payload = build_fortinet_alert_payload(normalized)
    serialized = json.dumps(payload).lower()

    assert payload["source"] == "Fortinet Syslog"
    assert payload["source_metadata"]["category"] == "ips_attack_detected"
    assert payload["source_metadata"]["recommended_actions"]
    assert "password" not in serialized
    assert "token" not in serialized
    assert "private key" not in serialized


@pytest.mark.asyncio
async def test_fortinet_ingestion_links_asset_and_creates_alert_activity():
    org_id = uuid4()
    firewall_asset = Asset(id=uuid4(), hostname="FGT-EDGE", ip_address="192.0.2.1", status=AssetStatus.ONLINE, site_id=uuid4())
    sample = next(item for item in load_samples() if item["name"] == "ips_attack")
    session = FakeSession([edge_agent(org_id), firewall_asset, None])

    result = await ingest_syslog(
        SyslogIngestRequest(source_ip="192.0.2.1", hostname="FGT-EDGE", severity="warning", message=sample["message"]),
        session,
        x_agent_uid="edge-fw",
        x_agent_token="secret",
    )

    assert result["asset_id"] == str(firewall_asset.id)
    log = next(item for item in session.added if item.__class__.__name__ == "LogEntry")
    assert log.source == "fortinet_syslog"
    assert log.metadata_json["vendor_profile"] == "fortinet"
    assert log.metadata_json["category"] == "ips_attack_detected"
    alert = next(item for item in session.added if isinstance(item, Alert))
    assert alert.organization_id == org_id
    assert alert.asset_id == firewall_asset.id
    assert alert.rule_name == "fortinet_ips_attack_detected"
    assert any(isinstance(item, ActivityEvent) for item in session.added)


@pytest.mark.asyncio
async def test_fortinet_alert_deduplication_updates_existing_open_alert():
    org_id = uuid4()
    sample = next(item for item in load_samples() if item["name"] == "vpn_login_failure")
    normalized = normalize_fortinet_syslog(sample["message"])
    existing = Alert(
        id=uuid4(),
        title="Fortinet vpn login failure: FGT-EDGE",
        severity=build_fortinet_alert_payload(normalized)["severity"],
        status=AlertStatus.OPEN,
        source="Fortinet Syslog",
        rule_name="fortinet_vpn_login_failure",
        organization_id=org_id,
        dedupe_key=dedupe_key_for_fortinet(org_id, normalized),
        occurrence_count=2,
        source_metadata={"evidence": []},
    )
    session = FakeSession([edge_agent(org_id), None, existing])

    await ingest_syslog(
        SyslogIngestRequest(source_ip="192.0.2.1", severity="warning", message=sample["message"]),
        session,
        x_agent_uid="edge-fw",
        x_agent_token="secret",
    )

    assert existing.occurrence_count == 3
    assert existing.last_seen is not None
    assert not [item for item in session.added if isinstance(item, Alert)]


@pytest.mark.asyncio
async def test_fortinet_unlinked_source_still_stores_log_without_asset():
    org_id = uuid4()
    sample = next(item for item in load_samples() if item["name"] == "config_change")
    session = FakeSession([edge_agent(org_id), None, None])

    result = await ingest_syslog(
        SyslogIngestRequest(source_ip="192.0.2.1", severity="notice", message=sample["message"]),
        session,
        x_agent_uid="edge-fw",
        x_agent_token="secret",
    )

    assert result["asset_id"] is None
    log = next(item for item in session.added if item.__class__.__name__ == "LogEntry")
    assert log.metadata_json["unlinked_source"] is True
    alert = next(item for item in session.added if isinstance(item, Alert))
    assert alert.organization_id == org_id
