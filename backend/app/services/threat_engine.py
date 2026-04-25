"""
NetSentinel AI — Threat Detection Engine

Evaluates incoming log streams against Detection Rules and IOCs.
"""

import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.log import LogEntry
from app.models.security import DetectionRule, IndicatorOfCompromise
from app.models.alert import Alert, AlertSeverity, AlertStatus

logger = logging.getLogger(__name__)

class ThreatEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_log(self, log: LogEntry) -> list[Alert]:
        """
        Evaluate a single log entry against all active rules and IOCs.
        Returns a list of generated Alerts (which are not yet committed).
        """
        generated_alerts = []

        # 1. Evaluate Detection Rules
        rules_res = await self.db.execute(
            select(DetectionRule).where(
                DetectionRule.organization_id == log.organization_id,
                DetectionRule.is_active == True
            )
        )
        rules = rules_res.scalars().all()

        for rule in rules:
            if self._evaluate_rule(log, rule):
                generated_alerts.append(
                    Alert(
                        title=f"Detection Rule Triggered: {rule.name}",
                        description=f"Log matched rule '{rule.name}'.\nLog Message: {log.message}",
                        severity=AlertSeverity(rule.severity.lower()),
                        status=AlertStatus.OPEN,
                        source="Threat Engine",
                        rule_name=rule.name,
                        organization_id=log.organization_id,
                        asset_id=log.asset_id
                    )
                )

        # 2. Evaluate Indicators of Compromise (IOCs)
        iocs_res = await self.db.execute(
            select(IndicatorOfCompromise).where(
                IndicatorOfCompromise.organization_id == log.organization_id
            )
        )
        iocs = iocs_res.scalars().all()

        for ioc in iocs:
            if self._evaluate_ioc(log, ioc):
                generated_alerts.append(
                    Alert(
                        title=f"IOC Match: {ioc.ioc_type.upper()}",
                        description=f"Log matched known Indicator of Compromise ({ioc.value}).\nLog Message: {log.message}",
                        severity=AlertSeverity.CRITICAL, # IOC matches are always critical
                        status=AlertStatus.OPEN,
                        source="Threat Engine",
                        rule_name=f"IOC Match - {ioc.ioc_type}",
                        organization_id=log.organization_id,
                        asset_id=log.asset_id
                    )
                )

        return generated_alerts

    def _evaluate_rule(self, log: LogEntry, rule: DetectionRule) -> bool:
        # Determine target text based on rule.target_field
        target_text = ""
        if rule.target_field == "message":
            target_text = log.message
        elif rule.target_field == "source":
            target_text = log.source
        elif rule.target_field.startswith("metadata."):
            key = rule.target_field.split(".", 1)[1]
            if log.metadata_json and key in log.metadata_json:
                target_text = str(log.metadata_json[key])
        
        if not target_text:
            return False

        # Evaluate condition
        try:
            if rule.condition == "contains":
                return rule.pattern.lower() in target_text.lower()
            elif rule.condition == "equals":
                return rule.pattern.lower() == target_text.lower()
            elif rule.condition == "regex":
                return bool(re.search(rule.pattern, target_text, re.IGNORECASE))
        except Exception as e:
            logger.error(f"Error evaluating rule {rule.name}: {e}")
            return False
            
        return False

    def _evaluate_ioc(self, log: LogEntry, ioc: IndicatorOfCompromise) -> bool:
        # Search the entire log message and metadata for the IOC value
        # This is a naive implementation; a production system would extract IP/Domains first.
        ioc_val = ioc.value.lower()
        if ioc_val in log.message.lower():
            return True
        if log.metadata_json:
            for v in log.metadata_json.values():
                if ioc_val in str(v).lower():
                    return True
        return False
