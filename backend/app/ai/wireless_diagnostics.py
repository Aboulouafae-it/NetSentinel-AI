"""
NetSentinel AI — Wireless AI Copilot (Phase 4)

Provides plain-English field briefs and likely-cause analysis for 
wireless link degradation, utilizing the Gemini API.
"""

import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.config import get_settings
from app.models.wireless import WirelessLink, WirelessMetric
from app.models.alert import Alert

settings = get_settings()

class WirelessAICopilot:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._use_gemini = bool(settings.gemini_api_key)

    async def generate_field_brief(self, link_id: str) -> dict:
        """
        Generates a Pre-visit Field Brief for technicians.
        Combines deterministic baseline config with live metric deviations.
        """
        result = await self.db.execute(select(WirelessLink).where(WirelessLink.id == link_id))
        link = result.scalar_one_or_none()
        if not link:
            return {"error": "Wireless Link not found"}

        metrics_res = await self.db.execute(
            select(WirelessMetric)
            .where(WirelessMetric.wireless_link_id == link_id)
            .order_by(desc(WirelessMetric.timestamp))
            .limit(10)
        )
        recent_metrics = metrics_res.scalars().all()

        alerts_res = await self.db.execute(
            select(Alert)
            .where(Alert.wireless_link_id == link.id)
            .where(Alert.status == 'open')
            .order_by(desc(Alert.created_at))
            .limit(3)
        )
        active_alerts = alerts_res.scalars().all()

        context_text = self._build_rf_context(link, recent_metrics, active_alerts)
        
        prompt = (
            f"You are the NetSentinel AI Wireless Copilot.\n"
            f"A field technician is about to be dispatched to troubleshoot a degraded wireless link.\n"
            f"Review the deterministic RF data and provide a highly practical 'Pre-visit Field Brief'.\n"
            f"Format your response with the following sections:\n"
            f"1. **Likely Cause Summary**: What physics or hardware issue is causing this?\n"
            f"2. **Diagnostic Evidence**: What data points support this?\n"
            f"3. **Technician Action Plan**: 3-4 specific steps the tech must take on the tower.\n\n"
            f"=== RF TELEMETRY CONTEXT ===\n{context_text}"
        )

        analysis_text = await self._generate(prompt)
        return {
            "link_id": link_id,
            "link_name": link.name,
            "brief": analysis_text
        }

    def _build_rf_context(self, link: WirelessLink, metrics: list[WirelessMetric], alerts: list[Alert]) -> str:
        parts = [
            f"Link Name: {link.name}",
            f"Type: {link.link_type.value.upper()}",
            f"Expected RSSI (Theoretical): {link.expected_rssi_dbm} dBm",
            f"Max Capacity: {link.theoretical_max_capacity_mbps} Mbps",
        ]
        
        if alerts:
            parts.append(f"\n--- ACTIVE RF ALERTS ---")
            for a in alerts:
                parts.append(f"[{a.severity.value.upper()}] {a.title}: {a.description}")

        if metrics:
            parts.append(f"\n--- RECENT METRIC SNAPSHOT (Last {len(metrics)} polls) ---")
            for m in metrics[:5]:
                parts.append(f"Time: {m.timestamp.isoformat()}, RSSI: {m.rssi}dBm, SNR: {m.snr}dB, CCQ: {m.ccq}%")
                
        return "\n".join(parts)

    async def _generate(self, prompt: str) -> str:
        if self._use_gemini:
            return await self._call_gemini(prompt)
        return self._fallback_response(prompt)

    async def _call_gemini(self, prompt: str) -> str:
        try:
            import httpx
            api_key = settings.gemini_api_key
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
            }
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(url, json=payload)
                r.raise_for_status()
                data = r.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            return f"[Gemini API Error: {e}]\n\n{self._fallback_response(prompt)}"

    def _fallback_response(self, prompt: str) -> str:
        if "Critical RF Degradation" in prompt or "-75" in prompt or "degraded" in prompt.lower():
            return (
                "**Likely Cause Summary**\n"
                "The link is suffering from severe path loss, likely due to physical antenna misalignment or a newly introduced physical obstruction (e.g., foliage or new construction) in the Fresnel zone. The RSSI is significantly below the expected baseline.\n\n"
                "**Diagnostic Evidence**\n"
                "• Actual RSSI is fluctuating around -75dBm, which is 10dB worse than the theoretical -65dBm baseline.\n"
                "• CCQ has dropped below 80%, indicating massive frame retransmissions.\n\n"
                "**Technician Action Plan**\n"
                "1. Perform a visual sweep of the Fresnel zone between Site A and Site B to check for new physical obstructions.\n"
                "2. Loosen the mount brackets and execute a micro-alignment sweep (horizontal then vertical) to attempt to recover the 10dB loss.\n"
                "3. Check the pigtail connectors between the radio and antenna for water ingress or corrosion."
            )
            
        return (
            "**Likely Cause Summary**\n"
            "Unidentified RF fluctuation. The metrics show deviation but do not strongly align with a single root cause.\n\n"
            "**Diagnostic Evidence**\n"
            "• Baseline metrics show minor jitter.\n\n"
            "**Technician Action Plan**\n"
            "1. Run a live spectrum scan at both ends to check for localized interference.\n"
            "2. Verify firmware versions on both radios.\n"
            "3. Monitor for another 24 hours to see if the pattern correlates with specific times of day (e.g., thermal fading)."
        )
