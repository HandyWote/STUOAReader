import re
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup


DEFAULT_SERVICE_URL = "https://netms.stu.edu.cn/default.aspx"
DEFAULT_LOGIN_URL_PREFIX = "https://sso.stu.edu.cn/login?service="


def extract_hidden_inputs(html: str) -> dict[str, str]:
    """从HTML中提取所有hidden input的name和value"""
    hidden_pattern = re.compile(
        r'<input\s+[^>]*type\s*=\s*["\']?hidden["\']?[^>]*>', re.IGNORECASE
    )
    result: dict[str, str] = {}
    for tag in hidden_pattern.findall(html):
        name_match = re.search(r'name\s*=\s*["\']([^"\']+)["\']', tag)
        value_match = re.search(r'value\s*=\s*["\']([^"\']*)["\']', tag)
        if name_match:
            name = name_match.group(1)
            value = value_match.group(1) if value_match else ""
            result[name] = value
    return result


def extract_form_action(html: str, form_id: str = "fm1") -> str:
    """提取指定form的action属性"""
    pattern = re.compile(
        f'<form\\s+[^>]*id\\s*=\\s*["\']{form_id}["\'][^>]*>', re.IGNORECASE
    )
    match = pattern.search(html)
    if not match:
        return ""
    start = match.end()
    tag = html[match.start():start]
    action_match = re.search(r'action\s*=\s*["\']([^"\']+)["\']', tag)
    if action_match:
        return action_match.group(1)
    return ""


def get_ticket_from_response(response: requests.Response) -> str | None:
    """从响应中提取ticket（ST-...）"""
    location = response.headers.get("Location", "")
    if "ticket=" in location:
        parsed = urlparse(location)
        qs = parse_qs(parsed.query)
        tickets = qs.get("ticket", [])
        if tickets:
            return tickets[0]

    refresh_pattern = re.compile(
        r'<meta\s+[^>]*http-equiv\s*=\s*["\']?refresh["\']?[^>]*>', re.IGNORECASE
    )
    meta_match = refresh_pattern.search(response.text)
    if meta_match:
        content_match = re.search(r'content\s*=\s*["\']([^"\']+)["\']', meta_match.group(0))
        if content_match:
            content = content_match.group(1)
            if "ticket=" in content:
                ticket_part = content.split("ticket=")[-1].split(";")[0].strip()
                if ticket_part.startswith("ST-"):
                    return ticket_part

    ticket_match = re.search(r'ST-[A-Za-z0-9\-]+', response.text)
    if ticket_match:
        return ticket_match.group(0)
    return None


def cas_login(
    login_url: str,
    username: str,
    password: str,
    service: str | None = None,
    session: requests.Session | None = None,
    timeout: int = 10,
) -> tuple[requests.Session, str | None]:
    """执行CAS登录，返回会话和ticket（如果成功）。"""
    if session is None:
        session = requests.Session()

    resp = session.get(login_url, timeout=timeout)
    resp.raise_for_status()
    html = resp.text
    final_url = resp.url

    hidden = extract_hidden_inputs(html)
    action = extract_form_action(html)
    submit_url = urljoin(final_url, action) if action else final_url

    payload = {
        **hidden,
        "username": username,
        "password": password,
    }
    if "_eventId" not in payload:
        payload["_eventId"] = "submit"
    if "execution" not in payload:
        payload["execution"] = "e1s1"

    resp = session.post(
        submit_url,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        allow_redirects=False,
        timeout=timeout,
    )

    ticket = get_ticket_from_response(resp)
    if ticket:
        return session, ticket

    if resp.status_code in (302, 303, 307):
        redirect_url = resp.headers.get("Location")
        if redirect_url:
            redirect_url = urljoin(resp.url, redirect_url)
            resp2 = session.get(redirect_url, allow_redirects=True, timeout=timeout)
            ticket = get_ticket_from_response(resp2)
            if ticket:
                return session, ticket
            if "ticket=" in resp2.url:
                parsed = urlparse(resp2.url)
                qs = parse_qs(parsed.query)
                tickets = qs.get("ticket", [])
                if tickets:
                    return session, tickets[0]

    if "LOGIN" not in html and "login" not in resp.text.lower():
        return session, None

    raise RuntimeError("CAS登录失败，未获得ticket")


def validate_ticket(service_url: str, ticket: str, session: requests.Session, timeout: int = 10) -> bool:
    """用ticket验证服务，返回是否成功"""
    url = f"{service_url}?ticket={ticket}"
    resp = session.get(url, allow_redirects=False, timeout=timeout)
    return resp.status_code in (200, 302, 303)


def extract_name_method(html_content: str) -> str | None:
    soup = BeautifulSoup(html_content, 'html.parser')
    user_name_span = soup.find('span', class_='user-name')
    if user_name_span:
        return user_name_span.get_text(strip=True)
    return None


def sso_login_and_get_name(
    username: str,
    password: str,
    service: str | None = None,
    login_url: str | None = None,
    timeout: int = 10,
) -> str:
    service_url = service or DEFAULT_SERVICE_URL
    login_target = login_url or (DEFAULT_LOGIN_URL_PREFIX + requests.utils.quote(service_url))

    session, ticket = cas_login(
        login_target,
        username,
        password,
        service_url,
        timeout=timeout,
    )

    if ticket:
        if not validate_ticket(service_url, ticket, session, timeout=timeout):
            raise RuntimeError("ticket验证失败")

    resp_home = session.get(service_url, timeout=timeout)
    resp_home.raise_for_status()
    user_name = extract_name_method(resp_home.text)
    if user_name:
        return user_name
    return username
