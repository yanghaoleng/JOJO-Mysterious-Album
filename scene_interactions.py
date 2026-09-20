"""Resolve bounded multi-object requests before the single-noun fallback."""
import re
import uuid
from scene_groups import select_scene_group


def resolve_objects(text, catalog, quantity):
    candidates = []
    for entry in catalog['modules']:
        if entry.get('kind') not in {'actor', 'prop'}: continue
        for word in [entry['name'], *entry.get('keywords', [])]:
            if len(word) < 2: continue
            for hit in re.finditer(re.escape(word), text):
                candidates.append((hit.start(), hit.end(), entry))
    candidates.sort(key=lambda hit: (-(hit[1]-hit[0]), not hit[2]['id'].startswith('npc:')))
    chosen = []
    for start, end, entry in candidates:
        if any(start < b and end > a for a, b, _ in chosen): continue
        chosen.append((start, end, entry))
    chosen.sort(key=lambda hit: hit[0])
    previous, result = 0, []
    for start, end, entry in chosen:
        count, explicit = quantity(text[previous:start])
        result.append({'asset': entry['id'], 'kind': entry['kind'], 'category': entry.get('category'), 'count': count, 'explicit': explicit})
        previous = end
    return result


def _borrow_scene_entity(entries, exclude=()):
    for _eid, item in entries.items():
        asset = str(item.get('asset', ''))
        if not asset or asset in exclude:
            continue
        return {'asset': asset, 'kind': 'actor' if asset.startswith('npc:') else 'prop', 'count': 1, 'explicit': False}
    return None


def compound_scene_result(text, context, catalog, root, quantity):
    eating = re.search(r'吃(?:掉|光|完|起来)?', text)
    entries = context.get('entities', {}) if isinstance(context, dict) else {}
    if re.search(r'停止吃|别吃了|不要吃了|停止进食', text):
        actors = resolve_objects(text, catalog, quantity)
        group = select_scene_group(text, context, catalog, root)
        assets = set(group['members'] if group else [item['asset'] for item in actors])
        actor_assets = {entry['id'] for entry in catalog['modules'] if entry.get('kind') == 'actor'}
        eaters = [id for id, item in entries.items() if item.get('asset') in actor_assets and (not assets or item.get('asset') in assets)][:100]
        return {'reply':'已停止进食。','commands':[{'type':'feeding.stop','eaters':eaters}] if eaters else [],'sceneSwitch':None,'source':'compound','handled':True}
    objects = resolve_objects(text, catalog, quantity)
    if not eating and len(objects) < 2: return None
    if re.search(r'不要|不许|除了|除外|以外',text):
        return {'reply':'请直接说要生成哪些角色和物件，以及各自的数量。','commands':[],'sceneSwitch':None,'source':'compound','handled':True}
    if eating:
        left, right = text[:eating.start()], text[eating.end():]
        actors, foods = resolve_objects(left,catalog,quantity), resolve_objects(right,catalog,quantity)
        group = select_scene_group(left,context,catalog,root)
        if group and not group['category']:
            actors = [{'asset':asset,'kind':'actor','count':1,'explicit':True} for asset in group['members']]
        # “A 吃 B”是开放表演：不限定吃者必须是角色、食物必须是食物类；
        # 一侧识别不出具体对象时，借用场景里已有的对象来演（“一个鸡腿吃汉堡”也成立）。
        if not actors:
            actors = [borrowed] if (borrowed := _borrow_scene_entity(entries)) else []
        if not foods:
            foods = [borrowed] if (borrowed := _borrow_scene_entity(entries, exclude={a['asset'] for a in actors})) else []
        if not actors or not foods:
            return {'reply':'先把要表演吃的东西召唤出来吧，比如“变出1个汉堡”，再说“鸡腿吃汉堡”。','commands':[],'sceneSwitch':None,'source':'compound','handled':True}
        objects = actors + foods
    elif not re.search(r'来|生成|变出|召唤|放|加|\d+|[一二两三四五六七八九十]+[个只辆份]',text):
        return None
    commands, ids = [], []
    token = uuid.uuid4().hex[:10]
    for obj in objects:
        existing = [id for id, entity in entries.items() if entity.get('asset') == obj['asset']]
        if eating and existing and not obj['explicit']:
            ids.append(existing)
            continue
        spawned=[]
        for _ in range(obj['count']):
            id=f'compound-{token}-{len(commands)}'
            commands.append({'type':'entity.spawn','id':id,'asset':obj['asset'],'position':[0,0],'scale':.45})
            spawned.append(id)
        ids.append(spawned)
    if len(commands)>100: raise ValueError('角色和物件合计每次最多生成100个，请减少数量。')
    if eating:
        eaters=[id for batch in ids[:len(actors)] for id in batch]
        targets=[id for batch in ids[len(actors):] for id in batch]
        if len(eaters)>100 or len(targets)>100: raise ValueError('一次进食最多安排100个角色和100份食物。')
        commands.append({'type':'feeding.start','eaters':eaters,'foods':targets})
        reply=f'{len(eaters)}个对象和{len(targets)}份食物已安排：各自寻找食物，吃两下消耗一份，吃完继续寻找。'
    else: reply=f'已分别安排{len(objects)}类对象，共{len(commands)}个模型。'
    return {'reply':reply,'commands':commands,'sceneSwitch':None,'source':'compound','matches':[o['asset']+' × '+str(len(batch)) for o,batch in zip(objects,ids)],'handled':True}
