"""AI问答API路由模块。

该模块提供基于向量的问答功能，使用pgvector扩展进行向量相似度搜索。
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Iterable, TypedDict, Annotated
import json
from functools import lru_cache

from flask import Blueprint, jsonify, request
import requests
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

from backend.db import db_session
from backend.routes.auth import login_required
from backend.config import Config
from backend.utils.redis_cache import get_cache

# 初始化蓝图
bp = Blueprint('ai', __name__)

# 设置日志
logger = logging.getLogger(__name__)

# 配置
config = Config()
cache = get_cache()

MEMORY_TTL_SECONDS = 24 * 60 * 60
MEMORY_MAX_ITEMS = 5


def _normalize_ai_base_url(raw_url: str | None) -> str | None:
    if not raw_url:
        return None
    url = raw_url.rstrip("/")
    for suffix in ("/chat/completions", "/v1/chat/completions"):
        if url.endswith(suffix):
            return url[: -len(suffix)]
    return url


def _format_message_for_log(message: BaseMessage) -> dict[str, Any]:
    payload: dict[str, Any] = {"type": message.__class__.__name__}
    content = getattr(message, "content", None)
    if isinstance(content, str):
        payload["content"] = content
        payload["content_len"] = len(content)
    else:
        payload["content"] = content
    tool_calls = getattr(message, "tool_calls", None)
    if tool_calls:
        payload["tool_calls"] = tool_calls
    tool_call_id = getattr(message, "tool_call_id", None)
    if tool_call_id:
        payload["tool_call_id"] = tool_call_id
    additional_kwargs = getattr(message, "additional_kwargs", None)
    if additional_kwargs:
        payload["additional_kwargs"] = additional_kwargs
    return payload


def _log_messages(stage: str, messages: list[BaseMessage]) -> None:
    logger.info(
        "AI请求messages(%s): %s",
        stage,
        json.dumps(
            [_format_message_for_log(msg) for msg in messages],
            ensure_ascii=False,
            default=str,
        ),
    )


def generate_embedding(text: str) -> list[float] | None:
    """生成文本的向量嵌入。
    
    参数：
        text: 要生成嵌入的文本
        
    返回：
        向量嵌入列表，如果失败则返回None
    """
    try:
        # 使用配置的嵌入服务
        if config.embed_base_url and config.embed_api_key:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config.embed_api_key}"
            }
            payload = {
                "model": config.embed_model or "default-model",
                "input": text
            }
            
            response = requests.post(config.embed_base_url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            return result["data"][0]["embedding"]
        else:
            logger.error("嵌入服务配置不完整")
            return None
            
    except Exception as e:
        logger.error(f"生成向量嵌入失败: {e}")
        return None


def search_similar_articles(query_embedding: list[float], top_k: int = 3) -> list[dict[str, Any]]:
    """搜索与查询向量相似的文章。
    
    使用pgvector的向量相似度搜索功能，基于余弦相似度算法。
    
    参数：
        query_embedding: 查询文本的向量嵌入
        top_k: 返回的最大相似文章数
        
    返回：
        包含相似文章信息的列表
    """
    try:
        # 1. 将Python向量列表转换为PostgreSQL向量格式字符串
        # pgvector的向量格式：["0.1,0.2,0.3,..."]
        vector_str = "[" + ",".join(map(str, query_embedding)) + "]"

        recency_weight = max(config.ai_recency_weight, 0.0)
        half_life_days = max(config.ai_recency_half_life_days, 1.0)
        candidate_limit = min(max(top_k * 5, top_k), 50)

        sql = """
        WITH candidate AS (
            SELECT a.id, a.title, a.unit, a.published_on, a.summary, a.content,
                   v.embedding <=> %s::vector AS similarity
            FROM vectors v
            JOIN articles a ON v.article_id = a.id
            ORDER BY v.embedding <=> %s::vector
            LIMIT %s
        )
        SELECT id, title, unit, published_on, summary, content, similarity,
               similarity - %s * exp(-GREATEST(CURRENT_DATE - published_on, 0)::float / %s) AS score
        FROM candidate
        ORDER BY score ASC
        LIMIT %s
        """
        params: list[Any] = [vector_str, vector_str, candidate_limit, recency_weight, half_life_days, top_k]
        
        # 3. 执行查询
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            results = cur.fetchall()
        
        # 转换结果
        articles = []
        for row in results:
            article = {
                "id": row["id"],
                "title": row["title"],
                "unit": row["unit"],
                "published_on": row["published_on"],
                "summary": row["summary"],
                "content": row["content"],
                "similarity": float(row["similarity"]),
                "score": float(row["score"])
            }
            articles.append(article)
        
        return articles
        
    except Exception as e:
        logger.error(f"搜索相似文章失败: {e}")
        return []


def _memory_key(user_id: str) -> str:
    return f"ai:mem:{user_id}"


def _load_short_memory(user_id: str) -> list[dict[str, str]]:
    if not cache:
        return []
    raw = cache.get(_memory_key(user_id), default=[])
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    return []


def _save_short_memory(user_id: str, question: str, answer: str) -> None:
    if not cache:
        return
    history = _load_short_memory(user_id)
    history.append({"user": question, "assistant": answer})
    history = history[-MEMORY_MAX_ITEMS:]
    cache.set(_memory_key(user_id), history, expire_seconds=MEMORY_TTL_SECONDS)


def _build_memory_messages(history: list[dict[str, str]]) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    for item in history:
        user_text = (item.get("user") or "").strip()
        assistant_text = (item.get("assistant") or "").strip()
        if user_text:
            messages.append(HumanMessage(content=user_text))
        if assistant_text:
            messages.append(AIMessage(content=assistant_text))
    return messages


def _build_system_prompt(top_k_hint: int, display_name: str | None = None) -> str:
    from datetime import datetime
    time_now = datetime.now()
    identity_hint = f"当前用户的名字：{display_name}。可酌情称呼，但不强制。\n" if display_name else "\n"
    return (
f"""
你是校内OA管理员瑞德，专注于帮人查找和解读OA系统中的相关文章。你会根据问题的具体需求，自主判断是否需要检索文章内容来为你提供准确信息。
**你的工作方式：**
1. **常规问题**：如果用户的提问不涉及具体文章内容（例如流程咨询、功能指引），你会直接基于知识作答。
2. **文章查询**：当问题涉及具体政策、通知、文章细节时，你会主动检索相关文章，确保信息准确。
3. **检索设置**：检索时要根据问题复杂度自动选择：
   - **简要检索** (`detail_level: brief`)：适用于关键词查询、简单事实确认。
   - **全文检索** (`detail_level: full`)：适用于复杂分析、政策解读或多文章对比。
   - **检索数量** (`top_k`)：通常设置为 `{top_k_hint}` 篇左右，确保覆盖核心内容，如果返回的结果你认为无法覆盖，你将会进行下一次搜索，最多多搜索一次。
