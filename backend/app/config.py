"""
NetSentinel AI — Application Settings

Centralized configuration using pydantic-settings.
All values are loaded from environment variables with sensible defaults.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Application ---
    app_name: str = "NetSentinel AI"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    # --- Database ---
    database_url: str = "postgresql+asyncpg://netsentinel:netsentinel_dev_password@localhost:5432/netsentinel"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Security ---
    secret_key: str = "dev-secret-key-change-in-production-immediately"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # --- AI ---
    gemini_api_key: str = ""  # Set GEMINI_API_KEY env var to enable real AI responses

    # --- CORS ---
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance. Call this instead of constructing Settings directly."""
    return Settings()
