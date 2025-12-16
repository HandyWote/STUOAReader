"""认证路由模块。

该模块提供用户认证相关的API端点，包括获取JWT令牌和验证令牌等功能。
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta
from typing import Any

from flask import Blueprint, jsonify, request
import jwt

from config.config import Config

# 初始化蓝图
bp = Blueprint('auth', __name__)

# 配置
config = Config()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """创建JWT访问令牌。
    
    参数：
        data: 要包含在令牌中的数据（如用户ID、用户名等）
        expires_delta: 令牌过期时间增量
        
    返回：
        编码后的JWT令牌字符串
    """
    # 复制数据以避免修改原始字典
    to_encode = data.copy()
    
    # 设置过期时间
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 添加过期时间到数据中
    to_encode.update({"exp": expire})
    
    # 使用密钥和算法编码JWT
    # HS256: HMAC with SHA-256 算法，用于签名JWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict[str, Any] | None:
    """验证JWT令牌。
    
    参数：
        token: JWT令牌字符串
        
    返回：
        令牌中包含的数据，如果验证失败则返回None
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def get_current_user() -> dict[str, Any] | None:
    """从请求中获取当前用户信息。
    
    返回：
        当前用户信息，如果没有或无效则返回None
    """
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split('Bearer ')[1]
        return verify_token(token)
    return None


def login_required(func):
    """登录验证装饰器。
    
    用于保护需要登录才能访问的API端点。
    """
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "未授权访问"}), 401
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


@bp.route('/token', methods=['POST'])
def login():
    """获取访问令牌。
    
    该端点用于获取JWT访问令牌，支持SSO交换JWT（模拟实现）。
    
    请求体：
        {"username": "your_username", "password": "your_password"} 或 {"sso_token": "your_sso_token"}
        
    返回：
        包含访问令牌和过期时间的JSON响应
    """
    data = request.get_json()
    
    # 模拟SSO令牌交换
    if 'sso_token' in data:
        # 实际项目中应与SSO服务器验证令牌
        if data['sso_token'] == 'valid_sso_token':
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": "user123", "username": "test_user"}, 
                expires_delta=access_token_expires
            )
            return jsonify({
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": access_token_expires.total_seconds()
            }), 200
        else:
            return jsonify({"error": "无效的SSO令牌"}), 401
    
    # 模拟用户名密码登录
    if 'username' in data and 'password' in data:
        # 实际项目中应验证用户名和密码
        if data['username'] == 'test' and data['password'] == 'password':
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": "user123", "username": "test_user"}, 
                expires_delta=access_token_expires
            )
            return jsonify({
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": access_token_expires.total_seconds()
            }), 200
        else:
            return jsonify({"error": "用户名或密码错误"}), 401
    
    return jsonify({"error": "无效的请求参数"}), 400


@bp.route('/me', methods=['GET'])
@login_required
def get_me():
    """获取当前用户信息。
    
    返回当前登录用户的信息。
    """
    user = get_current_user()
    return jsonify(user), 200