"""Fortinet/FortiGate syslog parsing and security classification.

The profile is ingest-only. It normalizes Fortinet-style key/value logs and
returns honest partial output when a message is malformed or missing fields.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import re
import shlex
from typing import Any

from app.models.alert import AlertSeverity
from app.models.log import LogLevel


FORTINET_KEYS = {
    "date",
    "time",
    "devname",
    "devid",
    "vd",
    "vdom",
    "type",
    "subtype",
    "level",
    "eventtime",
    "srcip",
    "srcport",
    "dstip",
    "dstport",
    "srcintf",
    "dstintf",
    "action",
    "policyid",
    "service",
    "proto",
    "app",
    "user",
    "msg",
    "threat",
    "threattype",
    "virus",
    "attack",
    "eventid",
    "status",
    "ui",
}


@dataclass(frozen=True)
class FortinetClassification:
    category: str
    severity: str
    confidence: float
    summary: str
    recommended_action: str
    mitre_mapping: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class FortinetNormalizedEvent:
    vendor: str = "fortinet"
    profile: str = "fortinet_fortigate"
    raw_message: str = ""
    parsed: dict[str, Any] = field(default_factory=dict)
    classification: FortinetClassification = field(
        default_factory=lambda: FortinetClassification(
            category="unknown_fortinet_event",
            severity="info",
            confidence=0.1,
            summary="Unclassified Fortinet event",
            recommended_action="Review the raw log and add a fixture if this event should be classified.",
        )
    )
    partial: bool = False
    missing_fields: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["classification"] = self.classification.as_dict()
        return data


def looks_like_fortinet(message: str) -> bool:
    text = message.lower()
    return "devname=" in text or "devid=" in text or "fortigate" in text or "fortinet" in text


def parse_key_values(message: str) -> dict[str, str]:
    try:
        tokens = shlex.split(message)
    except ValueError:
        tokens = message.split()
    parsed: dict[str, str] = {}
    for token in tokens:
        if "=" not in token:
            continue
        key, value = token.split("=", 1)
        key = key.strip().lower()
        if key:
            parsed[key] = value.strip().strip('"')
    return parsed


def normalize_timestamp(fields: dict[str, str]) -> str | None:
    if fields.get("date") and fields.get("time"):
        try:
            parsed = datetime.fromisoformat(f"{fields['date']}T{fields['time']}")
            return parsed.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            return None
    if fields.get("eventtime"):
        try:
            raw = int(str(fields["eventtime"])[:10])
            return datetime.fromtimestamp(raw, timezone.utc).isoformat()
        except (TypeError, ValueError, OSError):
            return None
    return None


def _contains_any(text: str, patterns: list[str]) -> bool:
    return any(pattern in text for pattern in patterns)


def _severity_from_level(level: str | None, fallback: str = "info") -> str:
    normalized = (level or "").lower()
    if normalized in {"emergency", "alert", "critical", "crit"}:
        return "critical"
    if normalized in {"error", "err"}:
        return "high"
    if normalized in {"warning", "warn"}:
        return "medium"
    if normalized in {"notice"}:
        return "low"
    return fallback


def classify_fortinet_event(fields: dict[str, str], raw_message: str) -> FortinetClassification:
    text = f"{raw_message} {' '.join(f'{k}={v}' for k, v in fields.items())}".lower()
    action = fields.get("action", "").lower()
    subtype = fields.get("subtype", "").lower()
    event_type = fields.get("type", "").lower()
    msg = fields.get("msg", "")
    user = fields.get("user")
    srcip = fields.get("srcip")
    dstip = fields.get("dstip")

    if _contains_any(text, ["config changed", "configuration changed", "object changed", "cfg-change"]) or (event_type == "event" and "config" in text):
        return FortinetClassification(
            "config_changed",
            "medium",
            0.82,
            f"FortiGate configuration changed by {user or 'unknown admin'}.",
            "Validate the change against an approved maintenance record and review admin session logs.",
            "TA0005 placeholder",
        )

    if "vpn" in subtype or "ssl vpn" in text or "ipsec" in text:
        failed = _contains_any(text, ["fail", "failed", "failure", "invalid", "denied"])
        return FortinetClassification(
            "vpn_login_failure" if failed else "vpn_login_success",
            "medium" if failed else "info",
            0.86,
            f"VPN login {'failure' if failed else 'success'} for {user or 'unknown user'} from {srcip or 'unknown source'}.",
            "For failures, check repeated attempts, source reputation, MFA status, and account lockout policy." if failed else "No action required unless the user/source is unexpected.",
            "TA0001/T1110 placeholder" if failed else None,
        )

    if subtype in {"admin", "system"} and ("login" in text or "administrator" in text or "admin" in text):
        failed = _contains_any(text, ["fail", "failed", "failure", "invalid", "denied"])
        return FortinetClassification(
            "admin_login_failure" if failed else "admin_login_success",
            "high" if failed else "info",
            0.84,
            f"Admin login {'failure' if failed else 'success'} for {user or 'unknown user'} from {srcip or 'unknown source'}.",
            "Investigate repeated admin failures, validate management-plane exposure, and confirm MFA/access controls." if failed else "Confirm administrative access was expected.",
            "TA0006/T1110 placeholder" if failed else None,
        )

    if subtype in {"ips", "attack"} or _contains_any(text, ["utm=ips", "attack=", "intrusion", "signature"]):
        attack = fields.get("attack") or fields.get("threat") or msg or "IPS event"
        return FortinetClassification(
            "ips_attack_detected",
            "high",
            0.9,
            f"IPS detected attack: {attack}.",
            "Validate affected asset, inspect session direction, confirm block/prevention action, and search for repeated source IP activity.",
            "TA0001/T1190 placeholder",
        )

    if subtype in {"virus", "av", "antivirus"} or _contains_any(text, ["virus=", "malware", "infected"]):
        malware = fields.get("virus") or fields.get("threat") or msg or "malware event"
        return FortinetClassification(
            "malware_detected",
            "critical",
            0.9,
            f"Malware detected: {malware}.",
            "Isolate the endpoint if applicable, collect file/hash details, confirm quarantine action, and open an incident for confirmed infection.",
            "TA0002/TA0005 placeholder",
        )

    if subtype in {"webfilter", "web_filter"} or _contains_any(text, ["webfilter", "web filter", "urlfilter"]):
        return FortinetClassification(
            "web_filter_block",
            "medium",
            0.82,
            f"Web filter blocked request for {user or srcip or 'unknown source'}.",
            "Review category, URL/domain, user, and repetition before escalation.",
            "TA0011 placeholder",
        )

    if action in {"deny", "denied", "block", "blocked"} or _contains_any(text, ["action=deny", "action=blocked", "blocked traffic"]):
        return FortinetClassification(
            "firewall_blocked_traffic",
            "low",
            0.9,
            f"Firewall blocked traffic from {srcip or 'unknown source'} to {dstip or 'unknown destination'}.",
            "Review policy, source reputation, and volume before escalating; avoid alerting on isolated expected denies.",
            "TA0001/TA0011 placeholder",
        )

    if _contains_any(text, ["interface down", "link down", "status=down"]):
        return FortinetClassification(
            "interface_down",
            "high",
            0.86,
            "FortiGate interface/link reported down.",
            "Check interface health, HA pair state, upstream switch, optics/cabling, and related outage alerts.",
        )
    if _contains_any(text, ["interface up", "link up", "status=up"]):
        return FortinetClassification("interface_up", "info", 0.78, "FortiGate interface/link reported up.", "Confirm service recovery and close related outage alerts if stable.")

    if _contains_any(text, ["ha failover", "failover", "ha-primary", "ha-secondary"]):
        return FortinetClassification(
            "ha_failover",
            "critical",
            0.84,
            "FortiGate HA failover/system role change detected.",
            "Confirm cluster health, determine trigger, verify traffic impact, and inspect HA heartbeat links.",
        )

    if event_type in {"event", "system"} or subtype == "system":
        return FortinetClassification("system_event", _severity_from_level(fields.get("level"), "info"), 0.55, msg or "Fortinet system event.", "Review only if unexpected or repeated.")

    return FortinetClassification(
        "unknown_fortinet_event",
        _severity_from_level(fields.get("level"), "info"),
        0.2 if fields else 0.05,
        msg or "Unclassified Fortinet event.",
        "Review the raw event and add a redacted fixture if this event should be supported.",
    )


def normalize_fortinet_syslog(message: str) -> FortinetNormalizedEvent:
    fields = parse_key_values(message)
    normalized = {key: fields.get(key) for key in FORTINET_KEYS if fields.get(key) is not None}
    timestamp = normalize_timestamp(fields)
    if timestamp:
        normalized["normalized_timestamp"] = timestamp

    required_any = ["devname", "devid", "type", "subtype", "msg"]
    missing = [key for key in required_any if not fields.get(key)]
    classification = classify_fortinet_event(fields, message)
    return FortinetNormalizedEvent(
        raw_message=message,
        parsed=normalized,
        classification=classification,
        partial=bool(missing),
        missing_fields=missing,
    )


def fortinet_to_log_level(classification: FortinetClassification) -> LogLevel:
    if classification.severity == "critical":
        return LogLevel.CRITICAL
    if classification.severity == "high":
        return LogLevel.ERROR
    if classification.severity == "medium":
        return LogLevel.WARNING
    return LogLevel.INFO


def fortinet_to_alert_severity(classification: FortinetClassification) -> AlertSeverity:
    return {
        "critical": AlertSeverity.CRITICAL,
        "high": AlertSeverity.HIGH,
        "medium": AlertSeverity.MEDIUM,
        "low": AlertSeverity.LOW,
        "info": AlertSeverity.INFO,
    }.get(classification.severity, AlertSeverity.INFO)


ALERT_CATEGORIES = {
    "admin_login_failure",
    "vpn_login_failure",
    "ips_attack_detected",
    "malware_detected",
    "ha_failover",
    "interface_down",
    "config_changed",
}


def should_alert_fortinet(normalized: FortinetNormalizedEvent) -> bool:
    category = normalized.classification.category
    if category in ALERT_CATEGORIES:
        return True
    if category == "firewall_blocked_traffic":
        return False
    return normalized.classification.severity in {"critical", "high"} and category != "admin_login_success"


def dedupe_key_for_fortinet(org_id: Any, normalized: FortinetNormalizedEvent) -> str:
    fields = normalized.parsed
    category = normalized.classification.category
    source = fields.get("srcip") or fields.get("devname") or fields.get("devid") or "unknown"
    target = fields.get("dstip") or fields.get("user") or fields.get("service") or fields.get("policyid") or "unknown"
    if category in {"admin_login_failure", "vpn_login_failure", "firewall_blocked_traffic"}:
        return f"fortinet:{org_id}:{category}:{source}:{target}"
    if category in {"ips_attack_detected", "malware_detected"}:
        threat = fields.get("attack") or fields.get("virus") or fields.get("threat") or fields.get("msg") or "threat"
        clean_threat = re.sub(r"\s+", "-", str(threat).lower())[:80]
        return f"fortinet:{org_id}:{category}:{source}:{target}:{clean_threat}"
    return f"fortinet:{org_id}:{category}:{fields.get('devname') or fields.get('devid') or source}"


def build_fortinet_alert_payload(normalized: FortinetNormalizedEvent) -> dict[str, Any]:
    classification = normalized.classification
    fields = normalized.parsed
    title = f"Fortinet {classification.category.replace('_', ' ')}"
    if fields.get("devname"):
        title = f"{title}: {fields['devname']}"
    return {
        "title": title[:500],
        "description": classification.summary,
        "severity": fortinet_to_alert_severity(classification),
        "source": "Fortinet Syslog",
        "rule_name": f"fortinet_{classification.category}",
        "source_metadata": {
            "vendor": "fortinet",
            "profile": "fortinet_fortigate",
            "category": classification.category,
            "normalized": normalized.as_dict(),
            "evidence": [
                {
                    "message": classification.summary,
                    "srcip": fields.get("srcip"),
                    "dstip": fields.get("dstip"),
                    "action": fields.get("action"),
                    "user": fields.get("user"),
                    "service": fields.get("service"),
                    "policyid": fields.get("policyid"),
                }
            ],
            "recommended_actions": [classification.recommended_action],
            "mitre_mapping": classification.mitre_mapping,
        },
    }
