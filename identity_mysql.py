"""Anonymous identities and read-only administration backed by MySQL."""

import base64
import hashlib
import hmac
import os
import secrets
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote, urlsplit

try:
    import pymysql
    from pymysql.cursors import DictCursor
except ImportError:  # The rest of the site must remain available without MySQL extras.
    pymysql = None
    DictCursor = None


SESSION_IDLE_DAYS = 90
SESSION_ABSOLUTE_DAYS = 180
ACTIVITY_WRITE_SECONDS = 10 * 60
ADMIN_SESSION_SECONDS = 12 * 60 * 60
ADMIN_LOGIN_ATTEMPTS = {}
ADMIN_LOGIN_LOCK = threading.Lock()


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def database_config():
    raw = os.environ.get("MYSQL_URL", "")
    if not raw and os.environ.get("APP_ENV") != "production":
        raw = "mysql://root:root@127.0.0.1:3306/jojo_mysterious_album_dev"
    parsed = urlsplit(raw)
    if parsed.scheme not in {"mysql", "mysql+pymysql"} or not parsed.hostname or not parsed.path.strip("/"):
        raise RuntimeError("mysql_not_configured")
    return {
        "host": parsed.hostname,
        "port": parsed.port or 3306,
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "database": unquote(parsed.path.strip("/")),
        "charset": "utf8mb4",
        "connect_timeout": 5,
        "read_timeout": 8,
        "write_timeout": 8,
        "autocommit": False,
        "cursorclass": DictCursor,
    }


def connection(with_database=True):
    if pymysql is None:
        raise RuntimeError("mysql_driver_not_installed")
    config = database_config()
    if not with_database:
        config.pop("database", None)
    return pymysql.connect(**config)


def token_digest(token):
    pepper = os.environ.get("SESSION_TOKEN_PEPPER", "local-development-only")
    if os.environ.get("APP_ENV") == "production" and len(pepper) < 32:
        raise RuntimeError("session_pepper_not_configured")
    return hmac.new(pepper.encode("utf-8"), token.encode("ascii"), hashlib.sha256).digest()


def new_anonymous_session():
    token = secrets.token_urlsafe(32)
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    now = utcnow()
    expires_at = now + timedelta(days=SESSION_IDLE_DAYS)
    absolute_expires_at = now + timedelta(days=SESSION_ABSOLUTE_DAYS)
    with connection() as db:
        with db.cursor() as cursor:
            cursor.execute(
                "INSERT INTO users (id, kind, status, created_at, last_seen_at) VALUES (%s, 'anonymous', 'active', %s, %s)",
                (user_id.bytes, now, now),
            )
            cursor.execute(
                """INSERT INTO sessions
                   (id, user_id, token_hash, created_at, last_seen_at, expires_at, absolute_expires_at, revoked_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, NULL)""",
                (session_id.bytes, user_id.bytes, token_digest(token), now, now, expires_at, absolute_expires_at),
            )
        db.commit()
    return {
        "token": token,
        "user_id": str(user_id),
        "expires_at": expires_at,
        "absolute_expires_at": absolute_expires_at,
    }


def resume_anonymous_session(token):
    if not token or len(token) > 128:
        return None
    now = utcnow()
    with connection() as db:
        with db.cursor() as cursor:
            cursor.execute(
                """SELECT s.id, s.user_id, s.last_seen_at, s.expires_at, s.absolute_expires_at,
                          u.kind, u.status
                   FROM sessions s JOIN users u ON u.id = s.user_id
                   WHERE s.token_hash = %s AND s.revoked_at IS NULL
                     AND s.expires_at > %s AND s.absolute_expires_at > %s
                   LIMIT 1""",
                (token_digest(token), now, now),
            )
            row = cursor.fetchone()
            if not row or row["status"] != "active":
                return None
            expires_at = row["expires_at"]
            if (now - row["last_seen_at"]).total_seconds() >= ACTIVITY_WRITE_SECONDS:
                expires_at = min(now + timedelta(days=SESSION_IDLE_DAYS), row["absolute_expires_at"])
                cursor.execute(
                    "UPDATE sessions SET last_seen_at = %s, expires_at = %s WHERE id = %s",
                    (now, expires_at, row["id"]),
                )
                cursor.execute("UPDATE users SET last_seen_at = %s WHERE id = %s", (now, row["user_id"]))
                db.commit()
    return {
        "token": token,
        "user_id": str(uuid.UUID(bytes=row["user_id"])),
        "expires_at": expires_at,
        "absolute_expires_at": row["absolute_expires_at"],
    }


def bootstrap_anonymous(token):
    resumed = resume_anonymous_session(token)
    return (resumed, False) if resumed else (new_anonymous_session(), True)


def parse_uuid(value):
    try:
        return uuid.UUID(str(value)).bytes
    except (ValueError, TypeError, AttributeError):
        raise ValueError("invalid_user_id") from None


