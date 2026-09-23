"""Server-side Doubao end-to-end voice bridge; browser never receives credentials.
Protocol: https://www.volcengine.com/docs/6561/1594356?lang=zh
The legacy ASR + TTS path remains in volc_asr.py and dev/voice.js.
"""
import base64
import gzip
import hashlib
import json
import os
import re
import struct
import threading
import time
import uuid
from volc_asr import _WebSocket, speech_hotwords

SLOTS = threading.BoundedSemaphore(8)
ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/realtime/dialogue'


def packet(event, payload, session=''):
    audio = isinstance(payload, bytes)
    data = payload if audio else json.dumps(payload, ensure_ascii=False).encode()
    header = bytes((0x11, 0x24 if audio else 0x14, 0 if audio else 0x10, 0))
    identity = session.encode()
    return header + struct.pack('>I', event) + (struct.pack('>I', len(identity)) + identity if session else b'') + struct.pack('>I', len(data)) + data


def unpack(data):
    if len(data) < 8:
        raise ValueError('short_event')
    kind, flags = data[1] >> 4, data[1] & 15
    offset = (data[0] & 15) * 4
    def number():
        nonlocal offset
        n = struct.unpack_from('>I', data, offset)[0]; offset += 4
        return n
    if kind == 15:
        raise RuntimeError('realtime_upstream_error:' + str(number()))
    if flags & 1:
        number()
    event = number() if flags & 4 else 0
    # Server connection and session events both carry an identity.
    size = number(); offset += size
    size = number()
    body = data[offset:offset + size]
    if len(body) != size:
        raise ValueError('truncated_event')
    if data[2] & 15 == 1:
        body = gzip.decompress(body)
    return event, json.loads(body) if data[2] >> 4 == 1 else body


def connect():
    app = os.environ.get('VOLC_REALTIME_APP_ID') or os.environ.get('VOLC_SPEECH_APP_ID')
    token = os.environ.get('VOLC_REALTIME_ACCESS_TOKEN') or os.environ.get('VOLC_SPEECH_ACCESS_TOKEN')
    if not app or not token:
        raise RuntimeError('realtime_not_configured')
    return _WebSocket(ENDPOINT, {'X-Api-App-ID': app, 'X-Api-Access-Key': token,
        'X-Api-Resource-Id': 'volc.speech.dialog', 'X-Api-App-Key': 'PlgvMymc7f3tQnJ6',
        'X-Api-Connect-Id': str(uuid.uuid4())}, timeout=12)


def session_config(lesson='', mode='game'):
    return {
        'asr': {'extra': {'enable_custom_vad': True, 'end_smooth_window_ms': 700,
            'enable_asr_twopass': True, 'context': {'hotwords': speech_hotwords()}}},
        'tts': {'speaker': 'zh_female_vv_jupiter_bigtts',
            'audio_config': {'channel': 1, 'format': 'pcm_s16le', 'sample_rate': 24000, 'speech_rate': -10}},
        'dialog': {'bot_name': 'English Playmate',
            'system_role': 'You are a friendly English tutor in a 3D word game for children ages 3 to 10. '
                'Speak ONLY English, even if the child speaks Chinese. For non-English input say only: Let us try it in English. '
                'Use one short encouraging sentence, at most 12 words. Accept playful nouns and adjectives. '
                'JOJO, BOBO and DOMI are character names. Never claim a scene action succeeded or advance a lesson; the game handles those. '
                + ('You are DOMI welcoming a new player. Ask for a nickname, then their age (three to ten), one question at a time. After both, invite them to tap Start. Never request any other personal information or contact details. ' if mode == 'onboarding' else 'Never request personal information. ') + 'Do not discuss adult topics. Current example: ' + lesson[:180],
            'speaking_style': ('Speak as DOMI with a playful young child voice, light and bright, in clear gentle English.' if mode == 'onboarding' else 'A warm, gentle female voice, unhurried and softly encouraging, with clear slow English for children.'),
            'extra': {'model': '1.2.1.1', 'strict_audit': True, 'enable_volc_websearch': False}}}


