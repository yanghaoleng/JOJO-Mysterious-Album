"""Minimal server-side client for Doubao streaming ASR.

The browser sends 16 kHz mono PCM after a short utterance. Credentials remain
on this server; only the transcript is returned to the browser.
"""
import base64
import gzip
import hashlib
import json
import os
import socket
import ssl
import struct
import uuid
from urllib.parse import urlsplit


ASR_ENDPOINT = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream"


def _header(message_type, flags=0, serialization=1, compression=1):
    return bytes((0x11, (message_type << 4) | flags, (serialization << 4) | compression, 0))


def _full_request(payload, sequence=1):
    compressed = gzip.compress(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    return b"".join((_header(0x1, flags=0x1), struct.pack(">iI", sequence, len(compressed)), compressed))


def _audio_request(audio, sequence, final=False):
    flags = 0x3 if final else 0x1
    signed_sequence = -abs(sequence) if final else sequence
    return b"".join((_header(0x2, flags=flags, serialization=0, compression=0), struct.pack(">iI", signed_sequence, len(audio)), audio))


def _parse_response(message):
    if len(message) < 4:
        raise RuntimeError("asr_short_response")
    header_bytes = (message[0] & 0x0F) * 4
    message_type = message[1] >> 4
    flags = message[1] & 0x0F
    serialization = message[2] >> 4
    compression = message[2] & 0x0F
    payload = message[header_bytes:]
    result = {"last": bool(flags & 0x2)}
    if flags & 0x1:
        if len(payload) < 4:
            raise RuntimeError("asr_missing_sequence")
        sequence = struct.unpack(">i", payload[:4])[0]
        result["sequence"] = sequence
        result["last"] = result["last"] or sequence < 0
        payload = payload[4:]
    body = None
    if message_type == 0x9:
        if len(payload) < 4:
            raise RuntimeError("asr_missing_payload")
        size = struct.unpack(">I", payload[:4])[0]
        body = payload[4:4 + size]
    elif message_type == 0xB:
        if len(payload) >= 4:
            ack_sequence = struct.unpack(">i", payload[:4])[0]
            result["last"] = result["last"] or ack_sequence < 0
            payload = payload[4:]
        if len(payload) >= 4:
            size = struct.unpack(">I", payload[:4])[0]
            body = payload[4:4 + size]
    elif message_type == 0xF:
        if len(payload) < 8:
            raise RuntimeError("asr_invalid_error")
        result["code"] = struct.unpack(">I", payload[:4])[0]
        size = struct.unpack(">I", payload[4:8])[0]
        body = payload[8:8 + size]
    else:
        raise RuntimeError("asr_unknown_response")
    if body is not None:
        if compression == 1:
            body = gzip.decompress(body)
        result["message"] = json.loads(body.decode("utf-8")) if serialization == 1 else body
    return result


def _extract_text(value):
    if isinstance(value, list):
        return "".join(_extract_text(item) for item in value)
    if not isinstance(value, dict):
        return ""
    for key in ("text", "Text", "transcript", "Transcript"):
        if value.get(key):
            return str(value[key])
    for key in ("result", "Result", "utterances", "Utterances", "message"):
        text = _extract_text(value.get(key))
        if text:
            return text
    return ""


class _WebSocket:
    def __init__(self, url, headers, timeout=25):
        parsed = urlsplit(url)
        if parsed.scheme != "wss":
            raise RuntimeError("asr_endpoint_must_be_wss")
        raw = socket.create_connection((parsed.hostname, parsed.port or 443), timeout=timeout)
        self.socket = ssl.create_default_context().wrap_socket(raw, server_hostname=parsed.hostname)
        self.socket.settimeout(timeout)
        self.buffer = b""
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query
        request_headers = {
            "Host": parsed.hostname,
            "Upgrade": "websocket",
            "Connection": "Upgrade",
            "Sec-WebSocket-Key": key,
            "Sec-WebSocket-Version": "13",
            **headers,
        }
        request = f"GET {path} HTTP/1.1\r\n" + "".join(f"{name}: {value}\r\n" for name, value in request_headers.items()) + "\r\n"
        self.socket.sendall(request.encode("ascii"))
        response = self._read_until(b"\r\n\r\n", 64_000)
        head, self.buffer = response.split(b"\r\n\r\n", 1)
        if not head.startswith(b"HTTP/1.1 101"):
            status = head.split(b"\r\n", 1)[0].decode("ascii", "replace")
            self.close()
            raise RuntimeError(f"asr_handshake_failed:{status}")
        accept = ""
        for line in head.split(b"\r\n")[1:]:
            name, _, value = line.partition(b":")
            if name.lower() == b"sec-websocket-accept":
                accept = value.strip().decode("ascii")
        expected = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()).decode("ascii")
        if accept != expected:
            self.close()
            raise RuntimeError("asr_bad_websocket_accept")

    def _read_until(self, marker, limit):
        data = self.buffer
        while marker not in data:
            if len(data) >= limit:
                raise RuntimeError("asr_header_too_large")
            chunk = self.socket.recv(4096)
            if not chunk:
                raise RuntimeError("asr_connection_closed")
            data += chunk
        return data

    def _read_exact(self, size):
        while len(self.buffer) < size:
            chunk = self.socket.recv(max(4096, size - len(self.buffer)))
            if not chunk:
                raise RuntimeError("asr_connection_closed")
            self.buffer += chunk
        value, self.buffer = self.buffer[:size], self.buffer[size:]
        return value

    def send_binary(self, payload):
        mask = os.urandom(4)
        length = len(payload)
        if length < 126:
            prefix = bytes((0x82, 0x80 | length))
        elif length < 65536:
            prefix = bytes((0x82, 0xFE)) + struct.pack(">H", length)
        else:
            prefix = bytes((0x82, 0xFF)) + struct.pack(">Q", length)
        masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        self.socket.sendall(prefix + mask + masked)

    def receive_binary(self):
        fragments = bytearray()
        while True:
            first, second = self._read_exact(2)
            opcode = first & 0x0F
            final = bool(first & 0x80)
            length = second & 0x7F
            masked = bool(second & 0x80)
            if length == 126:
                length = struct.unpack(">H", self._read_exact(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", self._read_exact(8))[0]
            mask = self._read_exact(4) if masked else None
            payload = self._read_exact(length)
            if mask:
                payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
            if opcode == 0x8:
                raise RuntimeError("asr_connection_closed")
            if opcode == 0x9:
                self._send_control(0xA, payload)
                continue
            if opcode in (0x2, 0x0):
                fragments.extend(payload)
                if final:
                    return bytes(fragments)

    def _send_control(self, opcode, payload=b""):
        mask = os.urandom(4)
        payload = payload[:125]
        masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        self.socket.sendall(bytes((0x80 | opcode, 0x80 | len(payload))) + mask + masked)

    def close(self):
        try:
            self._send_control(0x8)
        except Exception:
            pass
        try:
            self.socket.close()
        except Exception:
            pass


def transcribe_pcm(pcm, sample_rate=16000):
    app_id = os.environ.get("VOLC_SPEECH_APP_ID", "")
    access_token = os.environ.get("VOLC_SPEECH_ACCESS_TOKEN", "")
    resource_id = os.environ.get("VOLC_SPEECH_RESOURCE_ID", "")
    if not app_id or not access_token or not resource_id:
        raise RuntimeError("asr_not_configured")
    if not pcm or len(pcm) > sample_rate * 2 * 30:
        raise RuntimeError("asr_audio_invalid")
    request_id = str(uuid.uuid4())
    connection = _WebSocket(
        os.environ.get("VOLC_SPEECH_ENDPOINT", ASR_ENDPOINT),
        {
            "X-Api-App-Key": app_id,
            "X-Api-Access-Key": access_token,
            "X-Api-Resource-Id": resource_id,
            "X-Api-Request-Id": request_id,
        },
    )
    transcript = ""
    try:
        request = {
            "user": {"uid": "kindergrimm-story"},
            "audio": {"format": "pcm", "codec": "raw", "rate": sample_rate, "bits": 16, "channel": 1},
            "request": {"model_name": "bigmodel", "enable_itn": True, "enable_punc": True, "result_type": "full"},
        }
        connection.send_binary(_full_request(request, 1))
        sequence = 1
        for offset in range(0, len(pcm), 3200):
            sequence += 1
            connection.send_binary(_audio_request(pcm[offset:offset + 3200], sequence))
        sequence += 1
        connection.send_binary(_audio_request(b"", sequence, final=True))
        for _ in range(256):
            response = _parse_response(connection.receive_binary())
            if response.get("code"):
                raise RuntimeError(f"asr_upstream_error:{response['code']}")
            candidate = _extract_text(response.get("message"))
            if candidate:
                transcript = candidate
            if response.get("last"):
                break
        return transcript.strip()
    finally:
        connection.close()
