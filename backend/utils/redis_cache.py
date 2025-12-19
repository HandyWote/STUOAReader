"""Redis缓存工具类。

该模块提供了Redis缓存的封装，支持设置缓存、获取缓存和删除缓存等功能。
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable, Optional

import redis

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis缓存工具类。
    
    提供缓存的设置、获取、删除和过期时间管理等功能。
    """
    
    def __init__(self, redis_client: redis.Redis | None):
        """初始化Redis缓存工具。
        
        参数：
            redis_client: Redis客户端实例
        """
        self.redis_client = redis_client
        self.enabled = redis_client is not None
    
    def set(self, key: str, value: Any, expire_seconds: int = 3600) -> bool:
        """设置缓存。
        
        参数：
            key: 缓存键
            value: 缓存值
            expire_seconds: 过期时间（秒）
            
        返回：
            缓存设置是否成功
        """
        if not self.enabled:
            return False
        
        try:
            # 序列化值
            if isinstance(value, (dict, list)):
                serialized_value = json.dumps(value, ensure_ascii=False)
            else:
                serialized_value = str(value)
            
            self.redis_client.setex(key, expire_seconds, serialized_value)
            return True
        except Exception as e:
            logger.error(f"设置缓存失败 (键: {key}): {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """获取缓存。
        
        参数：
            key: 缓存键
            default: 默认值
            
        返回：
            缓存值，如果不存在则返回默认值
        """
        if not self.enabled:
            return default
        
        try:
            value = self.redis_client.get(key)
            if value is None:
                return default
            
            # 尝试反序列化JSON
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                # 如果不是JSON，返回原始字符串
                return value.decode('utf-8') if isinstance(value, bytes) else value
                
        except Exception as e:
            logger.error(f"获取缓存失败 (键: {key}): {e}")
            return default
    
    def delete(self, key: str) -> bool:
        """删除缓存。
        
        参数：
            key: 缓存键
            
        返回：
            缓存删除是否成功
        """
        if not self.enabled:
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"删除缓存失败 (键: {key}): {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """检查缓存是否存在。
        
        参数：
            key: 缓存键
            
        返回：
            缓存是否存在
        """
        if not self.enabled:
            return False
        
        try:
            return self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"检查缓存存在性失败 (键: {key}): {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """删除匹配模式的所有缓存。
        
        参数：
            pattern: 缓存键匹配模式
            
        返回：
            删除的缓存数量
        """
        if not self.enabled:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if not keys:
                return 0
            
            return self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"删除匹配模式的缓存失败 (模式: {pattern}): {e}")
            return 0
    
    def generate_etag(self, value: Any) -> str:
        """生成内容的ETag。
        
        用于实现304 Not Modified响应，减少重复内容传输。
        
        参数：
            value: 要生成ETag的内容
            
        返回：
            ETag字符串（MD5哈希值）
        """
        import hashlib
        import json
        
        # 1. 将内容序列化为字符串
        # 对于字典和列表，使用JSON序列化（排序键确保一致性）
        # 对于其他类型，直接转换为字符串
        if isinstance(value, (dict, list)):
            # sort_keys=True 确保相同内容生成相同的JSON字符串
            content = json.dumps(value, sort_keys=True, ensure_ascii=False)
        else:
            content = str(value)
        
        # 2. 使用MD5算法生成哈希值作为ETag
        # MD5生成32位十六进制字符串，唯一标识内容
        # 当内容变化时，ETag也会变化
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def cache_decorator(self, key_pattern: str, expire_seconds: int = 3600) -> Callable:
        """缓存装饰器。
        
        用于装饰函数，将函数返回值缓存到Redis中。
        
        参数：
            key_pattern: 缓存键模式，可以包含{参数名}占位符
            expire_seconds: 过期时间（秒）
            
        返回：
            装饰器函数
        """
        def decorator(func: Callable) -> Callable:
            def wrapper(*args, **kwargs):
                if not self.enabled:
                    return func(*args, **kwargs)
                
                # 生成缓存键
                try:
                    # 检查是否有位置参数
                    if args:
                        # 如果有位置参数，使用函数名和参数作为键
                        key = f"{func.__name__}:{':'.join(map(str, args))}"
                    else:
                        # 如果只有关键字参数，使用key_pattern格式化
                        key = key_pattern.format(**kwargs)
                except Exception as e:
                    logger.error(f"生成缓存键失败: {e}")
                    return func(*args, **kwargs)
                
                # 尝试获取缓存
                cached_value = self.get(key)
                if cached_value is not None:
                    return cached_value
                
                # 执行函数并缓存结果
                result = func(*args, **kwargs)
                self.set(key, result, expire_seconds)
                
                return result
            return wrapper
        return decorator


# 创建全局缓存实例
redis_cache = None

def init_cache(redis_client: redis.Redis | None) -> RedisCache:
    """初始化全局缓存实例。
    
    参数：
        redis_client: Redis客户端实例
        
    返回：
        RedisCache实例
    """
    global redis_cache
    redis_cache = RedisCache(redis_client)
    return redis_cache


def get_cache() -> RedisCache | None:
    """获取全局缓存实例。
    
    返回：
        RedisCache实例
    """
    return redis_cache