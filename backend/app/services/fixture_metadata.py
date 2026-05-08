"""Validation helpers for reviewed real device fixture metadata."""

from __future__ import annotations

from pathlib import Path
from typing import Any


REQUIRED_CAPTURE_METADATA_FIELDS = {
    "device_family",
    "firmware_version",
    "capture_method",
    "date",
    "redaction_status",
    "supported_fields",
    "missing_fields",
    "notes",
}


def validate_capture_metadata(metadata: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    missing = sorted(REQUIRED_CAPTURE_METADATA_FIELDS - set(metadata))
    if missing:
        errors.append(f"missing required fields: {', '.join(missing)}")
    if metadata.get("redaction_status") not in {None, "real_redacted", "synthetic", "documentation_sample"}:
        errors.append("redaction_status must be real_redacted, synthetic, or documentation_sample")
    for list_field in ["supported_fields", "missing_fields"]:
        if list_field in metadata and not isinstance(metadata[list_field], list):
            errors.append(f"{list_field} must be a list")
    return errors


def real_capture_metadata_files(fixtures_root: Path) -> list[Path]:
    return sorted(fixtures_root.glob("**/real_redacted/**/capture_metadata.json")) + sorted(fixtures_root.glob("**/real_redacted/capture_metadata.json"))
