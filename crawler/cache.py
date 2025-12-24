from __future__ import annotations

import logging

import redis

from datetime import datetime, date, timedelta
import json

from crawler.config import Config


DEFAULT_CACHE_DAYS = 3


def _serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_value(val) for key, val in value.items()}
    return value


def _serialize_row(row: dict) -> dict:
    return {key: _serialize_value(val) for key, val in row.items()}


def _build_redis_client(cfg: Config) -> redis.Redis:
    return redis.Redis(
        host=cfg.redis_host,
        port=cfg.redis_port,
        db=cfg.redis_db,
        password=cfg.redis_password,
        socket_timeout=3,
        decode_responses=True,
    )


def refresh_article_cache(
    articles: list[dict],
    target_date: str,
    logger: logging.Logger | None = None,
    days: int = DEFAULT_CACHE_DAYS,
) -> int:
    cfg = Config()
    log = logger or logging.getLogger(__name__)

    if not cfg.redis_host:
        return 0

    client = _build_redis_client(cfg)
    ttl_seconds = max(days, 1) * 86400

    serialized = [_serialize_row(item) for item in articles]
    list_payload = {
        "articles": [{k: v for k, v in item.items() if k != "content"} for item in serialized]
    }
    list_key = f"articles:list:{target_date}:none"

    updated = 0
    try:
        client.setex(
            list_key,
            ttl_seconds,
            json.dumps(list_payload, ensure_ascii=False),
        )
        updated += 1
        pipe = client.pipeline()
        for article in serialized:
            article_id = article.get("id")
            if article_id is None:
                continue
            detail_key = f"articles:detail:{article_id}"
            pipe.setex(
                detail_key,
                ttl_seconds,
                json.dumps(article, ensure_ascii=False),
            )
        results = pipe.execute()
        updated += sum(1 for result in results if result)
        log.info(
            "redis article cache refreshed",
            extra={"date": target_date, "list_key": list_key, "updated": updated},
        )
    except Exception as exc:
        log.warning(
            "redis article cache refresh failed",
            extra={"date": target_date, "error": str(exc)},
        )
    return updated


def clear_article_list_cache(target_date: str, logger: logging.Logger | None = None) -> int:
    cfg = Config()
    log = logger or logging.getLogger(__name__)

    if not cfg.redis_host:
        return 0

    client = _build_redis_client(cfg)

    pattern = f"articles:list:{target_date}:*"
    deleted = 0
    try:
        keys = list(client.scan_iter(match=pattern))
        if keys:
            deleted = client.delete(*keys)
            log.info("redis cache cleared", extra={"pattern": pattern, "deleted": deleted})
        deleted += clear_outdated_list_cache(client, days=DEFAULT_CACHE_DAYS, logger=log)
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
