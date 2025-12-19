"""认证路由：集成校园 SSO + JWT 登录刷新。"""

from __future__ import annotations

import logging
from typing import Any, Callable

from flask import Blueprint, jsonify, request

from api.repository.user_repository import UserRepository
from api.services.auth_service import AuthMetadata, AuthService
from api.services.campus_auth import CampusAuthenticator
from api.services.exceptions import InvalidCredentialsError, UnauthorizedError, ValidationError
from config.config import Config

bp = Blueprint("auth", __name__)

config = Config()
logger = logging.getLogger(__name__)
user_repo = UserRepository()
campus_auth = CampusAuthenticator.from_config(config, logger=logger)
auth_service = AuthService(config, user_repo, campus_auth, logger=logger)


def _get_auth_metadata() -> AuthMetadata:
    return AuthMetadata(
        user_agent=request.headers.get("User-Agent"),
        ip=request.headers.get("X-Real-IP") or request.remote_addr,
    )


def _bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1]
    return None


def login_required(func: Callable[..., Any]):
    def wrapper(*args, **kwargs):
        token = _bearer_token()
        try:
            claims = auth_service.parse_access_token(token or "")
        except UnauthorizedError:
            return jsonify({"error": "未授权访问"}), 401
        request.auth_claims = claims  # type: ignore[attr-defined]
        return func(*args, **kwargs)

    wrapper.__name__ = func.__name__
    return wrapper


@bp.route("/token", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username") or ""
    password = data.get("password") or ""

    try:
        result = auth_service.login(username, password, _get_auth_metadata())
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except InvalidCredentialsError:
        return jsonify({"error": "用户名或密码错误"}), 401
    except Exception as exc:  # pragma: no cover - 防止泄漏内部信息
        logger.exception("login failed")
        return jsonify({"error": f"登录失败: {exc}"}), 500

    return jsonify(
        {
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": "bearer",
            "expires_in": int(config.auth_access_token_ttl.total_seconds()),
            "user": {
                "id": str(result.user.id),
                "username": result.user.username,
                "display_name": result.user.display_name,
                "roles": result.user.roles,
            },
        }
    ), 200


@bp.route("/token/refresh", methods=["POST"])
def refresh():
    data = request.get_json(silent=True) or {}
    token = data.get("refresh_token") or ""
    try:
        result = auth_service.refresh(token, _get_auth_metadata())
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except UnauthorizedError:
        return jsonify({"error": "刷新令牌无效或已过期"}), 401
    except Exception as exc:  # pragma: no cover
        logger.exception("refresh failed")
        return jsonify({"error": f"刷新失败: {exc}"}), 500

    return jsonify(
        {
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": "bearer",
            "expires_in": int(config.auth_access_token_ttl.total_seconds()),
            "user": {
                "id": str(result.user.id),
                "username": result.user.username,
                "display_name": result.user.display_name,
                "roles": result.user.roles,
            },
        }
    ), 200


@bp.route("/logout", methods=["POST"])
def logout():
    data = request.get_json(silent=True) or {}
    token = data.get("refresh_token") or ""
    try:
        auth_service.logout(token)
    except ValidationError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        logger.exception("logout failed")
        return jsonify({"error": f"登出失败: {exc}"}), 500
    return jsonify({"message": "已登出"}), 200


@bp.route("/me", methods=["GET"])
@login_required
def get_me():
    claims = getattr(request, "auth_claims", {})
    return (
        jsonify(
            {
                "user_id": claims.get("sub"),
                "display_name": claims.get("name"),
                "roles": claims.get("roles", []),
            }
        ),
        200,
    )
