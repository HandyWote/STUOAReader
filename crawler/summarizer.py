"""OA 系统文章 AI 摘要生成模块。

该模块负责使用 AI 模型（OpenAI Chat 兼容）为爬取到的 OA 系统文章生成摘要。
它实现了与 AI API 的交互，并提供了摘要生成的功能，支持配置化的 AI 参数设置。
"""

from __future__ import annotations

import re
from typing import Optional

import requests

from config.config import Config


class Summarizer:
    """AI 摘要生成器类。
    
    用于生成 OA 系统文章的 AI 摘要，基于 OpenAI Chat API 兼容接口。
    实现了完整的 AI 摘要生成流程，包括请求构建、API 调用和响应处理。
    """

    def __init__(self, config: Optional[Config] = None) -> None:
        """初始化摘要生成器。
        
        参数：
            config: 配置对象，包含 AI API 的相关配置（如 API 地址、模型名称、API 密钥等）
        """
        self.config = config or Config()

    def summarize(self, content: str) -> str | None:
        """为给定的文章内容生成 AI 摘要。
        
        参数：
            content: 待摘要的文章内容
            
        返回：
            str | None: 生成的摘要文本，AI 未配置或调用失败时返回 None
        """
        # 构建请求头
        headers = dict(self.config.ai_headers)
        # 检查 AI 配置是否完整
        if "Authorization" not in headers:
            return "[AI 未配置]"

        # 构建 AI API 请求参数
        payload = {
            "model": self.config.ai_model,  # AI 模型名称
            "messages": [
                {
                    "role": "system",  # 系统角色提示词
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
                {"role": "user", "content": content},  # 用户输入的文章内容
            ],
            "stream": False,  # 非流式返回
            "temperature": 0.7,  # 生成温度（控制随机性）
            "max_tokens": 2000,  # 最大生成令牌数
        }

        try:
            # 调用 AI API
            resp = requests.post(self.config.ai_base_url, json=payload, headers=headers, timeout=60)
            # 检查响应状态
            if resp.status_code != 200:
                print(f"AI API返回错误状态码: {resp.status_code}")
                return None
            
            # 解析响应结果
            data = resp.json()
            choices = data.get("choices") or []
            if not choices:
                return None
            
            # 提取摘要文本
            text = choices[-1]["message"].get("content", "").strip()
            # 清理特殊格式（如思考过程标记）
            text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
            # 移除可能的标题标记
            text = text.lstrip("# ").lstrip()
            return text
        except requests.RequestException as exc:
            # 处理请求异常
            print(f"调用AI失败: {exc}")
            return None
