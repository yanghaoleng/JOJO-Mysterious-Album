"""WOW child-voice contracts with mocked upstream audio and real local HTTP.

No credentials, external speech calls, or audio-quality claims are involved.
Run with: python3 -m unittest test_wow_speech -v
"""
import base64
from collections import OrderedDict
from concurrent.futures import Future, ThreadPoolExecutor
import http.client
from http.server import ThreadingHTTPServer
import io
import json
import os
import threading
import unittest
from unittest.mock import patch

import serve


CHILD_SPEAKER = "zh_male_naiqimengwa_uranus_bigtts"
ENV = {
    "PET_TTS_PROVIDER": "fish",
    "VOLC_SPEECH_APP_ID": "test-app",
    "VOLC_SPEECH_ACCESS_TOKEN": "test-token",
    "VOLC_TTS_RESOURCE_ID": "legacy-resource",
    "VOLC_TTS_SPEAKER_ID": "legacy-adult-speaker",
}


def sse_audio(*chunks):
    lines = [b"event: message\n", b": heartbeat\n", b"data: malformed\n"]
    lines += [("data: " + json.dumps({"code": 0, "data": base64.b64encode(chunk).decode()}) + "\n\n").encode() for chunk in chunks]
    lines.append(b'data: {"code": 20000000}\n')
    return io.BytesIO(b"".join(lines))


class WowSpeechTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), serve.NoCacheHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self):
        # Keep production-module global caches and credentials outside each case.
        for name, value in {
            "_WOW_SPEECH_CACHE": OrderedDict(), "_WOW_SPEECH_PENDING": {},
            "_WOW_SPEECH_LOCK": threading.Lock(), "_WOW_SPEECH_SLOTS": threading.BoundedSemaphore(2),
        }.items():
            self.enterContext(patch.object(serve, name, value))
        self.enterContext(patch.dict(os.environ, ENV, clear=True))
        self.upstream = self.enterContext(patch("serve.urllib.request.urlopen", side_effect=AssertionError("Unexpected external request")))
        self.preset = dict(serve.WOW_CHILD_TTS_PRESET)

    def post(self, payload):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            connection.request("POST", "/api/tts", body=json.dumps(payload), headers={"Content-Type": "application/json"})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_child_profile_overrides_npc_and_returns_an_independent_preset(self):
        npc_id = next(iter(serve.NPC_PROFILES))
        profile, voice, preset = serve.npc_tts_settings(npc_id, "gentle", "wow-child")
        self.assertIsNone(profile)
        self.assertEqual(voice, "wow-child")
        self.assertEqual(preset["speaker"], CHILD_SPEAKER)
        self.assertEqual(preset["resource_id"], "seed-tts-2.0")
        preset["speaker"] = "modified-by-caller"
        self.assertEqual(serve.npc_tts_settings(npc_id, "star", "wow-child")[2]["speaker"], CHILD_SPEAKER)

    def test_real_v3_request_keeps_child_speaker_resource_and_audio_shape(self):
        # Even a stale per-voice environment override must not change this story.
        with patch.dict(os.environ, {"VOLC_TTS_SPEAKER_WOW_CHILD": "legacy-adult-speaker"}), \
                patch("serve.fish_tts") as fish, patch("serve.volc_tts_v1") as legacy:
            self.upstream.side_effect = None
            self.upstream.return_value = sse_audio(b"first", b"second")
            self.assertEqual(serve.tts_audio("一起来找星星。", "wow-child", self.preset), (b"firstsecond", "volc-seed-v3"))
            fish.assert_not_called()
            legacy.assert_not_called()
        request = self.upstream.call_args.args[0]
        headers = {key.lower(): value for key, value in request.header_items()}
        body = json.loads(request.data)
        self.assertEqual(request.full_url, "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(headers["x-api-resource-id"], "seed-tts-2.0")
        self.assertEqual(headers["x-api-app-id"], "test-app")
        self.assertEqual(headers["x-api-access-key"], "test-token")
        self.assertEqual(body["req_params"]["speaker"], CHILD_SPEAKER)
        self.assertEqual(body["req_params"]["text"], "一起来找星星。")
        self.assertEqual(body["req_params"]["audio_params"], {
            "format": "mp3", "sample_rate": 24000, "bit_rate": 64000,
            "speech_rate": -6, "loudness_rate": 0,
        })
        self.assertNotIn("sample_rate", body["req_params"])
        self.assertEqual(self.upstream.call_args.kwargs["timeout"], 12)

    def test_http_child_profile_and_cached_response_headers(self):
        self.upstream.side_effect = None
        self.upstream.return_value = sse_audio(b"child-audio")
        body = {"text": "你好，小星星。", "voice": "gentle", "npcId": next(iter(serve.NPC_PROFILES)), "speechProfile": "wow-child"}
        for _ in range(2):
            status, headers, audio = self.post(body)
            self.assertEqual(status, 200)
            self.assertEqual(audio, b"child-audio")
            self.assertEqual(headers["Content-Type"], "audio/mpeg")
            self.assertEqual(headers["X-TTS-Provider"], "volc-seed-v3")
            self.assertEqual(headers["X-TTS-Voice"], "wow-child")
            self.assertEqual(headers["X-NPC-Id"], "")
            self.assertEqual(float(headers["X-Speech-Rate"]), .94)
            self.assertIn("no-store", headers["Cache-Control"])
        self.upstream.assert_called_once()

    def test_quota_has_explicit_http_status_and_never_falls_back(self):
        self.upstream.side_effect = lambda *args, **kwargs: io.BytesIO(b'data: {"code":45000292,"message":"quota exceeded"}\n')
        with patch("serve.fish_tts") as fish, patch("serve.volc_tts_v1") as legacy:
            status, _, payload = self.post({"text": "配额测试。", "speechProfile": "wow-child"})
            self.assertEqual(status, 429)
            self.assertEqual(json.loads(payload), {"error": "tts_quota_exceeded"})
            fish.assert_not_called()
            legacy.assert_not_called()
        self.assertEqual(len(serve._WOW_SPEECH_CACHE), 0)
        self.assertEqual(len(serve._WOW_SPEECH_PENDING), 0)

    def test_other_child_failures_do_not_change_voice_or_cache_failure(self):
        with patch("serve.fish_tts") as fish, patch("serve.volc_tts_v1") as legacy:
            for failure in (RuntimeError("tts_v3_unsupported"), TimeoutError("upstream timeout")):
                with self.subTest(failure=str(failure)), patch("serve.volc_seed_tts", side_effect=failure):
                    status, _, payload = self.post({"text": "重试这一句。", "speechProfile": "wow-child"})
                    self.assertEqual(status, 502)
                    self.assertEqual(json.loads(payload), {"error": "tts_upstream_error"})
                    self.assertFalse(serve._WOW_SPEECH_CACHE)
                    self.assertFalse(serve._WOW_SPEECH_PENDING)
            fish.assert_not_called()
            legacy.assert_not_called()
        with patch("serve.volc_seed_tts", return_value=b"retry-success") as seed:
            self.assertEqual(serve.tts_audio("重试这一句。", "wow-child", self.preset)[0], b"retry-success")
            self.assertEqual(serve.tts_audio("重试这一句。", "wow-child", self.preset)[0], b"retry-success")
            seed.assert_called_once()

    def test_busy_response_never_starts_upstream_and_can_be_retried(self):
        # Model an exhausted concurrency limit without spending its one-second wait.
        with patch.object(serve, "_WOW_SPEECH_SLOTS") as slots, patch("serve.volc_seed_tts") as seed:
            slots.acquire.return_value = False
            status, _, payload = self.post({"text": "排队这一句。", "speechProfile": "wow-child"})
            self.assertEqual(status, 429)
            self.assertEqual(json.loads(payload), {"error": "tts_busy"})
            slots.acquire.assert_called_once_with(timeout=1)
            slots.release.assert_not_called()
            seed.assert_not_called()
        self.assertFalse(serve._WOW_SPEECH_CACHE)
        self.assertFalse(serve._WOW_SPEECH_PENDING)
        with patch("serve.volc_seed_tts", return_value=b"ready"):
            self.assertEqual(serve.tts_audio("排队这一句。", "wow-child", self.preset)[0], b"ready")

    def concurrent_identical_requests(self, failure=None):
        entered, release, all_joined = threading.Event(), threading.Event(), threading.Event()
        joined = []
        joined_lock = threading.Lock()

        class ObservedFuture(Future):
            def result(self, timeout=None):
                with joined_lock:
                    joined.append(1)
                    if len(joined) == 5:
                        all_joined.set()
                return super().result(timeout=timeout)

        def synthesize(*args):
            entered.set()
            if not release.wait(timeout=3):
                raise AssertionError("Test did not release upstream")
            if failure:
                raise failure
            return b"one-synthesis"

        with patch.object(serve, "Future", ObservedFuture), patch("serve.volc_seed_tts", side_effect=synthesize) as seed:
            with ThreadPoolExecutor(max_workers=6) as executor:
                leader = executor.submit(serve.tts_audio, "大家听同一句。", "wow-child", self.preset)
                try:
                    self.assertTrue(entered.wait(timeout=2), "Leader did not start synthesis")
                    requests = [leader] + [executor.submit(serve.tts_audio, "大家听同一句。", "wow-child", dict(self.preset)) for _ in range(5)]
                    self.assertTrue(all_joined.wait(timeout=2), "Concurrent requests did not join pending synthesis")
                finally:
                    release.set()
                for request in requests:
                    if failure:
                        with self.assertRaisesRegex(type(failure), str(failure)):
                            request.result(timeout=2)
                    else:
                        self.assertEqual(request.result(timeout=2), (b"one-synthesis", "volc-seed-v3"))
            seed.assert_called_once()
        self.assertFalse(serve._WOW_SPEECH_PENDING)

    def test_concurrent_identical_lines_use_one_synthesis(self):
        self.concurrent_identical_requests()
        self.assertEqual(len(serve._WOW_SPEECH_CACHE), 1)

    def test_concurrent_failure_reaches_all_waiters_and_allows_retry(self):
        self.concurrent_identical_requests(RuntimeError("tts_quota_exceeded"))
        self.assertFalse(serve._WOW_SPEECH_CACHE)
        with patch("serve.volc_seed_tts", return_value=b"retry") as seed:
            self.assertEqual(serve.tts_audio("大家听同一句。", "wow-child", self.preset)[0], b"retry")
            seed.assert_called_once()

    def test_cache_identity_includes_text_and_voice_settings(self):
        with patch("serve.volc_seed_tts", side_effect=[b"original", b"other-text", b"slower"]) as seed:
            self.assertEqual(serve.tts_audio("第一句", "wow-child", self.preset)[0], b"original")
            self.assertEqual(serve.tts_audio("第一句", "wow-child", dict(reversed(list(self.preset.items()))))[0], b"original")
            self.assertEqual(serve.tts_audio("第二句", "wow-child", self.preset)[0], b"other-text")
            self.assertEqual(serve.tts_audio("第一句", "wow-child", dict(self.preset, volc_speed=.9))[0], b"slower")
            self.assertEqual(seed.call_count, 3)
        self.assertTrue(all(len(key) == 64 and "第一句" not in key for key in serve._WOW_SPEECH_CACHE))

    def test_cache_expires_and_evicts_least_recently_used_audio(self):
        with patch("serve.time.monotonic", return_value=100) as clock, patch("serve.volc_seed_tts", return_value=b"audio") as seed:
            for index in range(128):
                serve.tts_audio(str(index), "wow-child", self.preset)
            serve.tts_audio("0", "wow-child", self.preset)
            serve.tts_audio("128", "wow-child", self.preset)
            self.assertEqual(len(serve._WOW_SPEECH_CACHE), 128)
            serve.tts_audio("0", "wow-child", self.preset)
            self.assertEqual(seed.call_count, 129)
            serve.tts_audio("1", "wow-child", self.preset)
            self.assertEqual(seed.call_count, 130)
            clock.return_value = 3701
            serve.tts_audio("0", "wow-child", self.preset)
            self.assertEqual(seed.call_count, 131)
            self.assertEqual(len(serve._WOW_SPEECH_CACHE), 1)

    def test_cache_also_bounds_audio_bytes(self):
        with patch("serve.volc_seed_tts", return_value=b"a" * 8_000_001) as seed:
            serve.tts_audio("一", "wow-child", self.preset)
            serve.tts_audio("二", "wow-child", self.preset)
            self.assertEqual(len(serve._WOW_SPEECH_CACHE), 1)
            self.assertLessEqual(sum(len(audio) for _, audio in serve._WOW_SPEECH_CACHE.values()), 16_000_000)
            serve.tts_audio("二", "wow-child", self.preset)
            self.assertEqual(seed.call_count, 2)

    def test_regular_profiles_keep_npc_selection_and_provider_compatibility(self):
        npc_id = next(iter(serve.NPC_PROFILES))
        profile, voice, preset = serve.npc_tts_settings(npc_id, "gentle")
        self.assertEqual(profile["id"], npc_id)
        self.assertEqual(voice, profile["voiceKey"])
        self.assertEqual(serve.npc_tts_settings(None, "gentle", "unknown-profile")[1], "gentle")
        with patch("serve.fish_tts", return_value=b"fish") as fish, patch("serve.volc_seed_tts") as seed:
            self.assertEqual(serve.tts_audio("旧故事", voice, preset), (b"fish", "fish"))
            fish.assert_called_once_with("旧故事", voice, preset)
            seed.assert_not_called()
        with patch.dict(os.environ, {"PET_TTS_PROVIDER": "volc"}), \
                patch("serve.volc_seed_tts", side_effect=RuntimeError("tts_v3_unsupported")), \
                patch("serve.volc_tts_v1", return_value=b"legacy") as legacy:
            self.assertEqual(serve.tts_audio("旧音色", voice, preset), (b"legacy", "volc-v1-fallback"))
            legacy.assert_called_once_with("旧音色", voice, preset)
        with patch.dict(os.environ, {"PET_TTS_PROVIDER": "volc"}), \
                patch("serve.volc_seed_tts", side_effect=RuntimeError("tts_quota_exceeded")), \
                patch("serve.volc_tts_v1") as legacy:
            with self.assertRaisesRegex(RuntimeError, "tts_quota_exceeded"):
                serve.tts_audio("旧故事配额", voice, preset)
            legacy.assert_not_called()

    def test_json_speech_keeps_exact_audio_and_absolute_provider_character_times(self):
        self.upstream.side_effect = None
        words = [
            {"word": "你", "startTime": .525, "endTime": .715, "confidence": .78},
            {"word": "好，", "startTime": .715, "endTime": 1.065},
            {"word": "星", "startTime": 2.57, "endTime": 2.645},
            {"word": "星。", "startTime": 2.645, "endTime": 2.975},
        ]
        events = [
            {"data": base64.b64encode(b"first-audio").decode()},
            {"sentence": {"text": "你好，星星。", "words": []}},
            {"sentence": {"text": "星星。", "words": words[2:]}},
            {"data": base64.b64encode(b"second-audio").decode()},
            {"sentence": {"text": "你好，", "words": words[:2]}},
            {"sentence": {"text": "你好，", "words": words[:2]}},
            {"code": 20000000},
        ]
        # Provider subtitles may arrive out of order, after audio, and without a final newline.
        self.upstream.return_value = io.BytesIO("\n".join("data: " + json.dumps(event) for event in events).encode())
        body = {"text": "你好，星星。", "speechProfile": "wow-child", "responseFormat": "json"}
        for _ in range(2):
            status, headers, raw = self.post(body)
            payload = json.loads(raw)
            self.assertEqual(status, 200)
            self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
            self.assertEqual(headers["X-TTS-Voice"], "wow-child")
            self.assertEqual(base64.b64decode(payload["audio"]), b"first-audiosecond-audio")
            self.assertEqual(payload["text"], body["text"])
            self.assertEqual(payload["alignment"], serve.speech_alignment(words))
            self.assertEqual(payload["alignment"][2]["start"], 2.57)
            self.assertEqual(payload["alignmentSource"], "provider")
            self.assertEqual(payload["alignmentUnit"], "seconds")
            self.assertEqual(payload["granularity"], "character-or-word")
        self.assertEqual(self.upstream.call_count, 1)
        request = json.loads(self.upstream.call_args.args[0].data)["req_params"]
        self.assertTrue(request["audio_params"]["enable_subtitle"])
        self.assertNotIn("enable_timestamp", request["audio_params"])
        self.assertNotIn("cache_config", json.loads(request["additions"]))

    def test_json_and_raw_cache_entries_do_not_mix_audio_with_other_timing(self):
        aligned = serve.AlignedSpeechAudio(b"timed-audio", [{"text": "星", "start": .3, "end": .7}])
        with patch("serve.volc_seed_tts", side_effect=[b"raw-audio", aligned]) as seed:
            raw_body = {"text": "星", "speechProfile": "wow-child"}
            self.assertEqual(self.post(raw_body)[2], b"raw-audio")
            for _ in range(2):
                response = json.loads(self.post(dict(raw_body, responseFormat="json"))[2])
                self.assertEqual(base64.b64decode(response["audio"]), b"timed-audio")
                self.assertEqual(response["alignment"], aligned.alignment)
            self.assertEqual(self.post(raw_body)[2], b"raw-audio")
            self.assertEqual(seed.call_count, 2)
            self.assertEqual(seed.call_args.kwargs, {"with_timestamps": True})

    def test_missing_subtitles_preserve_audio_without_fabricating_progress(self):
        self.upstream.side_effect = None
        self.upstream.return_value = sse_audio(b"readable-audio")
        status, _, raw = self.post({"text": "没有字幕。", "speechProfile": "wow-child", "responseFormat": "json"})
        response = json.loads(raw)
        self.assertEqual(status, 200)
        self.assertEqual(base64.b64decode(response["audio"]), b"readable-audio")
        self.assertEqual(response["alignment"], [])
        self.assertEqual(response["alignmentSource"], "none")

    def test_invalid_alignment_is_rejected_and_original_word_ranges_are_preserved(self):
        words = [
            None, {}, {"word": "坏", "startTime": -1, "endTime": 2},
            {"word": "坏", "startTime": "nan", "endTime": 2},
            {"word": "坏", "startTime": 1, "endTime": "inf"},
            {"word": "坏", "startTime": 1, "endTime": 1},
            {"word": "2019", "startTime": "0.3", "endTime": "1.2", "confidence": .8},
            {"word": "hello", "startTime": 2, "endTime": 3, "confidence": float("nan")},
        ]
        self.assertEqual(serve.speech_alignment(words), [
            {"text": "2019", "start": .3, "end": 1.2, "confidence": .8},
            {"text": "hello", "start": 2, "end": 3},
        ])

    def test_ordinary_fish_json_has_no_fake_subtitles_or_routing_change(self):
        with patch("serve.fish_tts", return_value=b"fish-audio") as fish, patch("serve.volc_seed_tts") as seed:
            status, _, raw = self.post({"text": "普通故事", "responseFormat": "json"})
            payload = json.loads(raw)
            self.assertEqual(status, 200)
            self.assertEqual(payload["provider"], "fish")
            self.assertEqual(payload["alignment"], [])
            self.assertEqual(base64.b64decode(payload["audio"]), b"fish-audio")
            fish.assert_called_once()
            seed.assert_not_called()

    def test_legacy_volc_profile_uses_its_own_timestamp_flag(self):
        self.upstream.side_effect = None
        self.upstream.return_value = sse_audio(b"old-voice")
        with patch.dict(os.environ, {"PET_TTS_PROVIDER": "volc"}):
            status, _, raw = self.post({"text": "普通故事", "responseFormat": "json"})
        self.assertEqual(status, 200)
        params = json.loads(self.upstream.call_args.args[0].data)["req_params"]["audio_params"]
        self.assertTrue(params["enable_timestamp"])
        self.assertNotIn("enable_subtitle", params)


if __name__ == "__main__":
    unittest.main()
