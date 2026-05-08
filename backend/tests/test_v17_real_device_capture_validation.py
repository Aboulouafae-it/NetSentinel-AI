import importlib.util
import json
from pathlib import Path

import pytest

from app.adapters.support_matrix import get_support_matrix
from app.services.fixture_metadata import real_capture_metadata_files, validate_capture_metadata


REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).parent / "fixtures" / "devices"


def load_redactor_module():
    path = REPO_ROOT / "tools" / "redact_device_capture.py"
    spec = importlib.util.spec_from_file_location("redact_device_capture", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_redaction_removes_credentials_addresses_identities_and_preserves_shape():
    redactor = load_redactor_module()
    raw = (
        'devname="Customer-FGT" devid="FGT60FABC123456" user="alice" '
        'email=alice@example.com srcip=203.0.113.10 dstip=10.10.10.5 '
        'mac=00:11:22:33:44:55 snmp_community=public password=supersecret '
        'token=abc123 hostname=edge-fw customer=AcmeCorp'
    )

    output = redactor.redact_text(
        raw,
        redact_private_ips=True,
        redact_public_ips=True,
        redact_hostnames=True,
        customer_names=["AcmeCorp"],
    )

    assert 'password=<SECRET>' in output
    assert 'token=<SECRET>' in output
    assert 'snmp_community=<SECRET>' in output
    assert "alice@example.com" not in output
    assert "203.0.113.10" not in output
    assert "10.10.10.5" not in output
    assert "00:11:22:33:44:55" not in output
    assert "Customer-FGT" not in output
    assert "AcmeCorp" not in output
    assert "devname=" in output
    assert "srcip=" in output


def test_redaction_can_keep_private_ips_for_lab_topology_shape():
    redactor = load_redactor_module()
    output = redactor.redact_text("srcip=10.0.0.5 dstip=8.8.8.8", redact_private_ips=False, redact_public_ips=True)

    assert "10.0.0.5" in output
    assert "8.8.8.8" not in output


def test_real_redacted_directories_exist_and_warn_no_real_captures_yet():
    expected = [
        FIXTURES / "mikrotik" / "real_redacted",
        FIXTURES / "tplink_cpe" / "real_redacted",
        FIXTURES / "ubiquiti_airmax" / "real_redacted",
        FIXTURES / "generic_snmp" / "real_redacted",
        FIXTURES / "syslog" / "fortinet" / "real_redacted",
    ]
    for directory in expected:
        assert directory.is_dir()
        assert (directory / "README.md").read_text().strip()


def test_capture_metadata_validator_accepts_required_review_metadata():
    metadata = {
        "device_family": "FortiGate 60F",
        "firmware_version": "redacted-7.x",
        "capture_method": "syslog_http_ingest",
        "date": "2026-05-07",
        "redaction_status": "real_redacted",
        "supported_fields": ["devname", "srcip", "action"],
        "missing_fields": ["serial_number"],
        "notes": "Reviewed synthetic-style sample.",
    }

    assert validate_capture_metadata(metadata) == []


def test_capture_metadata_validator_rejects_incomplete_metadata():
    errors = validate_capture_metadata({"redaction_status": "raw"})

    assert errors
    assert any("missing required fields" in error for error in errors)
    assert any("redaction_status" in error for error in errors)


def test_optional_real_capture_metadata_files_are_valid_when_present():
    metadata_files = real_capture_metadata_files(FIXTURES)
    if not metadata_files:
        pytest.skip("No reviewed real_redacted capture metadata committed yet.")
    for path in metadata_files:
        errors = validate_capture_metadata(json.loads(path.read_text()))
        assert errors == [], f"{path}: {errors}"


def test_support_matrix_tracks_real_capture_confidence_flags():
    for row in get_support_matrix():
        assert "synthetic_fixture_validated" in row
        assert "real_capture_validated" in row
        assert "real_device_tested" in row
        assert "transport_tested" in row
        assert "rf_metrics_verified" in row
        assert "manual_required" in row

    rows = {row["adapter_type"]: row for row in get_support_matrix()}
    assert rows["generic_snmp"]["synthetic_fixture_validated"] is True
    assert rows["generic_snmp"]["real_capture_validated"] is False
    assert rows["tplink_cpe"]["manual_required"] is True
    assert rows["ubiquiti_airmax"]["rf_metrics_verified"] is False
