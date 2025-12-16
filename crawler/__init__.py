"""OA 系统增量爬取的爬虫包。

这个包提供了 OA 系统文章的增量爬取功能，包括文章获取、解析、摘要生成和存储等完整流程。
"""

from .pipeline import Crawler

__all__ = ["Crawler"]  # 包的公共 API，仅导出 Crawler 类
