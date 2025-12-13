from __future__ import annotations

from typing import Any, Iterable, List

import psycopg

from crawler.db import db_session, fetch_article_ids, fetch_existing_links, init_db, insert_articles, insert_embeddings
from crawler.models import ArticleRecord


class ArticleRepository:
    """Postgres-backed repository."""

    def __init__(self) -> None:
        pass

    def ensure_schema(self, conn: psycopg.Connection) -> None:
        init_db(conn)

    def existing_links(self, conn: psycopg.Connection, target_date: str) -> set[str]:
        return fetch_existing_links(conn, target_date)

    def insert_articles(self, conn: psycopg.Connection, records: Iterable[ArticleRecord]) -> int:
        return insert_articles(conn, records)

    def fetch_for_embedding(self, conn: psycopg.Connection, links: List[str]) -> List[dict[str, Any]]:
        return fetch_article_ids(conn, links)

    def insert_embeddings(self, conn: psycopg.Connection, payloads: Iterable[dict[str, Any]]) -> int:
        return insert_embeddings(conn, payloads)
