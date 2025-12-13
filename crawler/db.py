from __future__ import annotations

import contextlib
from typing import Any, Iterable

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json

from config.config import Config
from crawler.models import ArticleRecord


def get_connection() -> psycopg.Connection:
    cfg = Config()
    if not cfg.database_url:
        raise RuntimeError("DATABASE_URL 未配置，无法连接数据库")
    return psycopg.connect(cfg.database_url, row_factory=dict_row)


def init_db(conn: psycopg.Connection) -> None:
    """Create required tables if missing."""
    dim = Config().embed_dim
    statements = [
        "CREATE EXTENSION IF NOT EXISTS vector;",
        """
        CREATE TABLE IF NOT EXISTS articles (
            id BIGSERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            unit TEXT,
            link TEXT NOT NULL UNIQUE,
            published_on DATE NOT NULL,
            content TEXT NOT NULL,
            summary TEXT NOT NULL,
            attachments JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_articles_published_on ON articles (published_on);",
        f"""
        CREATE TABLE IF NOT EXISTS vectors (
            id BIGSERIAL PRIMARY KEY,
            article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
            embedding vector({dim}),
            published_on DATE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_vectors_published_on ON vectors (published_on);",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_vectors_article ON vectors(article_id);",
    ]
    with conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)
    conn.commit()


def fetch_existing_links(conn: psycopg.Connection, target_date: str) -> set[str]:
    sql = "SELECT link FROM articles WHERE published_on = %s"
    with conn.cursor() as cur:
        cur.execute(sql, (target_date,))
        rows = cur.fetchall()
    return {row["link"] for row in rows}


def insert_articles(conn: psycopg.Connection, records: Iterable[ArticleRecord]) -> int:
    sql = """
    INSERT INTO articles (title, unit, link, published_on, content, summary, attachments)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (link) DO NOTHING
    """
    count = 0
    with conn.cursor() as cur:
        for rec in records:
            cur.execute(
                sql,
                (
                    rec.title,
                    rec.unit,
                    rec.link,
                    rec.published_on,
                    rec.content,
                    rec.summary,
                    Json(rec.attachments),
                ),
            )
            count += cur.rowcount
    conn.commit()
    return count


def fetch_article_ids(conn: psycopg.Connection, links: list[str]) -> list[dict[str, Any]]:
    if not links:
        return []
    sql = "SELECT id, link, title, summary, content, published_on FROM articles WHERE link = ANY(%s)"
    with conn.cursor() as cur:
        cur.execute(sql, (links,))
        rows = cur.fetchall()
    return list(rows)


def insert_embeddings(conn: psycopg.Connection, payloads: Iterable[dict[str, Any]]) -> int:
    sql = """
    INSERT INTO vectors (article_id, embedding, published_on)
    VALUES (%(article_id)s, %(embedding)s::vector, %(published_on)s)
    ON CONFLICT (article_id) DO NOTHING
    """
    count = 0
    with conn.cursor() as cur:
        for item in payloads:
            cur.execute(sql, item)
            count += cur.rowcount
    conn.commit()
    return count


@contextlib.contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
