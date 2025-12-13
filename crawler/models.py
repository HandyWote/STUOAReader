from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Optional


@dataclass
class ArticleMeta:
    title: str
    unit: str
    link: str
    published_on: str  # YYYY-MM-DD


@dataclass
class DetailResult:
    content: str
    attachments: List[dict[str, str]]


@dataclass
class ArticleRecord:
    title: str
    unit: str
    link: str
    published_on: str
    content: str
    summary: str
    attachments: List[dict[str, str]]


__all__ = ["ArticleMeta", "DetailResult", "ArticleRecord"]
