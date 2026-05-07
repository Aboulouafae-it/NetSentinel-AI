"""
Compatibility auth dependencies for routers that import app.security.auth.

The canonical JWT helpers live in app.security and the shared FastAPI
dependency lives in app.dependencies. This module keeps router imports stable.
"""

from fastapi import Depends

from app.dependencies import get_current_user


async def get_current_active_user(current_user=Depends(get_current_user)):
    """Return the authenticated active user.

    get_current_user already rejects disabled accounts, so this wrapper exists
    to preserve the import path used by protected routers.
    """
    return current_user
