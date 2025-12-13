from __future__ import annotations

import datetime
import time
from typing import List

from config.config import Config
from crawler.embeddings import Embedder
from crawler.fetcher import fetch_detail, fetch_list
from crawler.models import ArticleRecord, ArticleMeta
from crawler.storage import ArticleRepository
from crawler.summarizer import Summarizer
from crawler.db import db_session


def _normalize_date(raw: str | None) -> str:
    if raw is None:
        return time.strftime("%Y-%m-%d", time.localtime())
    return datetime.datetime.strptime(raw, "%Y-%m-%d").strftime("%Y-%m-%d")


class Crawler:
    """Incremental crawler for OA (per-day, per-hour)."""

    def __init__(self, target_date: str | None = None) -> None:
        self.config = Config()
        self.target_date = _normalize_date(target_date)
        self.summarizer = Summarizer(self.config)
        self.embedder = Embedder(self.config)
        self.repo = ArticleRepository()

    def _within_hours(self) -> bool:
        now = datetime.datetime.now()
        if self.target_date != now.strftime("%Y-%m-%d"):
            return True
        return 7 <= now.hour < 24

    def run(self) -> None:
        if not self._within_hours():
            print("当前不在运行时段(07-24)，跳过执行")
            return

        print(f"开始增量抓取 {self.target_date} 的OA通知")
        with db_session() as conn:
            self.repo.ensure_schema(conn)
            existing_links = self.repo.existing_links(conn, self.target_date)
            candidates = fetch_list(self.target_date)
            if not candidates:
                print("未获取到当天列表，结束")
                return

            new_items = [item for item in candidates if item.link not in existing_links]
            print(f"列表总计 {len(candidates)} 条，新增 {len(new_items)} 条")
            if not new_items:
                return

            detailed: list[dict] = []
            for item in new_items:
                detail = fetch_detail(item.link)
                if not detail.content:
                    print(f"跳过 {item.link}，未获取到正文")
                    continue
                detailed.append(
                    {
                        "标题": item.title,
                        "发布单位": item.unit,
                        "链接": item.link,
                        "发布日期": item.published_on,
                        "正文": detail.content,
                        "附件": detail.attachments,
                    }
                )

            if not detailed:
                print("没有可处理的新文章")
                return

            self._fill_summaries(detailed)

            records = [
                ArticleRecord(
                    title=item["标题"],
                    unit=item["发布单位"],
                    link=item["链接"],
                    published_on=item["发布日期"],
                    content=item["正文"],
                    summary=item["摘要"],
                    attachments=item.get("附件", []),
                )
                for item in detailed
            ]
            inserted = self.repo.insert_articles(conn, records)
            print(f"入库完成，新增 {inserted} 条")

            # fetch ids for embedding
            links = [item["链接"] for item in detailed]
            articles = self.repo.fetch_for_embedding(conn, links)
            if not articles:
                return
            self._generate_embeddings(conn, articles)

    # ------------------------------------------------------------------ AI
    def _fill_summaries(self, items: list[dict]) -> None:
        """Run AI summaries with batched retries."""
        remaining = list(items)
        max_retries = 3
        attempt = 0
        while remaining and attempt <= max_retries:
            failures: list[dict] = []
            for item in remaining:
                summary = self.summarizer.summarize(item["正文"])
                if summary:
                    item["摘要"] = summary
                else:
                    failures.append(item)
            if not failures:
                break
            attempt += 1
            if attempt > max_retries:
                break
            remaining = failures
            if remaining:
                print(f"AI摘要失败 {len(remaining)} 条，开始第 {attempt} 次重试")

        for item in remaining:
            item["摘要"] = item.get("摘要") or "[AI摘要失败]"

    # ------------------------------------------------------------------ Embed
    def _compose_embed_text(self, article: dict) -> str:
        body = article.get("content") or ""
        summary = article.get("summary") or ""
        title = article.get("title") or ""
        combined = "\n".join([title, summary, body])
        return combined[:2000]

    def _call_embedding(self, texts: list[str]) -> list[list[float]] | None:
        cfg = self.config
        return self.embedder.embed_batch(texts)

    def _generate_embeddings(self, conn, articles: List[dict]) -> None:
        texts = [self._compose_embed_text(a) for a in articles]
        embeddings = self._call_embedding(texts)
        if not embeddings:
            return
        payloads = []
        for article, emb in zip(articles, embeddings):
            emb_str = "[" + ",".join(f"{x:.6f}" for x in emb) + "]"
            payloads.append(
                {
                    "article_id": article["id"],
                    "embedding": emb_str,
                    "published_on": article["published_on"],
                }
            )
        inserted = self.repo.insert_embeddings(conn, payloads)
        print(f"向量入库完成，新增 {inserted} 条")
