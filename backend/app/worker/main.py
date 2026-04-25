"""
NetSentinel AI — Background Worker Entrypoint
Uses ARQ (Async Redis Queue) for fast, async-native background tasks.
"""

from arq import worker
from arq.connections import RedisSettings
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def startup(ctx):
    logger.info("Worker started.")
    # Initialize DB connections if needed


async def shutdown(ctx):
    logger.info("Worker shutting down.")


async def process_telemetry_batch(ctx, batch_data: list):
    """Placeholder task for processing queued telemetry."""
    logger.info(f"Processing batch of {len(batch_data)} telemetry records.")


async def evaluate_alert_rules(ctx):
    """Placeholder task for cron-like alert evaluation."""
    logger.info("Evaluating alert rules.")


class WorkerSettings:
    functions = [process_telemetry_batch]
    cron_jobs = [] # Add cron jobs for periodic tasks (e.g. ARQ cron)
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = startup
    on_shutdown = shutdown
