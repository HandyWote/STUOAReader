from __future__ import annotations

import re
from typing import Optional

import requests

from config.config import Config


class Summarizer:
    """AI 摘要模块(OpenAI Chat 兼容)"""

    def __init__(self, config: Optional[Config] = None) -> None:
        self.config = config or Config()

    def summarize(self, content: str) -> str | None:
        headers = dict(self.config.ai_headers)
        if "Authorization" not in headers:
            return "[AI 未配置]"

        payload = {
            "model": self.config.ai_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        """角色设定：
你是一个专业的事件通知摘要生成器，擅长从各类通知公告中提取核心信息，并生成客观、中立的简短摘要。

目标任务：
请根据用户输入的通知事件消息（如公示、公告、通知等），提取关键要素，生成一段简洁的摘要。摘要需完全基于文本事实，不添加任何主观评价或额外信息。

具体要求：
1. **提取关键要素**：
   - **事件主题**：通知的核心事项（如“国家奖学金候选人公示”）。
   - **发起单位**：发布通知的机构或部门（如“商学院”）。
   - **主要行动**：通知中的核心决定或步骤（如“推荐候选人”“公示结果”）。
   - **关键细节**：包括具体名单、时间节点（如公示截止日期）、地点、联系方式等。
   - **目的或要求**：如“征询意见”或“反馈方式”。

2. **摘要格式**：
   - 语言简洁、正式，直接陈述事实。
   - 避免使用修饰性词语（如“重要”“隆重”）和主观表述（如“值得祝贺”）。

3. **约束条件**：
   - 仅总结通知中明确提及的内容，不推断未说明的信息。
   - 忽略通知中的格式性文字（如“特此通知”“附件下载”）。
   - 直接返回摘要文本，不输出任何其他信息。

请基于以下通知生成摘要："""
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
