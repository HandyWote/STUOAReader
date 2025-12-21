"""AI问答API路由模块。

该模块提供基于向量的问答功能，使用pgvector扩展进行向量相似度搜索。
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

from flask import Blueprint, jsonify, request
import requests

from backend.db import db_session
from backend.routes.auth import login_required
from backend.config import Config

# 初始化蓝图
bp = Blueprint('ai', __name__)

# 设置日志
logger = logging.getLogger(__name__)

# 配置
config = Config()


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

        filters: list[str] = []
        params: list[Any] = []
        limit_days = config.ai_vector_limit_days
        limit_count = config.ai_vector_limit_count

        if limit_days is not None and limit_days > 0:
            cutoff = date.today() - timedelta(days=limit_days - 1)
            filters.append("v.published_on >= %s")
            params.append(cutoff)
        else:
            limit_days = None

        if limit_count is not None and limit_count <= 0:
            limit_count = None

        where_clause = ""
        if filters:
            where_clause = "WHERE " + " AND ".join(filters)

        if limit_count:
            sql = f"""
            WITH candidate AS (
                SELECT a.id, a.title, a.unit, a.published_on, a.summary, a.content, v.embedding, v.created_at
                FROM vectors v
                JOIN articles a ON v.article_id = a.id
                {where_clause}
                ORDER BY v.created_at DESC
                LIMIT %s
            )
            SELECT id, title, unit, published_on, summary, content,
                   embedding <=> %s::vector AS similarity
            FROM candidate
            ORDER BY similarity ASC
            LIMIT %s
            """
            params.extend([limit_count, vector_str, top_k])
        else:
            sql = f"""
            SELECT a.id, a.title, a.unit, a.published_on, a.summary, a.content,
                   v.embedding <=> %s::vector AS similarity  -- 计算余弦相似度
            FROM vectors v
            JOIN articles a ON v.article_id = a.id  -- 关联文章表
            {where_clause}
            ORDER BY similarity ASC  -- 按相似度升序排列（值越小越相似）
            LIMIT %s  -- 返回前top_k条
            """
            params.extend([vector_str, top_k])
        
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
                "similarity": float(row["similarity"])
            }
            articles.append(article)
        
        return articles
        
    except Exception as e:
        logger.error(f"搜索相似文章失败: {e}")
        return []


def generate_answer(query: str, articles: list[dict[str, Any]]) -> str:
    """根据查询和相关文章生成回答。
    
    使用AI模型生成自然语言回答。
    
    参数：
        query: 用户的查询
        articles: 相关的文章列表
        
    返回：
        生成的回答文本
    """
    try:
        # 准备上下文
        context = ""
        for article in articles:
            context += f"\n文章标题：{article['title']}\n"
            context += f"发布单位：{article['unit']}\n"
            context += f"发布日期：{article['published_on']}\n"
            context += f"文章内容：{article['content']}\n"
        
        # 构造AI提示
        prompt = f"你是一个智能问答助手，根据以下提供的文章内容回答用户的问题。\n"
        prompt += f"\n文章内容：{context}\n"
        prompt += f"\n用户问题：{query}\n"
        prompt += f"\n请根据文章内容提供准确的回答，不要添加文章中没有的信息。"
        
        # 使用配置的AI服务
        if config.ai_base_url and config.api_key:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {config.api_key}"
            }
            payload = {
                "model": config.ai_model,
                "messages": [
                    {"role": "system", "content": "你是一个智能问答助手，根据提供的文章内容回答用户的问题。"},
                    {"role": "user", "content": prompt}
                ]
            }
            
            response = requests.post(config.ai_base_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            logger.error("AI服务配置不完整")
            # 如果没有AI服务，返回相关文章摘要
            return f"根据相关文章，以下是可能的答案：\n{context}"
            
    except Exception as e:
        logger.error(f"生成回答失败: {e}")
        # 返回相关文章信息作为备选
        return f"无法生成回答，但找到以下相关文章：\n{context}"


@bp.route('/ask', methods=['POST'])
@login_required
def ask_question():
    """基于向量的问答API。
    
    根据用户的问题，使用向量相似度搜索找到相关文章，然后生成回答。
    
    请求体：
        {"question": "你的问题", "top_k": 3}  # top_k是可选的
        
    返回：
        包含回答和相关文章的JSON响应
    """
    try:
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({"error": "请求参数错误，缺少question字段"}), 400
        
        question = data['question']
        top_k = data.get('top_k', 3)
        
        # 1. 生成问题的向量嵌入
        query_embedding = generate_embedding(question)
        if not query_embedding:
            return jsonify({"error": "生成问题向量失败"}), 500
        
        # 2. 搜索相似的文章
        similar_articles = search_similar_articles(query_embedding, top_k)
        if not similar_articles:
            return jsonify({"error": "没有找到相关文章"}), 404
        
        # 3. 生成回答
        answer = generate_answer(question, similar_articles)
        
        # 4. 返回结果
        return jsonify({
            "answer": answer,
            "related_articles": [
                {
                    "id": article["id"],
                    "title": article["title"],
                    "unit": article["unit"],
                    "published_on": article["published_on"],
                    "similarity": article["similarity"]
                } for article in similar_articles
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"AI问答失败: {e}")
        return jsonify({"error": "AI问答失败"}), 500


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
