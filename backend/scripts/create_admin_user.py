from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import bcrypt

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import Config
from backend.repository.user_repository import NotFoundError, UserRepository


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip()


def get_required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} 未配置")
    return value


def hash_password(password: str, cost: int) -> str:
    rounds = cost if 4 <= cost <= 31 else 12
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=rounds))
    return hashed.decode("utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="创建或更新管理员账号")
    parser.add_argument("--env", type=str, default=None, help="指定后端 .env 文件路径")
    args = parser.parse_args()

    cfg = Config(env_file=args.env)
    load_env_file(Path(cfg.env_file))

    username = get_required_env("ADMIN_USERNAME")
    password = get_required_env("ADMIN_PASSWORD")
    display_name = os.getenv("ADMIN_DISPLAY_NAME", "").strip() or username

    repo = UserRepository()
    hashed = hash_password(password, cfg.auth_password_cost)

    try:
        cred = repo.get_credential(username)
        repo.update_credentials(
            user_id=cred.user_id,
            password_hash=hashed,
            password_algo="bcrypt",
            password_cost=cfg.auth_password_cost,
            display_name=display_name,
        )
        print(f"管理员账号已更新: {username}")
    except NotFoundError:
        repo.create_with_password(
            username=username,
            password_hash=hashed,
            password_algo="bcrypt",
            password_cost=cfg.auth_password_cost,
            display_name=display_name,
        )
        print(f"管理员账号已创建: {username}")


if __name__ == "__main__":
    main()
