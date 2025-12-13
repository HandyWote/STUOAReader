from __future__ import annotations

from typing import List, Optional

import requests

from config.config import Config


class Embedder:
    """向量化模块（OpenAI embeddings 兼容）。"""

    def __init__(self, config: Optional[Config] = None) -> None:
        self.config = config or Config()

    def embed_batch(self, texts: List[str]) -> List[List[float]] | None:
        cfg = self.config
        if not (cfg.embed_base_url and cfg.embed_model and cfg.embed_api_key):
            print("Embedding 配置缺失，跳过向量化")
            return None

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg.embed_api_key}",
        }
        payload = {"model": cfg.embed_model, "input": texts}
        try:
            resp = requests.post(cfg.embed_base_url, json=payload, headers=headers, timeout=60)
            if resp.status_code != 200:
                print(f"Embedding API 状态码异常: {resp.status_code}")
                return None
            data = resp.json()
            items = data.get("data") or []
            embeddings: List[List[float]] = []
            for entry in items:
                emb = entry.get("embedding")
                if isinstance(emb, list):
                    embeddings.append(emb)
            if len(embeddings) != len(texts):
                print("Embedding 数量与输入不一致")
                return None
            return embeddings
        except requests.RequestException as exc:
            print(f"调用 Embedding 失败: {exc}")
            return None
