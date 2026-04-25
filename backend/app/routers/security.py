"""
NetSentinel AI — Security Router
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.security import DetectionRule, IndicatorOfCompromise
from app.schemas.security import DetectionRuleCreate, DetectionRuleRead, IOCCreate, IOCRead
from app.models.user import User
from app.security.auth import get_current_active_user

router = APIRouter(prefix="/security", tags=["Security"])


@router.post("/rules", response_model=DetectionRuleRead, status_code=status.HTTP_201_CREATED)
async def create_detection_rule(
    rule_in: DetectionRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.is_superuser and rule_in.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    rule_obj = DetectionRule(**rule_in.model_dump())
    db.add(rule_obj)
    await db.commit()
    await db.refresh(rule_obj)
    return rule_obj


@router.get("/rules", response_model=list[DetectionRuleRead])
async def list_detection_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(DetectionRule).where(DetectionRule.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/iocs", response_model=IOCRead, status_code=status.HTTP_201_CREATED)
async def create_ioc(
    ioc_in: IOCCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.is_superuser and ioc_in.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    ioc_obj = IndicatorOfCompromise(**ioc_in.model_dump())
    db.add(ioc_obj)
    await db.commit()
    await db.refresh(ioc_obj)
    return ioc_obj


@router.get("/iocs", response_model=list[IOCRead])
async def list_iocs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(IndicatorOfCompromise).where(IndicatorOfCompromise.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    return result.scalars().all()
