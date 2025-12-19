from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass
from typing import Dict, Optional
from urllib.parse import urljoin

import requests

from backend.services.exceptions import InvalidCredentialsError


hidden_input_pattern = re.compile(r'(?is)<input\b[^>]*type\s*=\s*(?:\'hidden\'|"hidden"|hidden)[^>]*>')
form_pattern = re.compile(r'(?is)<form\b[^>]*id\s*=\s*(?:\'fm1\'|"fm1")[^>]*>')


@dataclass
class SSOPage:
    url: str
    body: str


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

    def verify(self, username: str, password: str) -> None:
        page = self.fetch_login_page()
        hidden = extract_hidden_inputs(page.body)
        form_action = find_form_action(page.body)

        submit_url = page.url
        if form_action:
            submit_url = urljoin(page.url, form_action)

        payload = {**hidden, "username": username, "password": password}
        body, status = self.submit_credentials(submit_url, payload)

        if status >= 500:
            raise RuntimeError(f"campus sso unavailable: {status}")

        if detect_stu_success(body):
            return

        self.log.debug("SSO 登录失败", extra={"status": status, "body_preview": truncate_for_log(body)})
        raise InvalidCredentialsError("单点登录失败")

    def fetch_login_page(self) -> SSOPage:
        resp = self.session.get(self.login_url, timeout=self.timeout)
        body = read_body(resp, 512 * 1024)

        if resp.status_code >= 500:
            raise RuntimeError(f"campus sso unavailable: {resp.status_code}")

        final_url = resp.url or self.login_url
        return SSOPage(url=final_url, body=body)

    def submit_credentials(self, submit_url: str, form: Dict[str, str]) -> tuple[str, int]:
        resp = self.session.post(
            submit_url,
            data=form,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=self.timeout,
        )
        body = read_body(resp, 512 * 1024)
        return body, resp.status_code


def read_body(resp: requests.Response, limit: int) -> str:
    data = resp.content[:limit] if limit > 0 else resp.content
    encoding = resp.encoding or "utf-8"
    return data.decode(encoding, errors="replace")


def extract_hidden_inputs(markup: str) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for tag in hidden_input_pattern.findall(markup):
        name, has_name = extract_attr(tag, "name")
        if not has_name or not name.strip():
            continue
        value, _ = extract_attr(tag, "value")
        result[name] = value
    return result


def find_form_action(markup: str) -> str:
    match = form_pattern.search(markup)
    if not match:
        return ""
    action, ok = extract_attr(markup[match.start() :], "action")
    return action if ok else ""


def extract_attr(fragment: str, attr: str) -> tuple[str, bool]:
    double_quoted = re.compile(r"(?i)" + re.escape(attr) + r'\s*=\s*"([^"]*)"')
    if match := double_quoted.search(fragment):
        return html.unescape(match.group(1).strip()), True

    single_quoted = re.compile(r"(?i)" + re.escape(attr) + r"\s*=\s*'([^']*)'")
    if match := single_quoted.search(fragment):
        return html.unescape(match.group(1).strip()), True

    return "", False


def detect_stu_success(body: str) -> bool:
    lower = body.lower()
    if "<frameset" not in lower:
        return False
    for kw in ("banner.aspx", "index_menu.aspx", "page/extheadpage.aspx"):
        if kw not in lower:
            return False
    return True


def truncate_for_log(text: str, limit: int = 256) -> str:
    if limit <= 0 or len(text) <= limit:
        return text
    return text[:limit] + "..."
