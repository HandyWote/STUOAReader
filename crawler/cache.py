from __future__ import annotations

import logging

import redis

from datetime import datetime, timedelta

from crawler.config import Config


def clear_article_list_cache(target_date: str, logger: logging.Logger | None = None) -> int:
    cfg = Config()
    log = logger or logging.getLogger(__name__)

    if not cfg.redis_host:
        return 0

    client = redis.Redis(
        host=cfg.redis_host,
        port=cfg.redis_port,
        db=cfg.redis_db,
        password=cfg.redis_password,
        socket_timeout=3,
        decode_responses=True,
    )

    pattern = f"articles:list:{target_date}:*"
    deleted = 0
    try:
        keys = list(client.scan_iter(match=pattern))
        if keys:
            deleted = client.delete(*keys)
            log.info("redis cache cleared", extra={"pattern": pattern, "deleted": deleted})
        deleted += clear_outdated_list_cache(client, days=5, logger=log)
    except Exception as exc:
        log.warning("redis cache clear failed", extra={"pattern": pattern, "error": str(exc)})
    return deleted


def clear_outdated_list_cache(
    client: redis.Redis,
    days: int,
    logger: logging.Logger | None = None,
) -> int:
    log = logger or logging.getLogger(__name__)
    if days <= 0:
        return 0

    cutoff = datetime.now().date() - timedelta(days=days - 1)
    deleted = 0
    try:
        for key in client.scan_iter(match="articles:list:*"):
            parts = key.split(":")
            if len(parts) < 3:
                continue
            date_str = parts[2]
            try:
                date_value = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                continue
            if date_value < cutoff:
                if client.delete(key):
                    deleted += 1
        if deleted:
            log.info(
                "redis cache cleanup complete",
                extra={"deleted": deleted, "cutoff": cutoff.isoformat()},
            )
    except Exception as exc:
        log.warning("redis cache cleanup failed", extra={"error": str(exc)})
    return deleted
