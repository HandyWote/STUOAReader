"""Entrypoint that runs the OA spider and sends the digest email."""

from __future__ import annotations

import argparse
from datetime import datetime

from crawler import Crawler


def _normalize_target_date(raw: str | None) -> str:
    if raw is None:
        return datetime.now().strftime("%Y-%m-%d")
    try:
        parsed = datetime.strptime(raw, "%Y-%m-%d")
    except ValueError as exc:  # pragma: no cover - defensive
        raise ValueError("日期格式必须为 YYYY-MM-DD") from exc
    return parsed.strftime("%Y-%m-%d")


def main(target_date: str | None = None) -> None:
    date_str = _normalize_target_date(target_date)
    print(f"计划处理 {date_str} 的OA通知")
    crawler = Crawler(target_date=date_str)
    crawler.run()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="抓取OA通知并发送邮件")
    parser.add_argument("--date", help="指定目标日期，默认使用昨天 (YYYY-MM-DD)")
    args = parser.parse_args()

    try:
        main(target_date=args.date)
    except ValueError as exc:
        print(exc)
