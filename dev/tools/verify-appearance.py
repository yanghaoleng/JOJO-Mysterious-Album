import importlib.util
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[2];sys.path.insert(0,str(root))
spec=importlib.util.spec_from_file_location('appearance_server',root/'serve.py');server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
def run(text,entities=None):return server.keyword_scene_result(text,{'world':'meadow','entities':entities or {}})
for phrase,scale in [('正常尺寸',.65),('大的',.975),('超大的',1.625),('3倍的',1.95),('三倍的',1.95)]:
 result=run('来一个'+phrase+'猪小弟');spawns=[c for c in result['commands'] if c['type']=='entity.spawn'];assert len(spawns)==1 and abs(spawns[0]['scale']-scale)<1e-8 and spawns[0]['sizeLocked'],result
assert len(run('来3倍的猪小弟')['commands'])==1
entities={'pig':{'asset':'npc:zhuxiaodi','position':[0,0],'scale':.65}}
r=run('把猪小弟变成3倍大小和蓝色',entities);assert [c['type'] for c in r['commands']]==['entity.scale','entity.color']
r=run('来一个超大的红色猪小弟和两个正常尺寸的蓝色汉堡包');assert len(r['commands'])==3
assert r['commands'][0]['scale']==1.625 and r['commands'][0]['color']=='#e66b65'
assert all(c['scale']==.65 and c['color']=='#528ccc' for c in r['commands'][1:])
assert not run('把猪小弟变成蓝色')['commands']
r=run('来大红豆');assert 'colorOverride' not in r['commands'][0] and not r['commands'][0].get('sizeLocked')
print('PASS: normal/large/huge/multiplier, scale is not quantity, existing edits, independent colors and sizes, name false-positive guard')
