"""Regression: repeated large scenes, nearest replacements, unavailable model."""
import importlib.util
import json
import sys
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from unittest.mock import patch

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root))
spec = importlib.util.spec_from_file_location('scene_server', root / 'serve.py')
server_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_module)
server = ThreadingHTTPServer(('127.0.0.1', 0), server_module.NoCacheHandler)
Thread(target=server.serve_forever, daemon=True).start()
context = {'world': 'meadow', 'entities': {}}

def submit(text):
    body = json.dumps({'text': text, 'context': context}).encode()
    request = Request(f'http://127.0.0.1:{server.server_port}/api/scene-control', data=body, headers={'Content-Type': 'application/json'})
    with urlopen(request, timeout=10) as response:
        return json.load(response), len(body)

try:
    for name, asset in [('猪小弟', 'npc:zhuxiaodi'), ('叫叫', 'npc:jiaojiao'), ('铃铛', 'npc:lingdang')]:
        character, _ = submit(f'来10个{name}')
        assert len(character['commands']) == 10
        assert all(c['asset'] == asset for c in character['commands']), character
        assert 'substitution' not in character
    apples, _ = submit('来100个苹果')
    assert len(apples['commands']) == 100
    context['entities'] = {c['id']: c for c in apples['commands']}
    durians, size = submit('来100个榴莲')
    assert size > 4096, 'Must reproduce the old request-size failure'
    assert len(durians['commands']) == 100
    assert durians['source'] == 'approximate'
    assert durians['substitution']['replacement'] == '菠萝'
    assert all(c['asset'] == 'prop:collection-34-0' for c in durians['commands'])
    unknown, _ = submit('来100个未知的量子装置')
    assert len(unknown['commands']) == 100 and unknown['substitution']['count'] == 100
    with patch.dict(server_module.os.environ, {'ARK_API_KEY': ''}):
        result = server_module.scene_control_result('神秘的呼噜噜', context)
        assert result['commands'] and result['substitution']
    print('PASS: >4KB existing scene, 100 apples then 100 substituted durians, preserved quantity, no-key fallback')
finally:
    server.shutdown()
    server.server_close()
