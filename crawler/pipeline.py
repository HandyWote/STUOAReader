from __future__ import annotations

import datetime
import re
import time
from typing import Iterable, List

import requests

from config.config import Config
from crawler.db import (
    ArticleRecord,
    db_session,
    fetch_article_ids,
    fetch_existing_links,
    init_db,
    insert_articles,
    insert_embeddings,
)
from crawler.fetcher import fetch_detail, fetch_list


def _normalize_date(raw: str | None) -> str:
    if raw is None:
        return time.strftime("%Y-%m-%d", time.localtime())
    return datetime.datetime.strptime(raw, "%Y-%m-%d").strftime("%Y-%m-%d")


class Crawler:
    """Incremental crawler for OA (per-day, per-hour)."""

    def __init__(self, target_date: str | None = None) -> None:
        self.config = Config()
        self.target_date = _normalize_date(target_date)

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
            init_db(conn)
            existing_links = fetch_existing_links(conn, self.target_date)
            candidates = fetch_list(self.target_date)
            if not candidates:
                print("未获取到当天列表，结束")
                return

            new_items = [item for item in candidates if item["链接"] not in existing_links]
            print(f"列表总计 {len(candidates)} 条，新增 {len(new_items)} 条")
            if not new_items:
                return

            detailed: list[dict] = []
            for item in new_items:
                content, attachments = fetch_detail(item["链接"])
                if not content:
                    print(f"跳过 {item['链接']}，未获取到正文")
                    continue
                detailed.append(
                    {
                        "标题": item["标题"],
                        "发布单位": item["发布单位"],
                        "链接": item["链接"],
                        "发布日期": item["发布日期"],
                        "正文": content,
                        "附件": attachments,
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
            inserted = insert_articles(conn, records)
            print(f"入库完成，新增 {inserted} 条")

            # fetch ids for embedding
            links = [item["链接"] for item in detailed]
            articles = fetch_article_ids(conn, links)
            if not articles:
                return
            self._generate_embeddings(conn, articles)

    # ------------------------------------------------------------------ AI
    def _call_ai(self, content: str) -> str | None:
        headers = dict(self.config.ai_headers)
        if "Authorization" not in headers:
            print("AI API_KEY 未配置，跳过摘要生成")
            return "[AI 未配置]"

        payload = {
            "model": self.config.ai_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "你是一个专业的事件通知摘要生成器，擅长从各类通知公告中提取核心信息，生成客观、中立的简短摘要。"
                        "仅总结通知中明确的信息，返回纯文本摘要。"
                    ),
                },
                {"role": "user", "content": content},
            ],
            "stream": False,
            "temperature": 0.7,
            "max_tokens": 2000,
        }

        try:
            resp = requests.post(self.config.ai_base_url, json=payload, headers=headers, timeout=60)
            if resp.status_code != 200:
                print(f"AI API返回错误状态码: {resp.status_code}")
                return None
            data = resp.json()
            choices = data.get("choices") or []
            if not choices:
                return None
            text = choices[-1]["message"].get("content", "").strip()
            text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
            text = text.lstrip("# ").lstrip()
            return text
        except requests.RequestException as exc:
            print(f"调用AI失败: {exc}")
            return None

    def _fill_summaries(self, items: list[dict]) -> None:
        """Run AI summaries with batched retries."""
        remaining = list(items)
        max_retries = 3
        attempt = 0
        while remaining and attempt <= max_retries:
            failures: list[dict] = []
            for item in remaining:
                summary = self._call_ai(item["正文"])
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
        if not (cfg.embed_base_url and cfg.embed_model and cfg.embed_api_key):
            print("Embedding 配置缺失，跳过向量化")
            return None

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg.embed_api_key}",
        }
        payload = {
            "model": cfg.embed_model,
            "input": texts,
        }
        try:
            resp = requests.post(cfg.embed_base_url, json=payload, headers=headers, timeout=60)
            if resp.status_code != 200:
                print(f"Embedding API 状态码异常: {resp.status_code}")
                return None
            data = resp.json()
            items = data.get("data") or []
            embeddings: list[list[float]] = []
            for entry in items:
                emb = entry.get("embedding")
                if isinstance(emb, list):
                    embeddings.append(emb)
            if len(embeddings) != len(texts):
                print("Embedding 数量与输入不一致")
                return None
            return embeddings
        except requests.RequestException as exc:
            print(f"调用 Embedding 失败: {exc}")
            return None

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
        inserted = insert_embeddings(conn, payloads)
        print(f"向量入库完成，新增 {inserted} 条")
