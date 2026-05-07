"""Edge agent token helpers."""

import hashlib
import hmac
import secrets


def generate_agent_token() -> str:
    return secrets.token_urlsafe(32)


def hash_agent_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_agent_token(token: str, token_hash: str) -> bool:
    return hmac.compare_digest(hash_agent_token(token), token_hash)
