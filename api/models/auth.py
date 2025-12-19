from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class User:
    id: UUID
    username: str
    display_name: str
    password_hash: str
    password_algo: str
    password_cost: int
    roles: list[str]
    created_at: datetime
    updated_at: Optional[datetime]
    last_login_at: Optional[datetime]


@dataclass
class UserCredential:
    user_id: UUID
    username: str
    password_hash: str
    password_algo: str
    password_cost: int


@dataclass
class Session:
    id: UUID
    user_id: UUID
    refresh_token_sha: str
    expires_at: datetime
    user_agent: Optional[str]
    ip: Optional[str]
    revoked_at: Optional[datetime]
    created_at: datetime


__all__ = ["User", "UserCredential", "Session"]
