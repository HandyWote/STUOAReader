from __future__ import annotations

import base64
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any, Optional
from uuid import UUID, uuid4

import bcrypt
import jwt

from backend.models.auth import Session, User
from backend.repository.user_repository import NotFoundError, UserRepository
from backend.services.campus_auth import CampusAuthenticator
from backend.services.exceptions import InvalidCredentialsError, UnauthorizedError, ValidationError
from backend.config import Config


@dataclass
class AuthMetadata:
    user_agent: str | None = None
    ip: str | None = None


@dataclass
class AuthResult:
    access_token: str
    refresh_token: str
    user: User


class AuthService:
    def __init__(
        self,
        cfg: Config,
        repo: UserRepository,
        campus: Optional[CampusAuthenticator] = None,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        self.cfg = cfg
        self.repo = repo
        self.campus = campus
        self.log = logger or logging.getLogger(__name__)

        if not self.cfg.auth_jwt_secret:
            raise RuntimeError("AUTH_JWT_SECRET 未配置")
        if not self.cfg.auth_refresh_hash_key:
            raise RuntimeError("AUTH_REFRESH_HASH_KEY 未配置")

    def login(self, username: str, password: str, meta: AuthMetadata) -> AuthResult:
        username = (username or "").strip()
        if not username or not password:
            raise ValidationError("username and password are required")

        try:
            cred = self.repo.get_credential(username)
        except NotFoundError:
            if not self.cfg.auth_allow_auto_user_creation or self.campus is None:
                raise InvalidCredentialsError("invalid credentials")
            display_name = self._verify_with_campus(username, password)
            hashed = self._hash_password(password)
            user = self.repo.create_with_password(
                username=username,
                password_hash=hashed,
                password_algo="bcrypt",
                password_cost=self._password_cost(),
                display_name=display_name or username,
            )
            self.log.info("campus authentication success, user created", extra={"username": username, "user_id": str(user.id)})
            cred = self.repo.get_credential(username)
        else:
            if not bcrypt.checkpw(password.encode("utf-8"), cred.password_hash.encode("utf-8")):
                if self.campus is None:
                    raise InvalidCredentialsError("invalid credentials")
                display_name = self._verify_with_campus(username, password)
                hashed = self._hash_password(password)
                self.repo.update_credentials(
                    user_id=cred.user_id,
                    password_hash=hashed,
                    password_algo="bcrypt",
                    password_cost=self._password_cost(),
                    display_name=display_name or username,
                )
                cred = self.repo.get_credential(username)

        try:
            self.repo.record_login(cred.user_id)
        except Exception as exc:  # pragma: no cover - best effort
            self.log.warning("record login failed", extra={"user_id": str(cred.user_id), "error": str(exc)})

        user = self.repo.get_by_id(cred.user_id)
        return self._issue_tokens(user, meta)

    def refresh(self, refresh_token: str, meta: AuthMetadata) -> AuthResult:
        token = (refresh_token or "").strip()
        if not token:
            raise ValidationError("refresh token missing")

        hashed = self._hash_refresh_token(token)
        try:
            session = self.repo.get_session_by_hash(hashed)
        except NotFoundError:
            raise UnauthorizedError("session not found")

        if session.revoked_at is not None:
            raise UnauthorizedError("session revoked")
        if datetime.now(timezone.utc) > session.expires_at:
            raise UnauthorizedError("session expired")

        try:
            user = self.repo.get_by_id(session.user_id)
        except NotFoundError:
            raise UnauthorizedError("user missing")

        self.repo.revoke_session(session.id)
        return self._issue_tokens(user, meta)

    def logout(self, refresh_token: str) -> None:
        token = (refresh_token or "").strip()
        if not token:
            raise ValidationError("refresh token missing")

        hashed = self._hash_refresh_token(token)
        try:
            session = self.repo.get_session_by_hash(hashed)
        except NotFoundError:
            return
        self.repo.revoke_session(session.id)

    def parse_access_token(self, token: str) -> dict[str, Any]:
        if not token:
            raise UnauthorizedError("token missing")
        try:
            payload = jwt.decode(
                token,
                self.cfg.auth_jwt_secret,
                algorithms=["HS256"],
                options={"require": ["exp", "iat", "sub"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise UnauthorizedError("token expired") from exc
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("token invalid") from exc
        return payload

    def _verify_with_campus(self, username: str, password: str) -> str:
        if self.campus is None:
            raise InvalidCredentialsError("campus auth disabled")
        return self.campus.verify(username, password)

    def _issue_tokens(self, user: User, meta: AuthMetadata) -> AuthResult:
        access_token = self._sign_access_token(user)
        refresh_token, session = self._generate_refresh_token(user, meta)
        self.repo.create_session(session)
        return AuthResult(access_token=access_token, refresh_token=refresh_token, user=user)

    def _sign_access_token(self, user: User) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "name": user.display_name,
            "roles": user.roles,
            "iat": int(now.timestamp()),
            "exp": int((now + self._access_ttl()).timestamp()),
        }
        return jwt.encode(payload, self.cfg.auth_jwt_secret, algorithm="HS256")

    def _generate_refresh_token(self, user: User, meta: AuthMetadata) -> tuple[str, Session]:
        raw_bytes = os.urandom(48)
        raw_token = base64.urlsafe_b64encode(raw_bytes).decode("ascii").rstrip("=")

        now = datetime.now(timezone.utc)
        session = Session(
            id=uuid4(),
            user_id=user.id,
            refresh_token_sha=self._hash_refresh_token(raw_token),
            expires_at=now + self._refresh_ttl(),
            user_agent=meta.user_agent,
            ip=meta.ip,
            revoked_at=None,
            created_at=now,
        )
        return raw_token, session

    def _hash_refresh_token(self, token: str) -> str:
        key = self.cfg.auth_refresh_hash_key or ""
        digest = sha256(f"{key}{token}".encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")

    def _hash_password(self, password: str) -> str:
        cost = self._password_cost()
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=cost))
        return hashed.decode("utf-8")

    def _password_cost(self) -> int:
        if 4 <= self.cfg.auth_password_cost <= 31:
            return self.cfg.auth_password_cost
        return 12

    def _access_ttl(self) -> timedelta:
        return self.cfg.auth_access_token_ttl or timedelta(hours=1)

    def _refresh_ttl(self) -> timedelta:
        return self.cfg.auth_refresh_token_ttl or timedelta(days=7)
