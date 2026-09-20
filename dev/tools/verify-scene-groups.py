"""Semantic regressions: group identities, relations, diversity and quantity boundaries."""
import importlib.util
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root))
spec = importlib.util.spec_from_file_location('group_server', root / 'serve.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
def resolve(text, entities=None):
    return server.keyword_scene_result(text, {'world': 'meadow', 'entities': entities or {}})
def assets(text, entities=None):
    result = resolve(text, entities)
    assert result and not result.get('sceneSwitch'), (text, result)
    return [c['asset'] for c in result['commands']]
expected = {
    '黄色四巨头': {'yellow:bull','yellow:round','yellow:jiaojiao','yellow:kangaroo'},
    '叫叫的家族': {'npc:jiaojiao','npc:lingdang','npc:zhuxiaodi'},
    '叫叫的全家里头': {'npc:jiaojiao','npc:jiaojiao-dad','npc:jiaojiao-mom'},
    '绿豆家族': {'npc:lvdou','npc:fendou','npc:douya','npc:landou','npc:dahongdou'},
    '叫叫的爸爸妈妈': {'npc:jiaojiao-dad','npc:jiaojiao-mom'},
}
for phrase, wanted in expected.items():
    actual = assets('来'+phrase)
    assert set(actual) == wanted and len(actual) == len(wanted), (phrase, actual)
assert len(assets('来两组黄色四巨头')) == 8
assert len(assets('来10个水果')) == 10
assert len(set(assets('来5种徽章'))) == 5
for category in ['交通工具','水果','道具']:
    first = assets('给我来一些'+category)
    assert len(first) == len(set(first)) == 5
    context = {str(i): {'asset': asset} for i, asset in enumerate(first)}
    second = assets('还给我来一些不同的'+category, context)
    assert len(set(second)) == 5 and not set(first) & set(second), (category, first, second)
fruit = assets('来100种不同的水果')
assert 10 <= len(fruit) < 100 and len(set(fruit)) == len(fruit)
assert not resolve('不要叫叫全家')['commands']
assert assets('来个学豆') == ['prop:growth-bean']
assert assets('来个成长豆') == ['prop:growth-bean']
entities = {str(i): {'asset': asset} for i, asset in enumerate(expected['黄色四巨头'])}
result = resolve('黄色四巨头招手', entities)
assert len(result['commands']) == 4 and all(c['type'] == 'entity.animate' for c in result['commands'])
try: assets('来100组叫叫全家')
except ValueError: pass
else: raise AssertionError('Group expansion must respect 100 item limit')
print('PASS: group identity, parents, group actions, quantity limits, no duplicates, unseen-first categories and study-bean aliases')
