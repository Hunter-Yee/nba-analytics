# backend/redis_config.py
import os
import logging
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

logger = logging.getLogger("nba_analytics.redis")

raw_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_URL = raw_redis_url.strip('\'" \t\n\r')


async def init_redis_cache():
    """
    Initialize FastAPICache with Redis backend asynchronously.
    Includes graceful error handling if Redis server is unreachable.
    """
    try:
        redis_client = aioredis.from_url(
            REDIS_URL, 
            encoding="utf8", 
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0
        )
        # Test connection
        await redis_client.ping()
        FastAPICache.init(RedisBackend(redis_client), prefix="nba-cache:")
        logger.info(f"Successfully connected to Redis at {REDIS_URL}")
        return redis_client
    except Exception as e:
        logger.warning(f"Could not connect to Redis ({REDIS_URL}): {e}. Continuing without Redis caching.")
        return None
