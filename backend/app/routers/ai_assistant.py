"""
NetSentinel AI — AI Assistant Router (Phase 5 — Upgraded)

Replaces the MVP placeholder with a full AI analysis API backed
by the AIAnalysisEngine (Gemini or rich fallback).
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.ai.analysis_engine import AIAnalysisEngine
from app.models.user import User
from app.security.auth import get_current_active_user

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    timestamp: str
    powered_by: str = "NetSentinel AI (Gemini)"


@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a message to the AI Copilot and get a contextual response."""
    engine = AIAnalysisEngine(db)
    result = await engine.chat(message.message)
    return ChatResponse(
        response=result["response"],
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/analyze/incident/{incident_id}")
async def analyze_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Request a full AI-powered analysis of an incident."""
    engine = AIAnalysisEngine(db)
    return await engine.analyze_incident(incident_id)


@router.get("/analyze/alert/{alert_id}")
async def analyze_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Request an AI-powered explanation for a specific alert."""
    engine = AIAnalysisEngine(db)
    return await engine.analyze_alert(alert_id)


@router.get("/capabilities")
async def get_capabilities():
    """List AI assistant capabilities."""
    from app.config import get_settings
    settings = get_settings()
    ai_mode = "Gemini 1.5 Flash (Live)" if settings.gemini_api_key else "Rich Fallback (Set GEMINI_API_KEY to enable)"
    return {
        "version": "0.5.0",
        "status": "active",
        "ai_mode": ai_mode,
        "capabilities": [
            "Incident deep-dive analysis",
            "Alert explanation and triage guidance",
            "Contextual chat with security Q&A",
            "Remediation step generation",
            "Root cause hypothesis",
        ],
        "endpoints": {
            "chat": "POST /api/v1/ai-assistant/chat",
            "analyze_incident": "GET /api/v1/ai-assistant/analyze/incident/{id}",
            "analyze_alert": "GET /api/v1/ai-assistant/analyze/alert/{id}",
        },
    }