def list_users(page=1, page_size=50, status="", activity="", sort="created_desc", user_id=""):
    page = max(1, int(page))
    page_size = max(1, min(100, int(page_size)))
    clauses = []
    params = []
    if status in {"active", "disabled"}:
        clauses.append("u.status = %s")
        params.append(status)
    online_after = utcnow() - timedelta(minutes=10)
    if activity == "online":
        clauses.append("u.last_seen_at >= %s")
        params.append(online_after)
    elif activity == "offline":
        clauses.append("u.last_seen_at < %s")
        params.append(online_after)
    if user_id:
        clauses.append("u.id = %s")
        params.append(parse_uuid(user_id))
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    orders = {
        "created_asc": "u.created_at ASC, u.id ASC",
        "created_desc": "u.created_at DESC, u.id DESC",
        "active_asc": "u.last_seen_at ASC, u.id ASC",
        "active_desc": "u.last_seen_at DESC, u.id DESC",
    }
    order = orders.get(sort, orders["created_desc"])
    with connection() as db:
        with db.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM users u {where}", params)
            total = int(cursor.fetchone()["total"])
            cursor.execute(
                f"""SELECT u.id, u.kind, u.status, u.created_at, u.last_seen_at,
                           SUM(CASE WHEN s.revoked_at IS NULL AND s.expires_at > %s
                                    AND s.absolute_expires_at > %s THEN 1 ELSE 0 END) AS active_session_count,
                           MAX(CASE WHEN s.revoked_at IS NULL AND s.expires_at > %s
                                    AND s.absolute_expires_at > %s THEN s.expires_at ELSE NULL END) AS latest_session_expires_at
                    FROM users u LEFT JOIN sessions s ON s.user_id = u.id
                    {where}
                    GROUP BY u.id, u.kind, u.status, u.created_at, u.last_seen_at
                    ORDER BY {order} LIMIT %s OFFSET %s""",
                [utcnow(), utcnow(), utcnow(), utcnow(), *params, page_size, (page - 1) * page_size],
            )
            rows = cursor.fetchall()
    return {
        "items": [serialize_user(row, online_after) for row in rows],
        "page": page,
        "pageSize": page_size,
        "total": total,
    }


def serialize_user(row, online_after=None):
    online_after = online_after or (utcnow() - timedelta(minutes=10))
    return {
        "id": str(uuid.UUID(bytes=row["id"])),
        "kind": row["kind"],
        "status": row["status"],
        "createdAt": iso_utc(row["created_at"]),
        "lastSeenAt": iso_utc(row["last_seen_at"]),
        "online": row["last_seen_at"] >= online_after,
        "activeSessionCount": int(row.get("active_session_count") or 0),
        "latestSessionExpiresAt": iso_utc(row.get("latest_session_expires_at")),
    }


def user_detail(user_id):
    user_bytes = parse_uuid(user_id)
    now = utcnow()
    with connection() as db:
        with db.cursor() as cursor:
            cursor.execute("SELECT id, kind, status, created_at, last_seen_at FROM users WHERE id = %s", (user_bytes,))
            user = cursor.fetchone()
            if not user:
                return None
            cursor.execute(
                """SELECT id, created_at, last_seen_at, expires_at, absolute_expires_at, revoked_at
                   FROM sessions WHERE user_id = %s ORDER BY created_at DESC LIMIT 100""",
                (user_bytes,),
            )
            sessions = cursor.fetchall()
    result = serialize_user({**user, "active_session_count": sum(
        1 for row in sessions if not row["revoked_at"] and row["expires_at"] > now and row["absolute_expires_at"] > now
    ), "latest_session_expires_at": max(
        (row["expires_at"] for row in sessions if not row["revoked_at"] and row["expires_at"] > now), default=None
    )})
    result["sessions"] = [{
        "id": str(uuid.UUID(bytes=row["id"])),
        "createdAt": iso_utc(row["created_at"]),
        "lastSeenAt": iso_utc(row["last_seen_at"]),
        "expiresAt": iso_utc(row["expires_at"]),
        "absoluteExpiresAt": iso_utc(row["absolute_expires_at"]),
        "revokedAt": iso_utc(row["revoked_at"]),
        "active": not row["revoked_at"] and row["expires_at"] > now and row["absolute_expires_at"] > now,
    } for row in sessions]
    return result


def scrypt_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=32)
    encode = lambda value: base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")
    return f"scrypt$16384$8$1${encode(salt)}${encode(digest)}"


def verify_admin_password(password, encoded):
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$", 5)
        if algorithm != "scrypt":
            return False
        decode = lambda value: base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
        actual = hashlib.scrypt(password.encode("utf-8"), salt=decode(salt), n=int(n), r=int(r), p=int(p), dklen=32)
        return hmac.compare_digest(actual, decode(expected))
    except (ValueError, TypeError):
        return False


def admin_login_allowed(client):
    now = time.monotonic()
    with ADMIN_LOGIN_LOCK:
        attempts = [item for item in ADMIN_LOGIN_ATTEMPTS.get(client, []) if now - item < 600]
        ADMIN_LOGIN_ATTEMPTS[client] = attempts
        return len(attempts) < 6


def record_admin_login(client, success):
    with ADMIN_LOGIN_LOCK:
        if success:
            ADMIN_LOGIN_ATTEMPTS.pop(client, None)
        else:
            ADMIN_LOGIN_ATTEMPTS.setdefault(client, []).append(time.monotonic())


def admin_secret():
    value = os.environ.get("ADMIN_SESSION_SECRET", "")
    if os.environ.get("APP_ENV") == "production" and len(value) < 32:
        raise RuntimeError("admin_not_configured")
    return (value or "local-admin-session-only").encode("utf-8")


def make_admin_session(username):
    expiry = int(time.time()) + ADMIN_SESSION_SECONDS
    value = f"{expiry}.{secrets.token_urlsafe(12)}.{username}"
    signature = hmac.new(admin_secret(), value.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{value}.{signature}"


def valid_admin_session(value):
    try:
        expiry, nonce, username, signature = value.split(".", 3)
        unsigned = f"{expiry}.{nonce}.{username}"
        expected = hmac.new(admin_secret(), unsigned.encode("utf-8"), hashlib.sha256).hexdigest()
        configured = os.environ.get("ADMIN_USERNAME", "admin")
        return int(expiry) >= int(time.time()) and username == configured and hmac.compare_digest(signature, expected)
    except (ValueError, RuntimeError):
        return False

