"""
NetSentinel AI — Threat Engine

A basic rule-based detection engine for Phase 4.
It evaluates logs against defined DetectionRules and creates Alerts if matched.
"""

import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.log import LogEntry
from app.models.security import DetectionRule, IndicatorOfCompromise
from app.models.alert import Alert, AlertSeverity, AlertStatus


class ThreatEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_log(self, log_entry: LogEntry):
        """
        Evaluate a single log entry against active detection rules and IOCs.
        If a match is found, create an Alert.
        """
        # 1. Fetch active rules for the log's organization
        rules_stmt = select(DetectionRule).where(
            DetectionRule.organization_id == log_entry.organization_id,
            DetectionRule.is_active == True
        )
        rules_result = await self.db.execute(rules_stmt)
        rules = rules_result.scalars().all()

        for rule in rules:
            if self._match_rule(log_entry, rule):
                await self._create_alert_from_rule(log_entry, rule)

        # 2. Basic IOC matching (e.g. checking if message contains known bad IP)
        # In a real system, we would parse IPs/domains from the log first.
        # Here we do a simple substring check against high confidence IOCs for the org.
        ioc_stmt = select(IndicatorOfCompromise).where(
            IndicatorOfCompromise.organization_id == log_entry.organization_id,
            IndicatorOfCompromise.confidence >= 80
        )
        ioc_result = await self.db.execute(ioc_stmt)
        iocs = iocs_result = ioc_result.scalars().all()

        for ioc in iocs:
            # If the IOC value appears anywhere in the log message
            if ioc.value in log_entry.message or (log_entry.source and ioc.value in log_entry.source):
                await self._create_alert_from_ioc(log_entry, ioc)

    def _match_rule(self, log_entry: LogEntry, rule: DetectionRule) -> bool:
        # Get target field value
        target_value = ""
        if rule.target_field == "message":
            target_value = log_entry.message
        elif rule.target_field == "source":
            target_value = log_entry.source
        elif rule.target_field == "level":
            target_value = log_entry.level.value
        elif rule.target_field.startswith("metadata.") and log_entry.metadata_json:
            # Extract from JSON metadata
            key = rule.target_field.split(".", 1)[1]
            target_value = str(log_entry.metadata_json.get(key, ""))
        
        if not target_value:
            return False

        # Evaluate condition
        try:
            if rule.condition == "equals":
                return target_value == rule.pattern
            elif rule.condition == "contains":
                return rule.pattern in target_value
            elif rule.condition == "regex":
                return bool(re.search(rule.pattern, target_value))
            elif rule.condition == "starts_with":
                return target_value.startswith(rule.pattern)
            elif rule.condition == "ends_with":
                return target_value.endswith(rule.pattern)
        except Exception:
            # Catch bad regex or other errors
            pass

        return False

    async def _create_alert_from_rule(self, log_entry: LogEntry, rule: DetectionRule):
        # Prevent creating identical alerts continuously (basic deduplication)
        # Check if an open alert exists for this rule and asset
        dup_stmt = select(Alert).where(
            Alert.organization_id == rule.organization_id,
            Alert.rule_name == rule.name,
            Alert.status == AlertStatus.OPEN
        )
        if log_entry.asset_id:
            dup_stmt = dup_stmt.where(Alert.asset_id == log_entry.asset_id)
            
        dup_result = await self.db.execute(dup_stmt)
        if dup_result.scalars().first():
            return # Skip if already open

        # Map rule severity to AlertSeverity
        severity_map = {
            "critical": AlertSeverity.CRITICAL,
            "high": AlertSeverity.HIGH,
            "medium": AlertSeverity.MEDIUM,
            "low": AlertSeverity.LOW,
            "info": AlertSeverity.INFO
        }
        severity = severity_map.get(rule.severity.lower(), AlertSeverity.HIGH)

        new_alert = Alert(
            title=f"Detection Rule Triggered: {rule.name}",
            description=f"Log matched rule condition.\nLog message: {log_entry.message}",
            severity=severity,
            status=AlertStatus.OPEN,
            source="ThreatEngine",
            rule_name=rule.name,
            organization_id=log_entry.organization_id,
            asset_id=log_entry.asset_id
        )
        self.db.add(new_alert)
        await self.db.commit()

    async def _create_alert_from_ioc(self, log_entry: LogEntry, ioc: IndicatorOfCompromise):
        # Basic deduplication
        dup_stmt = select(Alert).where(
            Alert.organization_id == ioc.organization_id,
            Alert.rule_name == f"IOC Match: {ioc.value}",
            Alert.status == AlertStatus.OPEN
        )
        dup_result = await self.db.execute(dup_stmt)
        if dup_result.scalars().first():
            return

        new_alert = Alert(
            title=f"IOC Detected: {ioc.ioc_type} - {ioc.value}",
            description=f"Log contained known Indicator of Compromise.\nLog message: {log_entry.message}",
            severity=AlertSeverity.CRITICAL,
            status=AlertStatus.OPEN,
            source="ThreatEngine-IOC",
            rule_name=f"IOC Match: {ioc.value}",
            organization_id=log_entry.organization_id,
            asset_id=log_entry.asset_id
        )
        self.db.add(new_alert)
        await self.db.commit()
