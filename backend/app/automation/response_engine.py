"""
NetSentinel AI — Response Engine (Phase 6)

Executes automated playbook rules when alerts are created.
"""

import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.automation import PlaybookRule, ActionType, ResponseAction
from app.models.alert import Alert, AlertSeverity
from app.models.incident import Incident, IncidentSeverity, IncidentStatus


class ResponseEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_alert(self, alert: Alert):
        """
        Evaluate an alert against all active playbooks for its organization.
        Execute any matching playbook actions.
        """
        stmt = select(PlaybookRule).where(
            PlaybookRule.organization_id == alert.organization_id,
            PlaybookRule.is_active == True
        )
        result = await self.db.execute(stmt)
        playbooks = result.scalars().all()

        for playbook in playbooks:
            if self._matches(alert, playbook):
                await self._execute(alert, playbook)

    def _matches(self, alert: Alert, rule: PlaybookRule) -> bool:
        """Check whether an alert satisfies a playbook's trigger conditions."""
        if rule.trigger_on_severity:
            if alert.severity.value != rule.trigger_on_severity.lower():
                return False
        if rule.trigger_on_source:
            if not alert.source or rule.trigger_on_source.lower() not in alert.source.lower():
                return False
        return True

    async def _execute(self, alert: Alert, rule: PlaybookRule):
        """Execute the action defined by the playbook rule."""
        result_message = ""
        try:
            if rule.action_type == ActionType.CREATE_INCIDENT:
                result_message = await self._create_incident(alert)
            elif rule.action_type == ActionType.SEND_WEBHOOK:
                result_message = await self._send_webhook(alert, rule.action_config)
            elif rule.action_type == ActionType.ADD_IOC:
                result_message = await self._add_ioc(alert)
            else:
                result_message = f"Action '{rule.action_type.value}' acknowledged (no executor yet)"

            status = "executed"
        except Exception as e:
            result_message = f"Error: {e}"
            status = "failed"

        # Record the action
        action_record = ResponseAction(
            status=status,
            result_message=result_message,
            playbook_rule_id=rule.id,
            alert_id=alert.id,
            organization_id=alert.organization_id,
        )
        self.db.add(action_record)
        await self.db.commit()

    async def _create_incident(self, alert: Alert) -> str:
        """Auto-create an incident from a critical alert if none exists."""
        if alert.incident_id:
            return "Alert already linked to an incident, skipping."

        severity_map = {
            AlertSeverity.CRITICAL: IncidentSeverity.CRITICAL,
            AlertSeverity.HIGH: IncidentSeverity.HIGH,
            AlertSeverity.MEDIUM: IncidentSeverity.MEDIUM,
            AlertSeverity.LOW: IncidentSeverity.LOW,
        }
        incident = Incident(
            title=f"[AUTO] {alert.title}",
            description=(
                f"Incident auto-created by Response Engine from alert: {alert.title}\n"
                f"Source: {alert.source}\nRule: {alert.rule_name}"
            ),
            severity=severity_map.get(alert.severity, IncidentSeverity.HIGH),
            status=IncidentStatus.OPEN,
            organization_id=alert.organization_id,
        )
        self.db.add(incident)
        await self.db.flush()

        # Link the alert to the new incident
        alert.incident_id = incident.id
        await self.db.commit()

        return f"Incident '{incident.title}' created and linked (id={incident.id})"

    async def _send_webhook(self, alert: Alert, config_str: str | None) -> str:
        """POST alert data to an external webhook URL."""
        try:
            config = json.loads(config_str or "{}")
            webhook_url = config.get("url")
            if not webhook_url:
                return "Webhook skipped: no URL in action_config"

            import httpx
            payload = {
                "event": "alert_triggered",
                "alert_id": str(alert.id),
                "title": alert.title,
                "severity": alert.severity.value,
                "source": alert.source,
            }
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(webhook_url, json=payload)
                return f"Webhook delivered: HTTP {r.status_code}"
        except Exception as e:
            return f"Webhook failed: {e}"

    async def _add_ioc(self, alert: Alert) -> str:
        """Placeholder: In production, parse IPs from the alert and add to IOC list."""
        return f"IOC extraction from alert '{alert.title}' queued (feature in progress)"
