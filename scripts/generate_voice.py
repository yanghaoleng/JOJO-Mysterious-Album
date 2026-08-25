#!/usr/bin/env python3
"""Generate the built-in guide clips with Fish Audio.

The API key is read from .env.local and audio is committed as static MP3,
so children never send voice or text to Fish Audio during the game.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "voice"
DEFAULT_REFERENCE = "564dc2631c624222a21864b17f3c66a8"

LINES = {
    "01-welcome.mp3": "嘘，先别惊动它。我找到了一团会打喷嚏的小墨点。轻轻叫醒它吧。",
    "02-trait.mp3": "它一害怕，身体就会发生奇怪的变化。你觉得会是什么？",
    "03-heart.mp3": "你发现了它的一个秘密。再听听它的心。树洞里有朋友在哭，它会怎么做？",
    "04-name.mp3": "它现在有了模样，也有了自己的心。给它取一个只属于它的名字吧。",
    "05-world.mp3": "名字写好了。现在，草地、萤火和秘密小路，会一起长出来。",
    "06-play.mp3": "欢迎来到雾灯花园。点一下草地，就能带它走过去。先找到会一闪一闪的萤火种。",
    "07-seeds.mp3": "一颗，加上后来找到的两颗，正好是三颗。雾灯要亮了！",
    "08-gate.mp3": "雾后面真的有一扇门。上面写着一个字，勇。",
    "09-brave.mp3": "勇敢不是一点都不怕，是害怕的时候，仍然愿意试一试。",
    "10-complete.mp3": "第一张图鉴完成了。你创造的本领，真的帮助它走过了自己的世界。",
}


def load_local_env() -> None:
    path = ROOT / ".env.local"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def synthesize(api_key: str, reference_id: str, text: str) -> bytes:
    payload = json.dumps(
        {
            "text": text,
            "reference_id": reference_id,
            "format": "mp3",
            "sample_rate": 44100,
            "mp3_bitrate": 128,
            "normalize": True,
            "temperature": 0.68,
            "top_p": 0.72,
            "prosody": {"speed": 0.96, "volume": -1, "normalize_loudness": True},
        },
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.fish.audio/v1/tts",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "model": "s2.1-pro-free",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as result:
        return result.read()


def main() -> int:
    load_local_env()
    api_key = os.environ.get("FISH_AUDIO_API_KEY", "")
    if not api_key:
        print("FISH_AUDIO_API_KEY is missing from .env.local", file=sys.stderr)
        return 2
    reference_id = os.environ.get("FISH_AUDIO_REFERENCE_ID", DEFAULT_REFERENCE)
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, text in LINES.items():
        target = OUT / filename
        if target.exists() and target.stat().st_size > 4096:
            print(f"keep {filename}")
            continue
        try:
            target.write_bytes(synthesize(api_key, reference_id, text))
            print(f"made {filename} ({target.stat().st_size} bytes)")
        except urllib.error.HTTPError as exc:
            detail = exc.read(240).decode("utf-8", "replace")
            print(f"Fish Audio rejected {filename}: HTTP {exc.code} {detail}", file=sys.stderr)
            return 1
        except Exception as exc:
            print(f"Could not generate {filename}: {exc}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
