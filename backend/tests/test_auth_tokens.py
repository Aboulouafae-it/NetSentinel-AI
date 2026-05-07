from app.security import create_access_token, create_refresh_token, decode_access_token, decode_refresh_token


def test_access_token_round_trip():
    token = create_access_token({"sub": "user-123"})

    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"


def test_refresh_token_is_not_accepted_as_access_token():
    token = create_refresh_token({"sub": "user-123"})

    assert decode_access_token(token) is None
    assert decode_refresh_token(token)["sub"] == "user-123"