class BrowserSocket:
    def __init__(self, handler):
        self.handler = handler
        self.lock = threading.Lock()
    def send(self, value):
        raw = isinstance(value, bytes)
        data = value if raw else json.dumps(value).encode()
        n = len(data)
        header = bytes((0x82 if raw else 0x81, n)) if n < 126 else bytes((0x82 if raw else 0x81, 126)) + struct.pack('>H', n) if n < 65536 else bytes((0x82 if raw else 0x81, 127)) + struct.pack('>Q', n)
        with self.lock:
            self.handler.connection.sendall(header + data)
    def receive(self):
        def read(n):
            data = self.handler.rfile.read(n)
            if len(data) != n:
                raise EOFError()
            return data
        a, b = read(2)
        if a & 15 == 8:
            raise EOFError()
        if not a & 128 or not b & 128 or a & 112:
            raise ValueError('unsupported_frame')
        n = b & 127
        if n == 126: n = struct.unpack('>H', read(2))[0]
        elif n == 127: n = struct.unpack('>Q', read(8))[0]
        if n > 128000 or a & 15 not in (1, 2):
            raise ValueError('invalid_frame')
        mask, data = read(4), read(n)
        data = bytes(v ^ mask[i % 4] for i, v in enumerate(data))
        return data if a & 15 == 2 else json.loads(data)


def serve_realtime(handler):
    if not handler.origin_allowed():
        handler.respond_json(403, {'error': 'origin_not_allowed'}); return
    key = handler.headers.get('Sec-WebSocket-Key', '')
    try:
        if len(base64.b64decode(key, validate=True)) != 16 or handler.headers.get('Upgrade', '').lower() != 'websocket':
            raise ValueError()
    except ValueError:
        handler.respond_json(400, {'error': 'invalid_upgrade'}); return
    if not SLOTS.acquire(blocking=False):
        handler.respond_json(429, {'error': 'realtime_busy'}); return
    upstream = None
    closed = threading.Event()
    try:
        try:
            upstream = connect()
            upstream.send_binary(packet(1, {}))
            event, _ = unpack(upstream.receive_binary())
            if event != 50: raise RuntimeError('realtime_connection_rejected')
        except Exception:
            handler.respond_json(503, {'error': 'realtime_unavailable', 'fallback': 'legacy'}); return
        accept = base64.b64encode(hashlib.sha1((key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        handler.protocol_version = 'HTTP/1.1'
        handler.send_response(101); handler.send_header('Upgrade', 'websocket'); handler.send_header('Connection', 'Upgrade'); handler.send_header('Sec-WebSocket-Accept', accept); handler.end_headers(); handler.wfile.flush()
        handler.close_connection = True
        handler.connection.settimeout(35)
        browser = BrowserSocket(handler)
        init = browser.receive()
        if not isinstance(init, dict) or init.get('type') != 'start': raise ValueError('start_required')
        sid = str(uuid.uuid4())
        upstream.send_binary(packet(100, session_config(str(init.get('lesson', '')), 'onboarding' if init.get('mode') == 'onboarding' else 'game'), sid))
        event, _ = unpack(upstream.receive_binary())
        if event != 150: raise RuntimeError('realtime_session_rejected')
        upstream.socket.settimeout(35)
        browser.send({'type': 'ready', 'model': '1.2.1.1'})
        def receive():
            try:
                while not closed.is_set():
                    event, body = unpack(upstream.receive_binary())
                    if isinstance(body, bytes): browser.send(body)
                    else: browser.send({'type': 'event', 'event': event, 'data': body})
            except Exception:
                if not closed.is_set():
                    try: browser.send({'type': 'error', 'error': 'realtime_disconnected'})
                    except OSError: pass
                closed.set()
                try: handler.connection.shutdown(2)
                except OSError: pass
        worker = threading.Thread(target=receive, daemon=True); worker.start()
        deadline, audio_bytes, controls = time.monotonic() + 300, 0, 0
        while not closed.is_set() and time.monotonic() < deadline:
            value = browser.receive()
            if isinstance(value, bytes):
                audio_bytes += len(value)
                if len(value) % 2 or audio_bytes > 16000 * 2 * 305: raise ValueError('audio_limit')
                upstream.send_binary(packet(200, value, sid))
            elif isinstance(value, dict):
                controls += 1
                if controls > 600: raise ValueError('control_limit')
                kind, text = value.get('type'), str(value.get('text', ''))[:240]
                if kind == 'say' and re.search('[a-zA-Z]', text) and not re.search('[\u3400-\u9fff]', text):
                    upstream.send_binary(packet(500, {'start': True, 'content': text, 'end': True}, sid))
                elif kind == 'close': break
    except (EOFError, OSError, ValueError, RuntimeError, struct.error):
        pass
    finally:
        closed.set()
        if upstream: upstream.close()
        SLOTS.release()
