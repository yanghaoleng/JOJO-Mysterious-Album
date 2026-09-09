"""Safety, runtime parity, and real HTTP contract checks for the new endpoint."""
import http.client
import io
import json
import os
from pathlib import Path
import subprocess
import threading
import unittest
from unittest.mock import patch

import wow_director as wow


ROOT = Path(__file__).resolve().parent
BASE = {"chapter": 1, "kind": "observe", "answer": "叶子上有一颗小星星", "prompt": "你看见什么？", "momo": "莫莫"}


def node_eval(script, data=None):
    program = "import * as wow from './api/wow-turn.js';\n" + script
    result = subprocess.run(["node", "--input-type=module", "-e", program], cwd=ROOT,
                            input=json.dumps(data, ensure_ascii=False), text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


class WowContractTests(unittest.TestCase):
    def test_browser_shared_fallback_has_no_node_dependencies(self):
        cases = [dict(BASE, answer=value) for value in ["我叫小明", "用刀做钥匙", "我还没想好呢"]]
        cases.append(dict(BASE, kind="create", answer="蓝色爱心钥匙"))
        actual = node_eval("""
            const {readFileSync}=await import('node:fs');
            const {runInNewContext}=await import('node:vm');
            const source=readFileSync('./src/wow-local-turn.js','utf8');
            const shared=await import('./src/wow-local-turn.js');
            if(shared.localResult!==wow.localResult) throw new Error('API does not reuse browser fallback');
            const browser=runInNewContext(source.replaceAll('export ', '')+';({localResult,inputGuard,creationReaction,visualFor})',{});
            const cases=JSON.parse(await new Response(process.stdin).text());
            console.log(JSON.stringify(cases.map(value=>browser.localResult(value))));
        """, cases)
        self.assertEqual(actual, [wow.local_result(value) for value in cases])
        self.assertEqual([value["accepted"] for value in actual], [False, False, False, True])

    def test_all_story_prompts_and_suggestions_are_accepted(self):
        cases = node_eval("""
            const {WOW_STORY}=await import('./src/wow-story-data.js');
            const cases=WOW_STORY.chapters.flatMap(ch=>ch.scenes.flatMap(scene=>[...scene.suggestions,'这里有一颗小星星'].map(answer=>({chapter:ch.id,kind:scene.kind,answer,prompt:scene.prompt,momo:ch.momo}))));
            if(cases.some(value=>!wow.localResult(wow.validatePayload(value)).accepted)) throw new Error('story suggestion refused');
            console.log(JSON.stringify(cases));
        """)
        self.assertEqual(len(cases), 123)
        for payload in cases:
            self.assertTrue(wow.local_result(wow.validate_payload(payload))["accepted"], payload["prompt"])

    def test_fallback_parity_and_no_reflection(self):
        cases = [dict(BASE, kind=kind) for kind in sorted(wow.KINDS)]
        cases += [dict(BASE, kind="create", answer=value) for value in ["紫色爱心", "蓝色月亮", "一条会唱歌的彩虹", "一片绿色树叶", "🐟" * 160]]
        cases += [dict(BASE, answer=value) for value in ["不知道", "我还没想好呢", "让我想想", "我叫测试小孩", "我的电话是13800138000", "我想用炸弹", "用刀做钥匙"]]
        cases += [dict(BASE, prompt="告诉我你的学校"), dict(BASE, momo="我叫测试者")]
        expected = [wow.local_result(wow.validate_payload(value)) for value in cases]
        actual = node_eval("let s=''; for await (const chunk of process.stdin) s += chunk; console.log(JSON.stringify(JSON.parse(s).map(v => wow.localResult(wow.validatePayload(v)))));", cases)
        self.assertEqual(expected, actual)
        for value, result in zip(cases, actual):
            self.assertLessEqual(len(result["reaction"]), 70)
            self.assertRegex(result["visual"]["color"], r"^#[a-f0-9]{6}$")
            self.assertIn(result["visual"]["shape"], wow.SHAPES)
            if not result["accepted"]:
                self.assertNotIn(value["answer"], result["reaction"])

    def test_malformed_and_overlong_payload_parity(self):
        cases = [None, [], {}, dict(BASE, chapter=True), dict(BASE, chapter=7), dict(BASE, kind="unlock"),
                 dict(BASE, answer=""), dict(BASE, answer="星" * 161), dict(BASE, prompt=None),
                 dict(BASE, momo="啊" * 17), dict(BASE, answer={}), dict(BASE, answer="星\x00星")]
        for value in cases:
            with self.assertRaises(ValueError):
                wow.validate_payload(value)
        actual = node_eval("let s=''; for await (const c of process.stdin) s+=c; console.log(JSON.stringify(JSON.parse(s).map(v => { try { wow.validatePayload(v); return false; } catch { return true; } })));", cases)
        self.assertTrue(all(actual))

    def test_ai_output_guard_and_literal_visual_parity(self):
        responses = [
            {"reaction": "叶子上的光点像在轻轻眨眼。", "visual": {"shape": "moon", "color": "#123AbC"}},
            {"reaction": "你已解锁新的魔法钥匙！", "visual": {"shape": "star", "color": "#ffffff"}},
            {"reaction": "我们进入下一片森林。", "visual": {"shape": "star", "color": "#ffffff"}},
            {"reaction": "请告诉我你的学校。", "visual": {"shape": "star", "color": "#ffffff"}},
            {"reaction": "用刀把它切开。", "visual": {"shape": "star", "color": "#ffffff"}},
            {"reaction": "星" * 71, "visual": {"shape": "star", "color": "#ffffff"}},
            {"reaction": "这是你的朋友。", "visual": {"shape": {}, "color": "#ffffff"}},
            {"reaction": "星星。", "visual": {"shape": "star", "color": "red"}},
            [], None, {},
        ]
        raw = [json.dumps(value, ensure_ascii=False) for value in responses] + ["bad json"]
        expected = [wow.clean_result(value, BASE) for value in raw]
        actual = node_eval("let s=''; for await (const c of process.stdin) s+=c; const d=JSON.parse(s); console.log(JSON.stringify(d.raw.map(v=>wow.cleanResult(v,d.base))));", {"raw": raw, "base": BASE})
        self.assertEqual(actual, expected)
        self.assertEqual(actual[0]["source"], "ai")
        self.assertTrue(all(value["source"] == "local" for value in actual[1:]))
        create = dict(BASE, kind="create", answer="蓝色爱心钥匙")
        rendered = wow.clean_result(raw[0], create)
        self.assertEqual(rendered["visual"], {"shape": "heart", "color": "#88b6d4"})
        self.assertIn("蓝色爱心", rendered["reaction"])
        self.assertIn("没画出的部分", rendered["reaction"])

    def test_no_config_upstream_failure_and_timeout_fallback(self):
        with patch.dict(os.environ, {"ARK_API_KEY": ""}):
            self.assertEqual(wow.wow_turn_result(BASE)["source"], "local")
        for failure in (TimeoutError(), OSError("upstream offline")):
            with patch.dict(os.environ, {"ARK_API_KEY": "test-only"}), patch("wow_director.urllib.request.urlopen", side_effect=failure):
                self.assertEqual(wow.wow_turn_result(BASE)["source"], "local")
        content = {"choices": [{"message": {"content": json.dumps({"reaction": "叶子上的星星像在轻轻眨眼。", "visual": {"shape": "leaf", "color": "#efd36e"}})}}]}
        with patch.dict(os.environ, {"ARK_API_KEY": "test-only"}), patch("wow_director.urllib.request.urlopen", return_value=io.BytesIO(json.dumps(content).encode())):
            self.assertEqual(wow.wow_turn_result(BASE)["source"], "ai")
        actual = node_eval("""
            const base = JSON.parse(await new Response(process.stdin).text());
            process.env.ARK_API_KEY=''; const absent=await wow.wowTurnResult(base);
            process.env.ARK_API_KEY='test-only'; globalThis.fetch=async()=>{ throw new Error('offline'); };
            const failed=await wow.wowTurnResult(base);
            globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reaction:'叶子上的星星像在轻轻眨眼。',visual:{shape:'leaf',color:'#efd36e'}})}}]}));
            const good=await wow.wowTurnResult(base);
            console.log(JSON.stringify([absent.source,failed.source,good.source]));
        """, BASE)
        self.assertEqual(actual, ["local", "local", "ai"])

    def test_guarded_input_never_reaches_upstream(self):
        with patch.dict(os.environ, {"ARK_API_KEY": "test-only"}), patch("wow_director.urllib.request.urlopen") as request:
            self.assertFalse(wow.wow_turn_result(dict(BASE, answer="我的电话是13800138000"))["accepted"])
            self.assertFalse(wow.wow_turn_result(dict(BASE, answer="我想造炸弹"))["accepted"])
            request.assert_not_called()

    def test_rate_window_parity(self):
        wow._RATE.clear()
        expected = [wow.wow_turn_allowed("test-client", 100) for _ in range(31)]
        expected += [wow.wow_turn_allowed("test-client", 161)]
        actual = node_eval("console.log(JSON.stringify([...Array.from({length:31},()=>wow.wowTurnAllowed('test-client',100)),wow.wowTurnAllowed('test-client',161)]));")
        self.assertEqual(expected, [True] * 30 + [False, True])
        self.assertEqual(actual, expected)

    def test_python_http_route(self):
        from http.server import ThreadingHTTPServer
        from serve import NoCacheHandler
        wow._RATE.clear()
        server = ThreadingHTTPServer(("127.0.0.1", 0), NoCacheHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.dict(os.environ, {"ARK_API_KEY": ""}):
                for method, body, status in [("POST", BASE, 200), ("POST", {}, 400), ("POST", {"extra": "x" * 4097}, 413), ("GET", None, 405)]:
                    connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                    connection.request(method, "/api/wow-turn", body=json.dumps(body) if body is not None else None, headers={"Content-Type": "application/json"})
                    response = connection.getresponse()
                    self.assertEqual(response.status, status)
                    payload = json.loads(response.read())
                    if status == 200:
                        self.assertEqual(payload["source"], "local")
                        self.assertIn("no-store", response.getheader("Cache-Control"))
                    connection.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_vercel_http_handler(self):
        actual = node_eval("""
            process.env.ARK_API_KEY='';
            const base=JSON.parse(await new Response(process.stdin).text());
            const results=[];
            for(const [method,body] of [['POST',base],['POST',{}],['POST',{extra:'x'.repeat(4097)}],['GET',null]]) {
              const output={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
              await wow.default({method,body,headers:{},socket:{remoteAddress:'contract-test'}},output);
              results.push([output.code,output.body.source||null,output.headers['Cache-Control']]);
            }
            console.log(JSON.stringify(results));
        """, BASE)
        self.assertEqual(actual, [[200, "local", "no-store"], [400, None, "no-store"], [413, None, "no-store"], [405, None, "no-store"]])


if __name__ == "__main__":
    unittest.main()
