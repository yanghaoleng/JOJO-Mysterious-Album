import importlib.util
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[2];sys.path.insert(0,str(root))
spec=importlib.util.spec_from_file_location('compound_server',root/'serve.py');server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
context={'world':'meadow','entities':{}}
r=server.keyword_scene_result('10个猪小弟吃80个汉堡包',context)
assert len(r['commands'])==91,r
assert sum(c.get('asset')=='npc:zhuxiaodi' for c in r['commands'])==10
assert sum(c.get('asset')=='prop:burger' for c in r['commands'])==80
plan=r['commands'][-1];assert plan['type']=='feeding.start' and len(plan['eaters'])==10 and len(plan['foods'])==80
context['entities']={c['id']:c for c in r['commands'][:-1]}
r=server.keyword_scene_result('猪小弟吃汉堡包',context);assert len(r['commands'])==1
stop=server.keyword_scene_result('停止吃',context)['commands'][0];assert stop['type']=='feeding.stop' and len(stop['eaters'])==10
r=server.keyword_scene_result('来10个猪小弟和80个汉堡包',{'entities':{}});assert len(r['commands'])==90
assert not server.keyword_scene_result('10个猪小弟吃80辆汽车',context)['commands']
assert not server.keyword_scene_result('不要10个猪小弟吃80个汉堡包',context)['commands']
try:server.keyword_scene_result('30个猪小弟吃80个汉堡包',{'entities':{}})
except ValueError:pass
else:raise AssertionError('Total spawn limit')
print('PASS: separate actor/food quantities, eating plan, existing-object reuse, stop, invalid food and total quantity limit')
