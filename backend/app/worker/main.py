"""
NetSentinel AI — Background Worker Entrypoint
Uses ARQ (Async Redis Queue) for fast, async-native background tasks.
"""

from arq import worker
from arq.connections import RedisSettings
import logging
from app.config import get_settings

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


async def scheduled_polling_tick(ctx):
    """Worker entrypoint for future scheduled polling.

    v0.6 keeps this as a bounded service hook; production scheduling should
    provide organization IDs and concurrency controls from persistent config.
    """
    logger.info("Scheduled polling tick requested.")


class WorkerSettings:
    functions = [process_telemetry_batch, scheduled_polling_tick]
    cron_jobs = [] # Add cron jobs for periodic tasks (e.g. ARQ cron)
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    on_startup = startup
    on_shutdown = shutdown
