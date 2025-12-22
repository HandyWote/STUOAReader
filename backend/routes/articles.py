"""文章API路由模块。

该模块提供文章相关的API端点，包括文章列表、详情查询等功能。
"""

from __future__ import annotations

import logging
from datetime import datetime, date, timezone
from email.utils import format_datetime, parsedate_to_datetime
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


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_value(val) for key, val in value.items()}
    return value


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize_value(val) for key, val in row.items()}

@bp.route('/', methods=['GET'])
def get_articles():
    """获取文章列表。
    
    支持按日期与增量时间戳获取文章列表。
    实现了Redis缓存和304 Not Modified响应。
    
    查询参数：
        date: 指定日期，格式为YYYY-MM-DD（可选，默认当天）
        since: 增量时间戳（可选，秒或毫秒）
        
    返回：
        包含文章列表的JSON响应
    """
    try:
        # 不兼容旧参数
        legacy_params = ("start_date", "end_date", "limit", "offset")
        for legacy in legacy_params:
            if legacy in request.args:
                return jsonify({"error": f"参数 {legacy} 已废弃，请使用 date/since"}), 400

        # 获取查询参数
        date_str = request.args.get('date')
        since_str = request.args.get('since')

        target_date: date
        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "date 参数格式应为 YYYY-MM-DD"}), 400
        else:
            target_date = datetime.now(timezone.utc).date()
            date_str = target_date.isoformat()

        since_dt: datetime | None = None
        if since_str:
            try:
                since_value = int(since_str)
            except ValueError:
                return jsonify({"error": "since 参数应为时间戳（秒或毫秒）"}), 400
            if since_value > 10**12:  # 兼容毫秒级时间戳
                since_value = since_value // 1000
            since_dt = datetime.fromtimestamp(since_value, tz=timezone.utc)

        # 生成缓存键
        cache_key = f"articles:list:{date_str}:{since_str or 'none'}"

        # 计算 Last-Modified（列表范围内 MAX(created_at)）
        max_sql = "SELECT MAX(created_at) AS last_modified FROM articles WHERE published_on = %s"
        max_params: list[Any] = [date_str]
        if since_dt:
            max_sql += " AND created_at >= %s"
            max_params.append(since_dt)

        with db_session() as conn, conn.cursor() as cur:
            cur.execute(max_sql, max_params)
            max_row = cur.fetchone()
        last_modified = max_row["last_modified"] if max_row else None

        ims_header = request.headers.get('If-Modified-Since')
        ims_dt: datetime | None = None
        if ims_header:
            try:
                ims_dt = parsedate_to_datetime(ims_header)
                if ims_dt.tzinfo is None:
                    ims_dt = ims_dt.replace(tzinfo=timezone.utc)
            except (TypeError, ValueError):
                ims_dt = None
        
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

                if ims_dt and (last_modified is None or ims_dt >= last_modified):
                    return make_response('', 304)
                
                # 3. 返回缓存数据和ETag
                response = jsonify(cached_data)
                response.headers['ETag'] = etag  # 设置ETag头
                response.headers['Cache-Control'] = 'max-age=3600, public'  # 缓存1小时
                if last_modified:
                    response.headers['Last-Modified'] = format_datetime(_as_utc(last_modified), usegmt=True)
                return response, 200

        if ims_dt and (last_modified is None or ims_dt >= last_modified):
            return make_response('', 304)
        
        # 构建SQL查询
        sql = """
        SELECT id, title, unit, link, published_on, summary, attachments, created_at, updated_at
        FROM articles
        WHERE published_on = %s
        """
        params: list[Any] = [date_str]
        if since_dt:
            sql += " AND created_at >= %s"
            params.append(since_dt)

        # 添加排序
        sql += " ORDER BY created_at DESC, id DESC"
        
        # 执行查询
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        articles = [_serialize_row(row) for row in rows]
        
        # 准备响应数据
        response_data = {
            "articles": articles
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
        if last_modified:
            response.headers['Last-Modified'] = format_datetime(_as_utc(last_modified), usegmt=True)
        
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

        article_data = _serialize_row(article)
        
        # 缓存数据
        if cache:
            cache.set(cache_key, article_data, expire_seconds=3600)
        
        # 生成ETag并返回响应
        etag = cache.generate_etag(article_data) if cache else ''
        response = jsonify(article_data)
        
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
