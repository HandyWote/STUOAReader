"""文章API路由模块。

该模块提供文章相关的API端点，包括文章列表、详情查询等功能。
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Blueprint, jsonify, request, make_response

from backend.db import db_session
from backend.routes.auth import login_required
from backend.utils.redis_cache import get_cache

# 初始化蓝图
bp = Blueprint('articles', __name__)

# 设置日志
logger = logging.getLogger(__name__)

# 获取缓存实例
cache = get_cache()

@bp.route('/', methods=['GET'])
def get_articles():
    """获取文章列表。
    
    支持增量获取文章列表，可以通过参数指定开始日期和结束日期。
    实现了Redis缓存和304 Not Modified响应。
    
    查询参数：
        start_date: 开始日期，格式为YYYY-MM-DD（可选）
        end_date: 结束日期，格式为YYYY-MM-DD（可选）
        limit: 返回的最大文章数（可选，默认20）
        offset: 分页偏移量（可选，默认0）
        
    返回：
        包含文章列表的JSON响应
    """
    try:
        # 获取查询参数
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        # 生成缓存键
        cache_key = f"articles:list:{start_date or 'none'}:{end_date or 'none'}:{limit}:{offset}"
        
        # 尝试从缓存获取
        if cache:
            cached_data = cache.get(cache_key)
            if cached_data:
                # 1. 生成ETag
                # ETag是内容的MD5哈希值，用于标识内容是否变化
                etag = cache.generate_etag(cached_data)
                
                # 2. 检查客户端请求头If-None-Match
                # 如果ETag匹配，返回304 Not Modified，客户端将使用本地缓存
                if request.headers.get('If-None-Match') == etag:
                    return make_response('', 304)  # 304响应不包含正文，减少网络传输
                
                # 3. 返回缓存数据和ETag
                response = jsonify(cached_data)
                response.headers['ETag'] = etag  # 设置ETag头
                response.headers['Cache-Control'] = 'max-age=3600, public'  # 缓存1小时
                return response, 200
        
        # 构建SQL查询
        sql = "SELECT id, title, unit, link, published_on, summary, created_at FROM articles"
        params = []
        conditions = []
        
        if start_date:
            conditions.append("published_on >= %s")
            params.append(start_date)
            
        if end_date:
            conditions.append("published_on <= %s")
            params.append(end_date)
        
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
            
        # 添加排序和分页
        sql += " ORDER BY published_on DESC, id DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # 执行查询
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            
            # 获取总数
            count_sql = "SELECT COUNT(*) FROM articles"
            if conditions:
                count_sql += " WHERE " + " AND ".join(conditions)
                count_params = params[:-2]  # 排除limit和offset
                cur.execute(count_sql, count_params)
            else:
                cur.execute(count_sql)
                
            total = cur.fetchone()[0]
        
        # 准备响应数据
        response_data = {
            "articles": rows,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
        # 缓存数据
        if cache:
            cache.set(cache_key, response_data, expire_seconds=3600)
        
        # 生成ETag并返回响应
        etag = cache.generate_etag(response_data) if cache else ''
        response = jsonify(response_data)
        
        if etag:
            response.headers['ETag'] = etag
            response.headers['Cache-Control'] = 'max-age=3600, public'
        
        return response, 200
        
    except Exception as e:
        logger.error(f"获取文章列表失败: {e}")
        return jsonify({"error": "获取文章列表失败"}), 500


@bp.route('/<int:article_id>', methods=['GET'])
def get_article_detail(article_id: int):
    """获取文章详情。
    
    根据文章ID获取完整的文章信息，包括内容和附件。
    实现了Redis缓存和304 Not Modified响应。
    
    参数：
        article_id: 文章ID
        
    返回：
        包含文章详情的JSON响应
    """
    try:
        # 生成缓存键
        cache_key = f"articles:detail:{article_id}"
        
        # 尝试从缓存获取
        if cache:
            cached_article = cache.get(cache_key)
            if cached_article:
                # 生成ETag
                etag = cache.generate_etag(cached_article)
                
                # 检查If-None-Match头
                if request.headers.get('If-None-Match') == etag:
                    return make_response('', 304)
                
                # 返回缓存数据
                response = jsonify(cached_article)
                response.headers['ETag'] = etag
                response.headers['Cache-Control'] = 'max-age=3600, public'
                return response, 200
        
        sql = """
        SELECT id, title, unit, link, published_on, content, summary, attachments, created_at, updated_at 
        FROM articles 
        WHERE id = %s
        """
        
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(sql, (article_id,))
            article = cur.fetchone()
        
        if not article:
            return jsonify({"error": "文章不存在"}), 404
        
        # 缓存数据
        if cache:
            cache.set(cache_key, article, expire_seconds=3600)
        
        # 生成ETag并返回响应
        etag = cache.generate_etag(article) if cache else ''
        response = jsonify(article)
        
        if etag:
            response.headers['ETag'] = etag
            response.headers['Cache-Control'] = 'max-age=3600, public'
        
        return response, 200
        
    except Exception as e:
        logger.error(f"获取文章详情失败: {e}")
        return jsonify({"error": "获取文章详情失败"}), 500


@bp.route('/latest', methods=['GET'])
def get_latest_articles():
    """获取最新的文章列表。
    
    返回最近发布的文章，默认10篇。
    
    查询参数：
        count: 返回的文章数（可选，默认10）
        
    返回：
        包含最新文章列表的JSON响应
    """
    try:
        count = int(request.args.get('count', 10))
        
        # 生成缓存键
        cache_key = f"articles:latest:{count}"
        
        # 尝试从缓存获取
        if cache:
            cached_data = cache.get(cache_key)
            if cached_data:
                # 生成ETag
                etag = cache.generate_etag(cached_data)
                
                # 检查If-None-Match头
                if request.headers.get('If-None-Match') == etag:
                    return make_response('', 304)
                
                # 返回缓存数据
                response = jsonify(cached_data)
                response.headers['ETag'] = etag
                response.headers['Cache-Control'] = 'max-age=3600, public'
                return response, 200
        
        sql = """
        SELECT id, title, unit, link, published_on, summary, created_at 
        FROM articles 
        ORDER BY published_on DESC, id DESC 
        LIMIT %s
        """
        
        with db_session() as conn:
            conn.execute(sql, (count,))
            articles = conn.fetchall()
        
        # 准备响应数据
        response_data = {"articles": articles}
        
        # 缓存数据
        if cache:
            cache.set(cache_key, response_data, expire_seconds=3600)
        
        # 生成ETag并返回响应
        etag = cache.generate_etag(response_data) if cache else ''
        response = jsonify(response_data)
        
        if etag:
            response.headers['ETag'] = etag
            response.headers['Cache-Control'] = 'max-age=3600, public'
        
        return response, 200
        
    except Exception as e:
        logger.error(f"获取最新文章失败: {e}")
        return jsonify({"error": "获取最新文章失败"}), 500


@bp.route('/by-date/<date_str>', methods=['GET'])
def get_articles_by_date(date_str: str):
    """获取指定日期的文章列表。
    
    根据发布日期获取文章列表。
    
    参数：
        date_str: 发布日期，格式为YYYY-MM-DD
        
    返回：
        包含指定日期文章列表的JSON响应
    """
    try:
        # 生成缓存键
        cache_key = f"articles:by-date:{date_str}"
        
        # 尝试从缓存获取
        if cache:
            cached_data = cache.get(cache_key)
            if cached_data:
                # 生成ETag
                etag = cache.generate_etag(cached_data)
                
                # 检查If-None-Match头
                if request.headers.get('If-None-Match') == etag:
                    return make_response('', 304)
                
                # 返回缓存数据
                response = jsonify(cached_data)
                response.headers['ETag'] = etag
                response.headers['Cache-Control'] = 'max-age=3600, public'
                return response, 200
        
        sql = """
        SELECT id, title, unit, link, published_on, summary, created_at 
        FROM articles 
        WHERE published_on = %s 
        ORDER BY id DESC
        """
        
        with db_session() as conn:
            conn.execute(sql, (date_str,))
            articles = conn.fetchall()
        
        # 准备响应数据
        response_data = {"articles": articles}
        
        # 缓存数据
        if cache:
            cache.set(cache_key, response_data, expire_seconds=3600)
        
        # 生成ETag并返回响应
        etag = cache.generate_etag(response_data) if cache else ''
        response = jsonify(response_data)
        
        if etag:
            response.headers['ETag'] = etag
            response.headers['Cache-Control'] = 'max-age=3600, public'
        
        return response, 200
        
    except Exception as e:
        logger.error(f"获取指定日期文章失败: {e}")
        return jsonify({"error": "获取指定日期文章失败"}), 500
