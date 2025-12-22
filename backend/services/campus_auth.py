from __future__ import annotations

import logging
from typing import Optional

import requests

from backend.services.cas_client import sso_login_and_get_name
from backend.services.exceptions import InvalidCredentialsError


class CampusAuthenticator:
    def __init__(self, login_url: str, timeout: int = 10, logger: Optional[logging.Logger] = None) -> None:
        self.login_url = login_url.strip()
        self.timeout = timeout if timeout > 0 else 10
        self.session = requests.Session()
        self.log = logger or logging.getLogger(__name__)

    @classmethod
    def from_config(cls, cfg, logger: Optional[logging.Logger] = None) -> Optional["CampusAuthenticator"]:
        if not getattr(cfg, "campus_auth_enabled", False):
            return None
        login_url = (cfg.campus_auth_url or "").strip()
        if not login_url:
            return None
        return cls(login_url=login_url, timeout=getattr(cfg, "campus_auth_timeout", 10), logger=logger)

    def verify(self, username: str, password: str) -> str:
        try:
            display_name = sso_login_and_get_name(username, password, timeout=self.timeout)
        except requests.RequestException as exc:
            raise RuntimeError("campus sso unavailable") from exc
        except RuntimeError as exc:
            self.log.debug("SSO 登录失败", extra={"error": str(exc)})
            raise InvalidCredentialsError("单点登录失败") from exc
        return display_name