**！！注意：**
- 你要严格依据OA系统内现有信息作答，不编造未收录的内容。
- 如需深入分析，建议用户提供具体的关键词或背景，你会更精准地定位文章。
- 如果用户的问题与OA系统无关，你会礼貌提醒并引导其关注相关事务。
{identity_hint}
当前日期和时间：{time_now.strftime("%Y年%m月%d日 %H:%M")}
"""
    )


@tool("vector_search")
def vector_search_tool(query: str, top_k: int = 3, detail_level: str = "brief") -> str:
    """OA向量检索工具：返回相关文章内容与摘要。"""
    normalized_top_k = max(1, min(10, int(top_k)))
    normalized_level = "full" if detail_level == "full" else "brief"
    logger.info(
        "AI工具调用 vector_search: %s",
        json.dumps(
            {"query": query, "top_k": normalized_top_k, "detail_level": normalized_level},
            ensure_ascii=False,
            default=str,
        ),
    )
    embedding = generate_embedding(query)
    if not embedding:
        payload = {"error": "embedding_failed", "documents": [], "related_articles": []}
        return json.dumps(payload, ensure_ascii=False)

    articles = search_similar_articles(embedding, normalized_top_k)
    related_articles = _build_related_articles(articles)
    documents = []
    for article in articles:
        doc = {
            "id": article.get("id"),
            "title": article.get("title"),
            "unit": article.get("unit"),
            "published_on": _serialize_value(article.get("published_on")),
            "summary": article.get("summary"),
        }
        if normalized_level == "full":
            doc["content"] = article.get("content") or ""
        else:
            doc["content_snippet"] = _truncate_text(article.get("content"))
            doc["summary_snippet"] = _truncate_text(article.get("summary"))
        documents.append(doc)

    payload = {
        "detail_level": normalized_level,
        "documents": documents,
        "related_articles": related_articles,
    }
    payload_text = json.dumps(payload, ensure_ascii=False, default=str)
    logger.info(
        "AI工具返回 vector_search: %s",
        json.dumps(
            {"len": len(payload_text), "preview": payload_text[:500]},
            ensure_ascii=False,
            default=str,
        ),
    )
    return payload_text


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


@lru_cache(maxsize=1)
def _build_agent() -> Any:
    tools = [vector_search_tool]
    llm = ChatOpenAI(
        api_key=config.api_key,
        base_url=_normalize_ai_base_url(config.ai_base_url),
        model=config.ai_model,
        temperature=0.2,
    )
    llm_with_tools = llm.bind_tools(tools)

    def agent_node(state: AgentState) -> dict[str, list[BaseMessage]]:
        _log_messages("before_llm", state["messages"])
        response = llm_with_tools.invoke(state["messages"])
        _log_messages("after_llm", state["messages"] + [response])
        return {"messages": state["messages"] + [response]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", ToolNode(tools))
    graph.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")
    graph.set_entry_point("agent")
    return graph.compile()


def _extract_related_articles(messages: list[BaseMessage]) -> list[dict[str, Any]]:
    related: list[dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, ToolMessage):
            continue
        try:
            payload = json.loads(message.content)
        except (TypeError, json.JSONDecodeError):
            continue
        items = payload.get("related_articles")
        if isinstance(items, list):
            related = items
    return related


def _extract_answer(messages: list[BaseMessage]) -> str:
    for message in reversed(messages):
        if isinstance(message, AIMessage) and message.content:
            if getattr(message, "tool_calls", None):
                continue
            return message.content
    for message in reversed(messages):
        if isinstance(message, AIMessage) and message.content:
            return message.content
    return ""

def _truncate_text(text: str | None, limit: int = 80) -> str:
    if not text:
        return ""
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[:limit].rstrip()}…"


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_value(val) for key, val in value.items()}
    return value


def _build_related_articles(articles: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    related = []
    for article in articles:
        content_snippet = _truncate_text(article.get("content"))
        summary_snippet = _truncate_text(article.get("summary"))
        related.append(
            {
                "id": article.get("id"),
                "title": article.get("title"),
                "unit": article.get("unit"),
                "published_on": _serialize_value(article.get("published_on")),
                "similarity": article.get("similarity"),
                "content_snippet": content_snippet,
                "summary_snippet": summary_snippet,
            }
        )
    return related


@bp.route('/ask', methods=['POST'])
@login_required
def ask_question():
    """基于向量的问答API。
    
    根据用户的问题，使用向量相似度搜索找到相关文章，然后生成回答。
    
    请求体：
        {"question": "你的问题", "top_k": 3, "display_name": "张三"}  # top_k是可选的
        
    返回：
        包含回答和相关文章的JSON响应
    """
    try:
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({"error": "请求参数错误，缺少question字段"}), 400
        
        question = data['question']
        top_k_hint = data.get('top_k', 3)
        display_name = data.get('display_name')
        if not config.ai_base_url or not config.api_key or not config.ai_model:
            return jsonify({"error": "AI服务配置不完整"}), 500

        user_claims = getattr(request, "auth_claims", {})
        user_id = str(user_claims.get("sub") or "")
        history = _load_short_memory(user_id) if user_id else []
        logger.info(
            "AI请求入参: %s",
            json.dumps(
                {
                    "question": question,
                    "top_k_hint": top_k_hint,
                    "display_name": display_name,
                    "user_id": user_id,
                    "ai_base_url": config.ai_base_url,
                    "normalized_base_url": _normalize_ai_base_url(config.ai_base_url),
                    "ai_model": config.ai_model,
                    "history_len": len(history),
                },
                ensure_ascii=False,
                default=str,
            ),
        )

        messages: list[BaseMessage] = [
            SystemMessage(content=_build_system_prompt(top_k_hint, display_name)),
            *_build_memory_messages(history),
            HumanMessage(content=question),
        ]

        agent = _build_agent()
        result = agent.invoke({"messages": messages})
        final_messages = result.get("messages", messages)
        answer = _extract_answer(final_messages) or "当前服务不可用，请稍后再试。"
        related_articles = _extract_related_articles(final_messages)

        if user_id:
            _save_short_memory(user_id, question, answer)

        logger.info(
            "AI响应摘要: %s",
            json.dumps(
                {
                    "answer_len": len(answer),
                    "answer_preview": answer[:500],
                    "related_articles_len": len(related_articles),
                },
                ensure_ascii=False,
                default=str,
            ),
        )
        return jsonify({
            "answer": answer,
            "related_articles": related_articles
        }), 200
        
    except Exception as e:
        logger.error(f"AI问答失败: {e}")
        return jsonify({"error": "AI问答失败"}), 500


@bp.route('/clear_memory', methods=['POST'])
@login_required
def clear_memory():
    """清空用户的AI短记忆缓存。"""
    try:
        user_claims = getattr(request, "auth_claims", {})
        user_id = str(user_claims.get("sub") or "")
        if not user_id:
            return jsonify({"error": "用户信息缺失"}), 400
        if cache:
            cleared = cache.delete(_memory_key(user_id))
        else:
            cleared = True
        logger.info("AI记忆清理: %s", json.dumps({"user_id": user_id, "cleared": cleared}, ensure_ascii=False))
        return jsonify({"cleared": bool(cleared)}), 200
    except Exception as e:
        logger.error(f"AI记忆清理失败: {e}")
        return jsonify({"error": "AI记忆清理失败"}), 500


@bp.route('/embed', methods=['POST'])
@login_required
def create_embedding():
    """生成文本的向量嵌入。
    
    请求体：
        {"text": "要生成嵌入的文本"}
        
    返回：
        包含向量嵌入的JSON响应
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "请求参数错误，缺少text字段"}), 400
        
        text = data['text']
        
        # 生成向量嵌入
        embedding = generate_embedding(text)
        
        if embedding:
            return jsonify({"embedding": embedding}), 200
        else:
            return jsonify({"error": "生成向量嵌入失败"}), 500
            
    except Exception as e:
        logger.error(f"生成向量嵌入失败: {e}")
        return jsonify({"error": "生成向量嵌入失败"}), 500
