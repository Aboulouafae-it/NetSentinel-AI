"""
NetSentinel AI — Automation & Response Engine

Evaluates new alerts against Playbook Rules to trigger automated actions.
"""

import logging
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.alert import Alert
from app.models.automation import PlaybookRule, ResponseAction, ActionType
from app.models.incident import Incident

logger = logging.getLogger(__name__)

class ResponseEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_alert(self, alert: Alert) -> None:
        """
        Evaluate a single newly created Alert against all active playbook rules.
        Execute matching actions and log them.
        """
        rules_res = await self.db.execute(
            select(PlaybookRule).where(
                PlaybookRule.organization_id == alert.organization_id,
                PlaybookRule.is_active == True
            )
        )
        rules = rules_res.scalars().all()

        for rule in rules:
            if self._alert_matches_rule(alert, rule):
                logger.info(f"Alert {alert.id} triggered Playbook Rule '{rule.name}'")
                await self._execute_action(alert, rule)

    def _alert_matches_rule(self, alert: Alert, rule: PlaybookRule) -> bool:
        # Match Severity
        if rule.trigger_on_severity:
            if alert.severity.value.lower() != rule.trigger_on_severity.lower():
                return False
                
        # Match Source
        if rule.trigger_on_source:
            if rule.trigger_on_source.lower() not in alert.source.lower():
                return False
                
        return True

    async def _execute_action(self, alert: Alert, rule: PlaybookRule) -> None:
        status = "executed"
        result_msg = ""
        
        try:
            if rule.action_type == ActionType.CREATE_INCIDENT:
                result_msg = await self._action_create_incident(alert, rule)
            elif rule.action_type == ActionType.ISOLATE_ASSET:
                result_msg = await self._action_isolate_asset(alert, rule)
            elif rule.action_type == ActionType.SEND_WEBHOOK:
                result_msg = await self._action_send_webhook(alert, rule)
            else:
                result_msg = f"Action {rule.action_type.value} not fully implemented yet."
                
        except Exception as e:
            status = "failed"
            result_msg = str(e)
            logger.error(f"Failed to execute rule {rule.name}: {e}")

        # Record the action
        action_record = ResponseAction(
            status=status,
            result_message=result_msg,
            playbook_rule_id=rule.id,
            alert_id=alert.id,
            organization_id=alert.organization_id
        )
        self.db.add(action_record)
        # Flush to persist the action record immediately if part of a transaction
        await self.db.flush()

    async def _action_create_incident(self, alert: Alert, rule: PlaybookRule) -> str:
        # Check if alert is already part of an incident
        if alert.incident_id:
            return "Alert already mapped to an incident. Skipping creation."

        # Create new incident based on the alert
        new_incident = Incident(
            title=f"[Auto-escalated] {alert.title}",
            description=f"Automatically escalated from Alert by Playbook '{rule.name}'.\n\nOriginal Alert Details:\n{alert.description}",
            severity=alert.severity.value,
            status="open",
            organization_id=alert.organization_id
        )
        self.db.add(new_incident)
        await self.db.flush()
        
        # Link alert to the new incident
        alert.incident_id = new_incident.id
        return f"Created Incident {new_incident.id} and linked Alert."

    async def _action_isolate_asset(self, alert: Alert, rule: PlaybookRule) -> str:
        if not alert.asset_id:
            return "Cannot isolate: No asset linked to this alert."
            
        # In a real environment, this would call a firewall API, switch API, or endpoint agent
        # Example: call_cisco_ise_api(asset_mac, action="quarantine")
        
        return f"Asset {alert.asset_id} isolated from network via API instruction."

    async def _action_send_webhook(self, alert: Alert, rule: PlaybookRule) -> str:
        # Payload construction
        payload = {
            "alert_id": str(alert.id),
            "title": alert.title,
            "severity": alert.severity.value,
            "rule": rule.name
        }
        # A real system would use aiohttp to POST to rule.action_config JSON "url"
        return f"Webhook payload dispatched (Simulation): {json.dumps(payload)}"
