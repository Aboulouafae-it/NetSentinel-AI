"""
NetSentinel AI — Application Settings

Centralized configuration using pydantic-settings.
All values are loaded from environment variables with sensible defaults.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Application ---
    app_name: str = "NetSentinel AI"
    app_version: str = "1.0.0"
    build_date: str = ""
    edition: str = "appliance"
    git_commit: str = ""
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
    edge_agent_tokens: str = "dev-agent:dev-agent-token-change-me"
    telemetry_max_clock_skew_seconds: int = 300

    # --- Appliance paths ---
    appliance_root: str = "/opt/netsentinel"
    backup_dir: str = "/opt/netsentinel/backups"
    reports_dir: str = "/opt/netsentinel/reports"
    appliance_log_dir: str = "/var/log/netsentinel"
    appliance_data_dir: str = "/var/lib/netsentinel"

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
        "extra": "ignore",
    }

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str) and value.lower() in {"release", "production", "prod", "false", "0", "no"}:
            return False
        return value

    @property
    def uses_unsafe_dev_secret(self) -> bool:
        """True when the default development JWT secret is still configured."""
        return self.secret_key == "dev-secret-key-change-in-production-immediately"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod", "release"}

    def production_config_errors(self) -> list[str]:
        """Return unsafe production configuration findings."""
        if not self.is_production:
            return []
        errors: list[str] = []
        if self.uses_unsafe_dev_secret:
            errors.append("SECRET_KEY must be changed from the development default")
        if self.debug:
            errors.append("DEBUG must be false in production")
        if not self.database_url:
            errors.append("DATABASE_URL is required")
        if not self.redis_url:
            errors.append("REDIS_URL is required")
        if any(origin == "*" or "localhost" in origin or "127.0.0.1" in origin for origin in self.cors_origins):
            errors.append("CORS origins must be explicit production appliance origins")
        if "dev-agent-token-change-me" in self.edge_agent_tokens:
            errors.append("EDGE_AGENT_TOKENS must not use the development token")
        return errors


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance. Call this instead of constructing Settings directly."""
    return Settings()
