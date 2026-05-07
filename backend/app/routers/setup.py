"""First-run setup endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.security import create_access_token, create_refresh_token, hash_password

router = APIRouter(prefix="/setup", tags=["Setup"])


class SetupStatusResponse(BaseModel):
    initialized: bool
    organizations: int
    users: int


class FirstRunSetupRequest(BaseModel):
    organization_name: str = Field(min_length=1, max_length=255)
    admin_email: EmailStr
    admin_full_name: str = Field(min_length=1, max_length=255)
    admin_password: str = Field(min_length=12, max_length=128)


class FirstRunSetupResponse(BaseModel):
    organization_id: str
    user_id: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


async def setup_counts(db: AsyncSession) -> tuple[int, int]:
    org_count = await db.scalar(select(func.count()).select_from(Organization))
    user_count = await db.scalar(select(func.count()).select_from(User))
    return int(org_count or 0), int(user_count or 0)


@router.get("/status", response_model=SetupStatusResponse)
async def setup_status(db: AsyncSession = Depends(get_db)):
    org_count, user_count = await setup_counts(db)
    return SetupStatusResponse(initialized=org_count > 0 and user_count > 0, organizations=org_count, users=user_count)


@router.post("/first-run", response_model=FirstRunSetupResponse, status_code=status.HTTP_201_CREATED)
async def first_run_setup(payload: FirstRunSetupRequest, db: AsyncSession = Depends(get_db)):
    org_count, user_count = await setup_counts(db)
    if org_count > 0 or user_count > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="System is already initialized")

    organization = Organization(name=payload.organization_name, contact_email=payload.admin_email)
    db.add(organization)
    await db.flush()

    user = User(
        email=payload.admin_email,
        full_name=payload.admin_full_name,
        hashed_password=hash_password(payload.admin_password),
        role=UserRole.ADMIN,
        organization_id=organization.id,
        is_active=True,
        is_superuser=True,
    )
    db.add(user)
    await db.flush()

    return FirstRunSetupResponse(
        organization_id=str(organization.id),
        user_id=str(user.id),
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )
