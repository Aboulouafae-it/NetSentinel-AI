"""
NetSentinel AI — AI Analysis Engine (Phase 5)

Provides context-aware incident/alert analysis using the Gemini API.
Falls back to rich keyword-based responses when no API key is set.
"""

import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional

from app.config import get_settings
from app.models.alert import Alert
from app.models.incident import Incident
from app.models.log import LogEntry


settings = get_settings()


class AIAnalysisEngine:
    """Wraps Gemini (or fallback) to produce contextual security analysis."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._use_gemini = bool(settings.gemini_api_key)

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def analyze_incident(self, incident_id: str) -> dict:
        """Return an AI-generated analysis for a given incident."""
        incident, alerts, recent_logs = await self._fetch_incident_context(incident_id)
        if not incident:
            return {"error": "Incident not found"}

        context_text = self._build_incident_context(incident, alerts, recent_logs)
        prompt = (
            f"You are NetSentinel AI, a cybersecurity analyst assistant.\n"
            f"Analyze the following security incident and provide:\n"
            f"1. A concise executive summary (2-3 sentences)\n"
            f"2. Root cause hypothesis\n"
            f"3. Immediate remediation steps (numbered list)\n"
            f"4. Long-term hardening recommendations\n\n"
            f"=== INCIDENT CONTEXT ===\n{context_text}"
        )

        analysis_text = await self._generate(prompt)
        return {
            "incident_id": incident_id,
            "incident_title": incident.title,
            "severity": incident.severity.value,
            "status": incident.status.value,
            "analysis": analysis_text,
            "context_used": {
                "alerts_count": len(alerts),
                "logs_count": len(recent_logs),
            },
        }

    async def analyze_alert(self, alert_id: str) -> dict:
        """Return an AI-generated explanation for a single alert."""
        result = await self.db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalar_one_or_none()
        if not alert:
            return {"error": "Alert not found"}

        prompt = (
            f"You are NetSentinel AI, a cybersecurity analyst assistant.\n"
            f"Explain this security alert and suggest immediate actions:\n\n"
            f"Alert Title: {alert.title}\n"
            f"Severity: {alert.severity.value.upper()}\n"
            f"Source: {alert.source or 'Unknown'}\n"
            f"Rule Triggered: {alert.rule_name or 'N/A'}\n"
            f"Description: {alert.description or 'No description'}\n\n"
            f"Provide:\n"
            f"1. What this alert means in plain language\n"
            f"2. Likely causes\n"
            f"3. Immediate response actions"
        )

        analysis_text = await self._generate(prompt)
        return {
            "alert_id": alert_id,
            "alert_title": alert.title,
            "severity": alert.severity.value,
            "analysis": analysis_text,
        }

    async def chat(self, message: str) -> dict:
        """General-purpose chat with network/security context."""
        prompt = (
            f"You are NetSentinel AI, an expert AI assistant embedded in a "
            f"network observability and cybersecurity platform.\n"
            f"Answer concisely and practically. Focus on actionable advice.\n\n"
            f"User question: {message}"
        )
        response = await self._generate(prompt)
        return {"response": response}

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _fetch_incident_context(self, incident_id: str):
        result = await self.db.execute(
            select(Incident).where(Incident.id == incident_id)
        )
        incident = result.scalar_one_or_none()
        if not incident:
            return None, [], []

        alerts_result = await self.db.execute(
            select(Alert)
            .where(Alert.incident_id == incident.id)
            .order_by(desc(Alert.created_at))
            .limit(10)
        )
        alerts = alerts_result.scalars().all()

        logs_result = await self.db.execute(
            select(LogEntry)
            .where(LogEntry.organization_id == incident.organization_id)
            .order_by(desc(LogEntry.timestamp))
            .limit(20)
        )
        recent_logs = logs_result.scalars().all()
        return incident, alerts, recent_logs

    def _build_incident_context(self, incident, alerts, logs) -> str:
        parts = [
            f"Title: {incident.title}",
            f"Severity: {incident.severity.value.upper()}",
            f"Status: {incident.status.value}",
            f"Description: {incident.description or 'None'}",
            f"\n--- Related Alerts ({len(alerts)}) ---",
        ]
        for a in alerts[:5]:
            parts.append(f"  [{a.severity.value.upper()}] {a.title} (source: {a.source})")

        parts.append(f"\n--- Recent Log Samples ({len(logs)}) ---")
        for l in logs[:8]:
            parts.append(f"  [{l.level.value.upper()}] {l.source}: {l.message[:120]}")
        return "\n".join(parts)

    async def _generate(self, prompt: str) -> str:
        """Call Gemini API if key is set, otherwise use rich fallback."""
        if self._use_gemini:
            return await self._call_gemini(prompt)
        return self._fallback_response(prompt)

    async def _call_gemini(self, prompt: str) -> str:
        """Call the Gemini REST API."""
        try:
            import httpx
            api_key = settings.gemini_api_key
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/"
                f"models/gemini-1.5-flash:generateContent?key={api_key}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024},
            }
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(url, json=payload)
                r.raise_for_status()
                data = r.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            return f"[Gemini API Error: {e}]\n\n{self._fallback_response(prompt)}"

    def _fallback_response(self, prompt: str) -> str:
        p = prompt.lower()
        if "incident" in p and "analyz" in p:
            return (
                "**Executive Summary**\nThis incident represents a potentially significant security event "
                "requiring immediate investigation. Multiple alerts have been correlated.\n\n"
                "**Root Cause Hypothesis**\nBased on the alert patterns, this may indicate an active "
                "intrusion attempt, misconfiguration, or a compromised internal host acting as a "
                "pivot point.\n\n"
                "**Immediate Remediation Steps**\n"
                "1. Isolate affected assets from the network segment\n"
                "2. Capture memory dumps and system logs from impacted hosts\n"
                "3. Block suspicious source IPs at the perimeter firewall\n"
                "4. Rotate credentials for any accounts active during the incident window\n"
                "5. Escalate to the security team if not already engaged\n\n"
                "**Long-Term Hardening**\n"
                "• Deploy endpoint detection and response (EDR) on all servers\n"
                "• Enforce network segmentation with strict east-west traffic controls\n"
                "• Enable multi-factor authentication for all administrative access\n"
                "• Schedule quarterly penetration testing"
            )
        if "alert" in p and "explain" in p:
            return (
                "**What This Alert Means**\nThis alert was triggered because the system detected "
                "anomalous behavior matching a known threat pattern or detection rule.\n\n"
                "**Likely Causes**\n"
                "• Unauthorized access attempt from an external source\n"
                "• Misconfigured service exposing sensitive functionality\n"
                "• Compromised internal credential being reused\n\n"
                "**Immediate Response Actions**\n"
                "1. Verify the source IP against your known-good asset list\n"
                "2. Check the affected asset's authentication logs for the past 24 hours\n"
                "3. If suspicious, block the source at the firewall and acknowledge the alert\n"
                "4. Open an incident if multiple similar alerts are observed"
            )
        # Generic chat fallback
        if "ssh" in p or "brute" in p:
            return (
                "SSH brute-force attacks attempt to guess credentials through repeated login attempts. "
                "Mitigate by: (1) disabling password auth in favor of SSH keys, "
                "(2) enabling Fail2Ban or equivalent rate-limiting, "
                "(3) moving SSH to a non-standard port, "
                "(4) restricting SSH access via firewall rules to trusted IP ranges only."
            )
        if "ransomware" in p:
            return (
                "If ransomware is suspected: (1) immediately isolate affected systems, "
                "(2) do NOT pay the ransom, (3) restore from clean backups, "
                "(4) identify the initial infection vector (usually phishing or exposed RDP), "
                "(5) notify relevant parties per your incident response plan."
            )
        return (
            "I'm NetSentinel AI — your network security copilot. I can analyze incidents, "
            "explain alerts, and provide remediation guidance. "
            "Try asking me to analyze a specific incident or alert, or ask about "
            "topics like 'SSH brute force', 'ransomware', 'network segmentation', or 'firewall rules'.\n\n"
            "*Tip: Set the GEMINI_API_KEY environment variable to enable full AI-powered responses.*"
        )
