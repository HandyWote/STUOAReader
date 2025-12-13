from __future__ import annotations

import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from crawler.models import ArticleMeta, DetailResult

BASE_URL = "http://oa.stu.edu.cn"
LIST_URL = f"{BASE_URL}/login/Login.jsp?logintype=1"
DETAIL_PAYLOAD = {"pageindex": "1", "pagesize": "50", "fwdw": "-1"}


def _post(url: str, data: dict | None = None) -> str | None:
    try:
        resp = requests.post(url, data=data, timeout=30)
        if resp.status_code == 200:
            return resp.text
        print(f"请求失败: {url} status={resp.status_code}")
    except requests.RequestException as exc:
        print(f"请求 {url} 失败: {exc}")
    return None


def fetch_list(target_date: str) -> list[ArticleMeta]:
    page = _post(LIST_URL, DETAIL_PAYLOAD)
    if not page:
        return []

    soup = BeautifulSoup(page, "html.parser")
    tbody = soup.find("tbody")
    if not tbody:
        return []

    results: list[ArticleMeta] = []
    for row in tbody.find_all("tr", class_="datalight"):
        cells = row.find_all("td")
        if len(cells) < 3:
            continue

        link_tag = cells[0].find("a")
        if not link_tag:
            continue

        date_str = cells[2].get_text(strip=True)
        if date_str != target_date:
            continue

        href = link_tag.get("href", "").strip()
        if not href:
            continue

        results.append(
            ArticleMeta(
                title=link_tag.get("title", "").strip() or link_tag.get_text(strip=True),
                unit=cells[1].get_text(strip=True),
                link=urljoin(BASE_URL, href),
                published_on=date_str,
            )
        )
    return results


def _clean_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())


def _parse_attachments(soup: BeautifulSoup) -> list[dict[str, str]]:
    attachments: list[dict[str, str]] = []
    for row in soup.select("tr[id^=accessory_dsp_tr_]"):
        tds = row.find_all("td")
        name = ""
        if len(tds) >= 2:
            name = tds[1].get_text(strip=True)

        button = row.find("button", onclick=True)
        if not button:
            continue
        onclick = button.get("onclick", "")
        match = re.search(r"['\"](\/weaver\/weaver\.file\.FileDownload[^'\"]+)['\"]", onclick)
        if not match:
            continue
        url = urljoin(BASE_URL, match.group(1))
        attachments.append({"名称": name, "链接": url})
    return attachments


def fetch_detail(link: str) -> DetailResult:
    html = _post(link, DETAIL_PAYLOAD)
    if not html:
        return DetailResult("", [])

    soup = BeautifulSoup(html, "html.parser")
    attachments = _parse_attachments(soup)
    content = _clean_text(soup)

    if attachments:
        attach_lines = [f"附件: {item.get('名称','')} ({item.get('链接','')})" for item in attachments]
        content = f"{content}\n" + "\n".join(attach_lines)

    return DetailResult(content=content, attachments=attachments)
