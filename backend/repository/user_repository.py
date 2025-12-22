from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from backend.models.auth import Session, User, UserCredential
from backend.db import db_session


class NotFoundError(Exception):
    pass


class UserRepository:
    def __init__(self) -> None:
        self._ensure_tables()

    def _ensure_tables(self) -> None:
        with db_session() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY,
                        username TEXT NOT NULL UNIQUE,
                        display_name TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        password_algo TEXT NOT NULL,
                        password_cost INT NOT NULL,
                        roles TEXT[] NOT NULL DEFAULT '{}',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        last_login_at TIMESTAMPTZ
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS sessions (
                        id UUID PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        refresh_token_sha TEXT NOT NULL UNIQUE,
                        expires_at TIMESTAMPTZ NOT NULL,
                        user_agent TEXT,
                        ip TEXT,
                        revoked_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                    """
                )
                cur.execute("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);")
            conn.commit()

    def get_credential(self, username: str) -> UserCredential:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, username, password_hash, password_algo, password_cost
                FROM users
                WHERE username = %s
                """,
                (username,),
            )
            row = cur.fetchone()
        if not row:
            raise NotFoundError("credential not found")
        return UserCredential(
            user_id=row["id"],
            username=row["username"],
            password_hash=row["password_hash"],
            password_algo=row["password_algo"],
            password_cost=row["password_cost"],
        )

    def get_by_id(self, user_id: UUID) -> User:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, username, display_name, password_hash, password_algo, password_cost,
                       roles, created_at, updated_at, last_login_at
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
        if not row:
            raise NotFoundError("user not found")
        return self._row_to_user(row)

    def create_with_password(
        self,
        username: str,
        password_hash: str,
        password_algo: str,
        password_cost: int,
        display_name: str | None = None,
    ) -> User:
        uid = uuid4()
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (
                    id, username, display_name, password_hash, password_algo, password_cost
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, username, display_name, password_hash, password_algo, password_cost,
                          roles, created_at, updated_at, last_login_at
                """,
                (
                    uid,
                    username,
                    display_name or username,
                    password_hash,
                    password_algo,
                    password_cost,
                ),
            )
            row = cur.fetchone()
            conn.commit()
        return self._row_to_user(row)

    def create_session(self, session: Session) -> None:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (
                    id, user_id, refresh_token_sha, expires_at, user_agent, ip, revoked_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    session.id,
                    session.user_id,
                    session.refresh_token_sha,
                    session.expires_at,
                    session.user_agent,
                    session.ip,
                    session.revoked_at,
                    session.created_at,
                ),
            )
            conn.commit()

    def get_session_by_hash(self, refresh_token_sha: str) -> Session:
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, refresh_token_sha, expires_at, user_agent, ip, revoked_at, created_at
                FROM sessions
                WHERE refresh_token_sha = %s
                """,
                (refresh_token_sha,),
            )
            row = cur.fetchone()
        if not row:
            raise NotFoundError("session not found")
        return self._row_to_session(row)

    def revoke_session(self, session_id: UUID) -> None:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sessions
                SET revoked_at = %s
                WHERE id = %s AND revoked_at IS NULL
                """,
                (now, session_id),
            )
            conn.commit()

    def record_login(self, user_id: UUID) -> None:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET last_login_at = %s, updated_at = %s WHERE id = %s",
                (now, now, user_id),
            )
            conn.commit()

    def update_credentials(
        self,
        user_id: UUID,
        password_hash: str,
        password_algo: str,
        password_cost: int,
        display_name: str | None = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        with db_session() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET password_hash = %s,
                    password_algo = %s,
                    password_cost = %s,
                    display_name = COALESCE(%s, display_name),
                    updated_at = %s
                WHERE id = %s
                """,
                (password_hash, password_algo, password_cost, display_name, now, user_id),
            )
            conn.commit()

    def _row_to_user(self, row: dict) -> User:
        return User(
            id=row["id"],
            username=row["username"],
            display_name=row["display_name"],
            password_hash=row["password_hash"],
            password_algo=row["password_algo"],
            password_cost=row["password_cost"],
            roles=row.get("roles") or [],
            created_at=row["created_at"],
            updated_at=row.get("updated_at"),
            last_login_at=row.get("last_login_at"),
        )

    def _row_to_session(self, row: dict) -> Session:
        return Session(
            id=row["id"],
            user_id=row["user_id"],
            refresh_token_sha=row["refresh_token_sha"],
            expires_at=row["expires_at"],
            user_agent=row.get("user_agent"),
            ip=row.get("ip"),
            revoked_at=row.get("revoked_at"),
            created_at=row["created_at"],
        )


__all__ = ["UserRepository", "NotFoundError"]
