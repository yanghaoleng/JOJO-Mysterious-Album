#!/usr/bin/env python3
"""Generate the role laboratory's fixed offline clips with the Star voice."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import pathlib
import socket
import time
import urllib.error
import urllib.request

from star_script_lines import SCRIPT_LINES


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "voice" / "star"
REFERENCE_ID = "0fa0c39f8c8849a482db9da1586d1888"

LINES = {
    "question-age-band": "先告诉我，哪一段年龄更像你现在？",
    "feedback-age-band": "好，我会把后面的任务调到更合适的长度。",
    "question-learning": "你更容易用眼睛记住，还是用耳朵记住？",
    "feedback-learning-see": "我记住了：更擅长看。你看，我也有一点变化了。",
    "feedback-learning-hear": "我记住了：更擅长听。你看，我也有一点变化了。",
    "feedback-learning-both": "我记住了：喜欢看和听一起出现。你看，我也有一点变化了。",
    "feedback-learning-do": "我记住了。以后会多给你能动手试一试的任务。",
    "question-attention": "做一件喜欢的事时，哪一种节奏更像你？",
    "feedback-attention": "我记住你的专注节奏了，关卡不会故意催你。",
    "question-explore": "到了一个没去过的地方，你通常会先做什么？",
    "feedback-explore-try": "我记住了：喜欢先尝试。你看，我也有一点变化了。",
    "feedback-explore-watch": "我记住了：喜欢先观察。你看，我也有一点变化了。",
    "feedback-explore-together": "我记住了：喜欢结伴探索。你看，我也有一点变化了。",
    "question-challenge": "如果第一次没有成功，你最希望接下来怎样？",
    "feedback-challenge": "好，碰到难题时，我会用你更舒服的方式陪你继续。",
    "question-pace": "你喜欢故事用什么速度往前走？",
    "feedback-pace": "收到。以后每一页故事都会尽量跟着你的速度走。",
    "question-expression": "脑袋里有一个新想法时，你最喜欢怎样把它变出来？",
    "feedback-expression": "我记住你的表达方式了，不会只用一种办法问你答案。",
    "question-social": "玩一个新游戏时，哪一种伙伴数量最舒服？",
    "feedback-social": "我记住了，伙伴不会一下子变得太多或太少。",
    "question-role": "如果你走进故事里，最想成为哪一种角色？",
    "feedback-role": "这个称号很好。以后世界遇到问题，会想起你的这项本领。",
    "question-theme": "如果故事里多出一种东西，你最想要哪一种？",
    "feedback-theme-animals": "我记住了：动物和奇妙生物。你看，我也有一点变化了。",
    "feedback-theme-nature": "我记住了：花草和自然。你看，我也有一点变化了。",
    "feedback-theme-music": "我记住了：音乐和声音。你看，我也有一点变化了。",
    "feedback-theme-building": "我记住了：搭建和机关。你看，我也有一点变化了。",
    "feedback-theme-space": "星空和实验已经被记进兴趣地图里了。",
    "feedback-theme-mystery": "神秘线索已经被记进兴趣地图里了。",
    "question-play-style": "一个世界打开以后，你最想在里面做什么？",
    "feedback-play-style": "好，下一次世界长出来时，会多放一些你喜欢的玩法。",
    "question-story-tone": "你最想走进哪一种感觉的故事？",
    "feedback-story-tone": "故事的颜色也记住了，结尾会更像你喜欢的感觉。",
    "question-tone": "你希望它用什么感觉和你说话？",
    "question-emotion": "如果心里有点不舒服，哪一种方式最可能帮到你？",
    "feedback-emotion": "我记住了。需要的时候，会先给你喜欢的缓冲方式。",
    "question-encouragement": "完成一个难任务以后，你最想听见哪一种鼓励？",
    "feedback-encouragement": "好，我会记得用这种方式看到你的努力。",
    "question-sensitivities": "游戏里有没有哪一种东西，你更希望少一点？",
    "feedback-sensitivities": "谢谢你告诉我。后面的世界会尽量避开让你不舒服的方式。",
    "question-interest": "最后告诉我，最近最喜欢做的一件事是什么？",
    "interview-complete": "我记住啦。以后遇到新的故事，我会先问问你想怎么做。",
    "dialogue-profile": "我记住啦。你喜欢发现小动物，也喜欢先安静看一会儿。",
    "dialogue-question": "你愿意带我去看看你最喜欢的地方吗？",
    "dialogue-choice": "这次换你来决定，我会认真听。",
    "dialogue-encourage": "没关系，我们可以慢一点，再试一次。",
    "action-wave": "你好呀！我在这里。",
    "action-expression-0": "我在认真看你。",
    "action-expression-1": "这里有一点点陌生。",
    "action-expression-2": "我会保护自己的想法。",
    "action-expression-3": "先闭上眼睛休息一会儿。",
    "action-random": "我换了一张完全不同的脸。还可以继续慢慢调整。",
    "action-tap-0": "你碰到我啦，我正在看着你。",
    "action-tap-1": "我在这里。你想先帮我改哪里？",
    "action-tap-2": "嘿，我听见你的点击啦。",
    "action-tap-3": "我又看见你啦。",
    "template-bean-dog": "你好，我现在是豆豆小狗。你还想帮我改一改哪里？",
    "template-moon-cat": "你好，我现在是月牙小猫。你还想帮我改一改哪里？",
    "template-snow-rabbit": "你好，我现在是雪团小兔。你还想帮我改一改哪里？",
    "template-honey-bear": "你好，我现在是蜜糖小熊。你还想帮我改一改哪里？",
    "template-curl-fox": "你好，我现在是卷尾小狐狸。你还想帮我改一改哪里？",
    "template-bamboo-panda": "你好，我现在是竹叶熊猫。你还想帮我改一改哪里？",
    "template-pond-frog": "你好，我现在是池塘小蛙。你还想帮我改一改哪里？",
    "template-book-owl": "你好，我现在是书桌小鸮。你还想帮我改一改哪里？",
    "template-forest-deer": "你好，我现在是林间小鹿。你还想帮我改一改哪里？",
    "template-leaf-hedgehog": "你好，我现在是落叶小刺猬。你还想帮我改一改哪里？",
    "template-river-otter": "你好，我现在是河湾小水獭。你还想帮我改一改哪里？",
    "template-cloud-alpaca": "你好，我现在是云朵羊驼。你还想帮我改一改哪里？",
    "template-trail-explorer": "你好，我现在是星路探险家。你还想帮我改一改哪里？",
    "template-quiet-painter": "你好，我现在是安静小画家。你还想帮我改一改哪里？",
    "template-cloud-inventor": "你好，我现在是云顶发明家。你还想帮我改一改哪里？",
    "scene-paper-ground": "我们先站在最简单的纸上地面。",
    "scene-classroom-desk": "现在我站在教室的书桌上，旁边还有一支铅笔。",
    "scene-library": "这里是安静的图书馆，书架上藏着很多故事。",
    "scene-attic": "我们到了玩具阁楼，旧木箱里也许藏着新朋友。",
    "scene-breakfast-table": "现在我站在早餐桌上，晨光刚好照进来。",
    "scene-rainy-window": "窗外正在下雨，我会听一听雨点的声音。",
    "scene-meadow": "我们来到了萤火草地，草叶正在轻轻摇动。",
    "scene-mushroom-forest": "这里是蘑菇森林，每一把蘑菇伞都像小屋顶。",
    "scene-seaside": "海浪慢慢靠近，又慢慢退回去了。",
    "scene-greenhouse": "温室里有很多新叶子，它们都朝着光生长。",
    "scene-paper-creek": "一只纸船正从小溪里经过，我们和它打个招呼吧。",
    "scene-snow-globe": "我们进了雪花玻璃球，雪会慢慢落在身边。",
    "scene-castle-window": "我站在城堡的窗台上，可以看见很远的地方。",
    "scene-clouds": "云朵把我轻轻托起来，现在脚下软绵绵的。",
    "scene-space": "我们到了宇宙，身体会像没有重量一样慢慢漂浮。",
    "scene-moon": "月亮上的重力很轻，走一步也会像小跳跃。",
    "scene-underwater": "海底的水托着身体，我们会慢慢地漂来漂去。",
    "scene-train": "慢火车已经出发，窗外的风景正在经过。",
    "scene-rooftop": "屋顶的晚风有一点凉，我们可以一起看远处的灯。",
    "scene-blanket-fort": "被窝城堡已经搭好了，这里只说悄悄话。",
    "scene-giant-pocket": "我们躲进了巨人的口袋，走路时这里会轻轻晃动。",
    "scene-music-stage": "小舞台的灯亮了，现在轮到我们表演。",
}

LINES.update(SCRIPT_LINES)


def load_env() -> None:
    path = ROOT / ".env.local"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def synthesize(token: str, text: str) -> bytes:
    body = json.dumps(
        {
            "text": text,
            "reference_id": REFERENCE_ID,
            "format": "mp3",
            "sample_rate": 44100,
            "mp3_bitrate": 128,
            "normalize": True,
            "temperature": 0.7,
            "top_p": 0.7,
            "prosody": {"speed": 1.04, "volume": 0, "normalize_loudness": True},
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.fish.audio/v1/tts",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "model": "s2.1-pro-free",
        },
    )
    with urllib.request.urlopen(request, timeout=150) as response:
        return response.read()


def generate_clip(key: str, token: str, force: bool) -> tuple[str, str]:
    text = LINES[key]
    target = OUT / f"{key}.mp3"
    if not force and target.exists() and target.stat().st_size > 8_000:
        return key, f"keep {target.name}"
    last_error = None
    for attempt in range(1, 4):
        try:
            audio = synthesize(token, text)
            if len(audio) < 8_000:
                raise RuntimeError("audio response was unexpectedly short")
            target.write_bytes(audio)
            return key, f"made {target.name}: {len(audio)} bytes"
        except urllib.error.HTTPError as error:
            detail = error.read(240).decode("utf-8", "replace")
            if error.code not in {429, 500, 502, 503, 504}:
                raise RuntimeError(f"HTTP {error.code} {detail}") from error
            last_error = RuntimeError(f"HTTP {error.code} {detail}")
        except (urllib.error.URLError, TimeoutError, socket.timeout, RuntimeError) as error:
            last_error = error
        if attempt < 3:
            time.sleep(attempt * 2)
    raise RuntimeError(f"{key} failed after 3 attempts: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--keys", nargs="*", help="Only generate the listed clip keys")
    parser.add_argument("--jobs", type=int, default=1, help="Parallel Fish Audio requests, maximum 4")
    args = parser.parse_args()
    load_env()
    token = os.environ.get("FISH_AUDIO_API_KEY", "").strip()
    if not token:
        raise SystemExit("FISH_AUDIO_API_KEY is missing")
    OUT.mkdir(parents=True, exist_ok=True)
    keys = args.keys or list(LINES)
    unknown = [key for key in keys if key not in LINES]
    if unknown:
        raise SystemExit(f"Unknown clip keys: {', '.join(unknown)}")
    failures = []
    jobs = max(1, min(4, args.jobs))
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as executor:
      futures = {executor.submit(generate_clip, key, token, args.force): key for key in keys}
      for future in concurrent.futures.as_completed(futures):
        key = futures[future]
        try:
          _, message = future.result()
          print(message, flush=True)
        except Exception as error:
          failures.append(f"{key}: {error}")
          print(f"failed {key}: {error}", flush=True)
    if failures:
      raise SystemExit("Fish Audio generation failed:\n" + "\n".join(failures))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
