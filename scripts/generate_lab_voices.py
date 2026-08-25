#!/usr/bin/env python3
"""Generate four fixed, child-safe laboratory voice previews with Fish Audio."""

from __future__ import annotations

import json
import os
import pathlib
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "voice"

VOICES = {
    "lab-sprout.mp3": {
        "reference_id": "57744207b298418194abd366d4596c8b",
        "text": "你好呀，我会慢慢听，也会把每个问题说清楚。",
        "speed": 0.92,
    },
    "lab-bubble.mp3": {
        "reference_id": "35e4dae87120478ea72d3eef6ff77ba0",
        "text": "我准备好了。我们来想一个从来没有见过的新朋友吧！",
        "speed": 1.08,
    },
    "lab-moss.mp3": {
        "reference_id": "943fc7f50e6245dabb8362a7e9ceca0a",
        "text": "不用着急，我们可以一小步，一小步地往前走。",
        "speed": 0.82,
    },
    "lab-star.mp3": {
        "reference_id": "0fa0c39f8c8849a482db9da1586d1888",
        "text": "我有一个问题。你觉得云朵会不会也有自己的秘密？",
        "speed": 1.04,
    },
}


def load_env() -> None:
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def generate(filename: str, config: dict[str, object], token: str) -> None:
    payload = json.dumps(
        {
            "text": config["text"],
            "reference_id": config["reference_id"],
            "format": "mp3",
            "normalize": True,
            "temperature": 0.7,
            "top_p": 0.7,
            "prosody": {
                "speed": config["speed"],
                "volume": 0,
                "normalize_loudness": True,
            },
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.fish.audio/v1/tts",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "model": "s2.1-pro-free",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        audio = response.read()
    if len(audio) < 8_000:
        raise RuntimeError(f"Unexpectedly short audio response for {filename}")
    (OUT / filename).write_bytes(audio)
    print(f"generated {filename}: {len(audio)} bytes")


def main() -> None:
    load_env()
    token = os.environ.get("FISH_AUDIO_API_KEY", "").strip()
    if not token:
        raise SystemExit("FISH_AUDIO_API_KEY is missing")
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, config in VOICES.items():
        generate(filename, config, token)


if __name__ == "__main__":
    main()
