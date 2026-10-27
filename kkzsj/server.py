"""Isolated /kkzsj identities, progress and analytics; no SDK credentials yet."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import string
import sys
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import serve

PREFIX = '/kkzsj'
COOKIE = 'kkzsj_session'
TTL = 180 * 86400


def init():
    serve.init_analytics()
    with serve.analytics_connection() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS kk_users (
          uid TEXT PRIMARY KEY, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          login_kind TEXT NOT NULL DEFAULT 'guest', login_at INTEGER,
          state_json TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS kk_sessions (
          token_hash TEXT PRIMARY KEY, uid TEXT NOT NULL, expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS kk_completions (
          uid TEXT NOT NULL, run_id TEXT NOT NULL, theme TEXT NOT NULL, completed_at INTEGER NOT NULL,
          PRIMARY KEY(uid,run_id,theme));
        ''')


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def resolve(token):
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token or ''):
        return None
    with serve.analytics_connection() as db:
        row = db.execute('SELECT u.* FROM kk_users u JOIN kk_sessions s ON u.uid=s.uid WHERE s.token_hash=? AND s.expires_at>?', (token_hash(token), int(time.time()))).fetchone()
    return dict(row) if row else None


def bootstrap(token):
    existing = resolve(token)
    if existing:
        return existing, None
    now = int(time.time())
    with serve.analytics_connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if db.execute('SELECT COUNT(*) FROM kk_users').fetchone()[0] >= 28080:
            raise ValueError('uid_capacity_reached')
        for _ in range(1000):
            uid = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(3))
            if not any(c.isalpha() for c in uid) or not any(c.isdigit() for c in uid):
                continue
            try:
                db.execute('INSERT INTO kk_users(uid,created_at,updated_at) VALUES(?,?,?)', (uid, now, now))
                break
            except sqlite3.IntegrityError:
                continue
        else:
            raise ValueError('uid_allocation_busy')
        token = secrets.token_urlsafe(32)
        db.execute('INSERT INTO kk_sessions VALUES(?,?,?)', (token_hash(token), uid, now + TTL))
    return resolve(token), token


def public_user(row):
    return {'uid': row['uid'], 'kind': row['login_kind'], 'sdkConnected': False}


def validate_state(state):
    if not isinstance(state, dict) or set(state) - {'game', 'tour', 'pending'}:
        raise ValueError('invalid_state')
    game = state.get('game')
    if game is not None:
        if not isinstance(game, dict) or not isinstance(game.get('journeys', {}), dict) or len(game.get('journeys', {})) > 30:
            raise ValueError('invalid_game')
        if not isinstance(game.get('age'), int) or not 3 <= game['age'] <= 10:
            raise ValueError('invalid_age')
    if not isinstance(state.get('tour', {}), dict):
        raise ValueError('invalid_tour')
    pending = state.get('pending')
    if pending is not None and (not isinstance(pending, dict) or not isinstance(pending.get('age'), int) or not 3 <= pending['age'] <= 10 or not isinstance(pending.get('reset'), bool)):
        raise ValueError('invalid_continuation')
    if len(json.dumps(state)) > 1_500_000:
        raise ValueError('state_too_large')
    return state


def save_state(uid, state, revision):
    validate_state(state)
    with serve.analytics_connection() as db:
        db.execute('BEGIN IMMEDIATE')
        current = db.execute('SELECT revision FROM kk_users WHERE uid=?', (uid,)).fetchone()[0]
        if revision != current:
            return None
        now = int(time.time())
        for key, journey in (state.get('game') or {}).get('journeys', {}).items():
            if isinstance(journey, dict) and journey.get('completed') and isinstance(journey.get('runId'), str):
                db.execute('INSERT OR IGNORE INTO kk_completions VALUES(?,?,?,?)', (uid, journey['runId'][:64], key[:80], now))
        db.execute('UPDATE kk_users SET state_json=?,updated_at=?,revision=revision+1 WHERE uid=?', (json.dumps(state), now, uid))
    return current + 1


class Handler(serve.NoCacheHandler):
    def send_head(self):
        return SimpleHTTPRequestHandler.send_head(self)

    def user(self):
        return resolve(self.cookie(COOKIE))

    def data_authorized(self):
        return serve.valid_data_session(self.cookie('kkzsj_data_session'))

    def respond_cookie_json(self, status, payload, name, value, max_age, same_site='Lax'):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        cookie = f'{name}={value}; Path=/kkzsj; HttpOnly; SameSite={same_site}; Max-Age={max_age}'
        if self.secure_request():
            cookie += '; Secure'
        self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(data)

    def respond_data_session(self, value):
        self.respond_cookie_json(200, {'ok': bool(value)}, 'kkzsj_data_session', value, serve.DATA_SESSION_SECONDS if value else 0, 'Strict')

    def do_HEAD(self):
        self.do_GET(head=True)

    def do_GET(self, head=False):
        path = urlsplit(self.path).path
        if path == PREFIX + '/api/health':
            with serve.analytics_connection() as db:
                db.execute('SELECT 1 FROM kk_users LIMIT 1').fetchone()
            return self.respond_json(200, {'ok':True, 'edition':'kkzsj', 'sdkConnected':False})
        if path == PREFIX + '/api/session':
            user = self.user()
            return self.respond_json(200, {'user': public_user(user), 'state': json.loads(user['state_json']), 'revision': user['revision']}) if user else self.respond_json(401, {'error': 'session_required'})
        if path == PREFIX + '/api/data/accounts':
            if not self.data_authorized():
                return self.respond_json(401, {'error': 'unauthorized'})
            with serve.analytics_connection() as db:
                totals = dict(db.execute("SELECT COUNT(*) total, SUM(login_kind='mock') mock_logins FROM kk_users").fetchone())
                rows = db.execute('SELECT u.uid,u.login_kind,u.created_at,u.updated_at,u.login_at,(SELECT COUNT(*) FROM kk_completions c WHERE c.uid=u.uid) completed_chapters FROM kk_users u ORDER BY updated_at DESC LIMIT 200').fetchall()
            return self.respond_json(200, {'totals': totals, 'users': [dict(r) for r in rows], 'sdkConnected': False})
        if path.startswith(PREFIX + '/api/'):
            if path not in {PREFIX + '/api/data/summary', PREFIX + '/api/data/session', PREFIX + '/api/health'}:
                return self.respond_json(404, {'error': 'not_found'})
            self.path = self.path[len(PREFIX):]
            return super().do_GET()
        # Serve only the isolated public entrypoints and asset trees, never Python/config/data.
        relative = unquote(path[len(PREFIX):]).strip('/') if path == PREFIX or path.startswith(PREFIX + '/') else None
        if relative is None or '..' in relative.split('/'):
            return self.respond_json(404, {'error': 'not_found'})
        aliases = {'': 'kkzsj/index.html', 'login': 'kkzsj/login.html', 'data': 'kkzsj/data.html', 'changelog': 'changelog/index.html', 'favicon.ico': 'favicon.ico'}
        target = aliases.get(relative)
        if not target:
            allowed = relative.startswith(('assets/', 'vendor/', 'src/', 'dev/', 'kkzsj/')) and Path(relative).suffix in {'.js', '.css', '.json', '.webp', '.png', '.jpg', '.svg', '.ico', '.ttf', '.woff2', '.mp3', '.wav', '.ogg', '.wasm'}
            if not allowed:
                return self.respond_json(404, {'error': 'not_found'})
            target = relative
        self.path = '/' + target
        if head:
            return SimpleHTTPRequestHandler.do_HEAD(self)
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        path = urlsplit(self.path).path
        if not path.startswith(PREFIX + '/api/'):
            return self.respond_json(404, {'error': 'not_found'})
        if not self.origin_allowed():
            return self.respond_json(403, {'error': 'origin_not_allowed'})
        try:
            if path == PREFIX + '/api/session':
                self.read_json(1024)
                row, token = bootstrap(self.cookie(COOKIE))
                payload = {'user': public_user(row), 'state': json.loads(row['state_json']), 'revision': row['revision']}
                if token:
                    return self.respond_cookie_json(201, payload, COOKIE, token, TTL)
                return self.respond_json(200, payload)
            if path in {PREFIX + '/api/progress', PREFIX + '/api/login/mock'}:
                user = self.user()
                if not user:
                    return self.respond_json(401, {'error': 'session_required'})
                payload = self.read_json(1_500_000)
                if path.endswith('/progress'):
                    revision = save_state(user['uid'], payload.get('state'), payload.get('revision'))
                    return self.respond_json(409, {'error': 'progress_conflict'}) if revision is None else self.respond_json(200, {'revision': revision})
                if os.environ.get('KKZSJ_MOCK_LOGIN', '1') != '1':
                    return self.respond_json(503, {'error': 'sdk_not_connected'})
                with serve.analytics_connection() as db:
                    completed = db.execute('SELECT COUNT(*) FROM kk_completions WHERE uid=?', (user['uid'],)).fetchone()[0]
                    if not completed:
                        return self.respond_json(409, {'error': 'complete_chapter_first'})
                    db.execute("UPDATE kk_users SET login_kind='mock',login_at=?,updated_at=? WHERE uid=?", (int(time.time()), int(time.time()), user['uid']))
                return self.respond_json(200, {'user': public_user(self.user()), 'simulated': True})
            if path in {PREFIX + '/api/analytics/collect', PREFIX + '/api/analytics/word', PREFIX + '/api/analytics/voice'}:
                if not self.user():
                    return self.respond_json(401, {'error': 'session_required'})
            elif path not in {PREFIX + '/api/data/login', PREFIX + '/api/data/logout'}:
                return self.respond_json(404, {'error': 'not_found'})
            self.path = self.path[len(PREFIX):]
            return super().do_POST()
        except (ValueError, TypeError, AttributeError, json.JSONDecodeError):
            self.respond_json(400, {'error': 'invalid_request'})


# This module is a dedicated process. Analytics resolves only its own opaque Cookie.
serve.analytics_user_id = lambda handler: (handler.user() or {}).get('uid', '')

if __name__ == '__main__':
    serve.ANALYTICS_DB = Path(os.environ.get('KKZSJ_DB_PATH', '/tmp/kkzsj-dev.db'))
    init()
    ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('PORT', '8854'))), partial(Handler, directory=str(serve.ROOT))).serve_forever()
