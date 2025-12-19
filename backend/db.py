from __future__ import annotations

import contextlib

import psycopg
from psycopg.rows import dict_row

from backend.config import Config


cfg = Config()


def get_connection() -> psycopg.Connection:
    if not cfg.database_url:
        raise RuntimeError("DATABASE_URL 未配置，无法连接数据库")
    return psycopg.connect(cfg.database_url, row_factory=dict_row, connect_timeout=5)


@contextlib.contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


__all__ = ["db_session", "get_connection"]
