#!/usr/bin/env python3
"""Create the anonymous identity database and apply ordered SQL migrations."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from identity_mysql import connection, database_config


def load_local_env():
    path = ROOT / ".env.local"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main():
    load_local_env()
    config = database_config()
    database = config["database"]
    if not database.replace("_", "").isalnum():
        raise RuntimeError("invalid_database_name")
    with connection(with_database=False) as db:
        with db.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
            )
        db.commit()
    with connection() as db:
        with db.cursor() as cursor:
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS schema_migrations (
                       name VARCHAR(255) PRIMARY KEY,
                       applied_at DATETIME(3) NOT NULL
                   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"""
            )
            for path in sorted((ROOT / "db" / "migrations").glob("*.sql")):
                cursor.execute("SELECT 1 FROM schema_migrations WHERE name = %s", (path.name,))
                if cursor.fetchone():
                    continue
                statements = [part.strip() for part in path.read_text(encoding="utf-8").split(";") if part.strip()]
                for statement in statements:
                    cursor.execute(statement)
                cursor.execute("INSERT INTO schema_migrations (name, applied_at) VALUES (%s, UTC_TIMESTAMP(3))", (path.name,))
                print(f"applied {path.name}")
        db.commit()


if __name__ == "__main__":
    main()
