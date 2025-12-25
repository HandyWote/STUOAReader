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

def init_db() -> None:
    dim = cfg.embed_dim
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
        "CREATE INDEX IF NOT EXISTS idx_vectors_embedding_hnsw ON vectors USING hnsw (embedding vector_cosine_ops);",
    ]

    with get_connection() as conn, conn.cursor() as cur:
        for stmt in statements:
            cur.execute(stmt)
        conn.commit()


__all__ = ["db_session", "get_connection", "init_db"]
