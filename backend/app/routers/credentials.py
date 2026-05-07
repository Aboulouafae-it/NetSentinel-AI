"""Credential profile router."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.credential import CredentialProfile
from app.models.user import User
from app.schemas.credential import CredentialProfileCreate, CredentialProfileResponse, credential_response

router = APIRouter(prefix="/credentials", tags=["Credentials"])


@router.get("/", response_model=list[CredentialProfileResponse])
async def list_credentials(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(CredentialProfile).where(CredentialProfile.organization_id == current_user.organization_id).order_by(CredentialProfile.name))
    return [credential_response(profile) for profile in result.scalars().all()]


@router.post("/", response_model=CredentialProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_credential(data: CredentialProfileCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = CredentialProfile(**data.model_dump(), organization_id=current_user.organization_id)
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return credential_response(profile)


@router.get("/{credential_id}", response_model=CredentialProfileResponse)
async def get_credential(credential_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await db.scalar(select(CredentialProfile).where(CredentialProfile.id == credential_id, CredentialProfile.organization_id == current_user.organization_id))
    if not profile:
        raise HTTPException(status_code=404, detail="Credential profile not found")
    return credential_response(profile)
