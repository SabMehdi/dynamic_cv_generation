import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "cv_versions.db"
DATABASE_URL = os.environ.get("DATABASE_URL")


def get_conn():
    if DATABASE_URL:
        return psycopg.connect(DATABASE_URL)

    # fallback for local development without env var
    import sqlite3

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    if DATABASE_URL:
        last_err = None
        for attempt in range(6):
            try:
                conn = get_conn()
                break
            except Exception as exc:
                last_err = exc
                time.sleep(2)
        else:
            raise last_err
    else:
        conn = get_conn()

    try:
        if DATABASE_URL:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS versions (
                        id SERIAL PRIMARY KEY,
                        name TEXT,
                        data JSONB NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
                conn.commit()
        else:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.commit()
    finally:
        conn.close()


def save_version(name: Optional[str], data: Dict[str, Any]) -> int:
    conn = get_conn()
    try:
        if DATABASE_URL:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO versions (name, data) VALUES (%s, %s) RETURNING id",
                    (name, json.dumps(data, ensure_ascii=False),),
                )
                vid = cur.fetchone()[0]
                conn.commit()
                return int(vid)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO versions (name, data) VALUES (?, ?)",
            (name, json.dumps(data, ensure_ascii=False),),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def list_versions(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_conn()
    try:
        if DATABASE_URL:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    "SELECT id, name, created_at FROM versions ORDER BY id DESC LIMIT %s",
                    (limit,),
                )
                return [dict(row) for row in cur.fetchall()]
        cur = conn.cursor()
        cur.execute("SELECT id, name, created_at FROM versions ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def get_version(vid: int) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    try:
        if DATABASE_URL:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute("SELECT data FROM versions WHERE id = %s", (vid,))
                row = cur.fetchone()
        else:
            cur = conn.cursor()
            cur.execute("SELECT data FROM versions WHERE id = ?", (vid,))
            row = cur.fetchone()
        if not row:
            return None
        data_val = row["data"] if DATABASE_URL else row[0]
        if isinstance(data_val, (dict, list)):
            return data_val
        return json.loads(data_val)
    finally:
        conn.close()
