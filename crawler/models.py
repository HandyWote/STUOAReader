"""爬虫模块数据模型定义。

该模块定义了爬虫过程中使用的所有数据模型，用于在各个模块之间传递数据。
使用 dataclasses 装饰器简化数据类的定义和使用。

主要数据模型：
- ArticleMeta：文章元数据（从列表页获取的基本信息）
- DetailResult：文章详情结果（从详情页获取的内容和附件）
- ArticleRecord：完整文章记录（包含所有信息，用于存储到数据库）
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Optional


@dataclass
class ArticleMeta:
    """文章元数据类。
    
    存储从文章列表页获取的基本信息，用于标识和定位文章。
    """
    title: str  # 文章标题
    unit: str  # 发布单位
    link: str  # 文章详情页链接
    published_on: str  # 发布日期，格式为 YYYY-MM-DD


@dataclass
class DetailResult:
    """文章详情结果类。
    
    存储从文章详情页获取的内容和附件信息。
    """
    content: str  # 文章内容（纯文本）
    attachments: List[dict[str, str]]  # 附件列表，每个附件包含名称和链接


@dataclass
class ArticleRecord:
    """完整文章记录类。
    
    存储完整的文章信息，包括元数据、内容、摘要和附件，用于存储到数据库。
    """
    title: str  # 文章标题
    unit: str  # 发布单位
    link: str  # 文章详情页链接
    published_on: str  # 发布日期，格式为 YYYY-MM-DD
    content: str  # 文章内容（纯文本）
    summary: str  # 文章摘要（AI 生成）
    attachments: List[dict[str, str]]  # 附件列表，每个附件包含名称和链接


# 模块公开的 API，仅导出这三个数据类
__all__ = ["ArticleMeta", "DetailResult", "ArticleRecord"]
