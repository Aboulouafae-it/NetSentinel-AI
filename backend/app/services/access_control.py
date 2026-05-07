"""
Access-control helpers for organization isolation and future RBAC.

This is a foundation module. Routers should progressively adopt these helpers
when endpoints become authenticated and tenant-scoped.
"""

from enum import Enum
from uuid import UUID

from fastapi import HTTPException, status


class Role(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    TECHNICIAN = "technician"
    VIEWER = "viewer"


def assert_same_organization(user_org_id: UUID | str | None, resource_org_id: UUID | str | None) -> None:
    """Reject access when a user and resource belong to different organizations."""
    if user_org_id is None or resource_org_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization scope is required",
        )
    if str(user_org_id) != str(resource_org_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resource belongs to a different organization",
        )


def require_organization_scope(user_org_id: UUID | str | None) -> None:
    """Reject authenticated users that are not bound to an organization."""
    if user_org_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to an organization",
        )


def can_manage(role: Role) -> bool:
    """Return whether a role can create/update operational records."""
    return role in {Role.ADMIN, Role.ANALYST, Role.TECHNICIAN}
