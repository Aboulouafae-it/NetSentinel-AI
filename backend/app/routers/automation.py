"""
NetSentinel AI — Automation Router
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.automation import PlaybookRule, ResponseAction
from app.models.user import User
from app.security.auth import get_current_active_user

router = APIRouter(prefix="/automation", tags=["Automation"])


@router.get("/playbooks")
async def list_playbooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all playbook rules for the organization."""
    query = select(PlaybookRule).where(
        PlaybookRule.organization_id == current_user.organization_id
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/actions")
async def list_response_actions(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List recent automated actions taken by the Response Engine."""
    query = select(ResponseAction).where(
        ResponseAction.organization_id == current_user.organization_id
    ).order_by(desc(ResponseAction.created_at)).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()
