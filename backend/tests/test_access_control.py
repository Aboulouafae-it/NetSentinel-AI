from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services.access_control import Role, assert_same_organization, can_manage, require_organization_scope


def test_organization_isolation_allows_same_org():
    org_id = uuid4()

    assert_same_organization(org_id, str(org_id))


def test_organization_isolation_rejects_cross_org():
    with pytest.raises(HTTPException) as exc:
        assert_same_organization(uuid4(), uuid4())

    assert exc.value.status_code == 403


def test_organization_scope_is_required_for_scoped_routes():
    with pytest.raises(HTTPException) as exc:
        require_organization_scope(None)

    assert exc.value.status_code == 403


def test_rbac_foundation_manage_roles():
    assert can_manage(Role.ADMIN)
    assert can_manage(Role.TECHNICIAN)
    assert not can_manage(Role.VIEWER)
