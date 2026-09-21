"""Data-driven role groups and varied category selection; no model-generated code."""
import json
import random
import re
import uuid


def select_scene_group(text, context, catalog, root):
    definitions = json.loads((root / 'dev/content/scene-groups.json').read_text(encoding='utf-8'))
    available = {entry['id']: entry for entry in catalog['modules'] if entry.get('kind') in {'prop', 'actor'}}
    # Long aliases win over nested aliases, while independent groups can be combined.
    hits = sorted([(len(alias), text.index(alias), group) for group in definitions['groups'] for alias in group['aliases'] if alias in text], key=lambda hit: -hit[0])
    spans, selected = [], []
    for length, start, group in hits:
        if any(start < end and start + length > begin for begin, end in spans):
            continue
        spans.append((start, start + length))
        if group not in selected:
            selected.append(group)
    if selected:
        members = list(dict.fromkeys(asset for group in selected for asset in group['members'] if asset in available))
        return {'name': '、'.join(group['name'] for group in selected), 'members': members, 'category': False}
    category = next((name for name in ['交通工具', '水果', '徽章', '昆虫', '道具', '玩具', '食物'] if name in text), None)
    if not category:
        return None
    # A specific noun such as “苹果这种水果” still selects the named object.
    specific = [entry for entry in available.values() if any(len(word) > 1 and word != category and word in text for word in [entry['name'], *entry.get('keywords', [])])]
    if specific and not re.search(r'不同|各种|各类|多样|一些|一批|一组|几种|几个', text):
        return None
    def accepts(entry):
        if entry.get('kind') != 'prop': return False
        if category == '道具': return True
        if category == '水果': return '水果' in entry.get('tags', [])
        if category == '徽章': return entry['id'].startswith('prop:badge-')
        if category == '昆虫': return entry['id'] in {'prop:bee', 'prop:fly', 'prop:mosquito'}
        return entry.get('category') == category
    candidates = [entry for entry in available.values() if accepts(entry)]
    entities = context.get('entities', {}) if isinstance(context, dict) else {}
    present = {entity.get('asset') for entity in entities.values()}
    seen_varieties = {available[asset].get('variety', asset) for asset in present if asset in available}
    random.SystemRandom().shuffle(candidates)
    candidates.sort(key=lambda entry: (entry.get('variety', entry['id']) in seen_varieties, entry['id'] in present))
    distinct, varieties = [], set()
    for entry in candidates:
        variety = entry.get('variety', entry['id'])
        if variety not in varieties:
            varieties.add(variety)
            distinct.append(entry['id'])
    return {'name': category, 'members': distinct, 'targetMembers': [entry['id'] for entry in candidates], 'category': True}


def spawn_scene_group(text, selection, quantity):
    if re.search(r'不要|别让|不许|除了|除外|以外', text):
        return {'reply': '这句包含排除条件，请明确说要召唤哪些成员。', 'commands': [], 'sceneSwitch': None, 'source': 'group', 'handled': True}
    members = selection['members']
    count, explicit = quantity(re.sub(r'(\d+|[一二两三四五六七八九十百]+)(?:种|组|套)', r'\1个', text))
    if not members:
        return {'reply': '这个组暂时没有可用模型。', 'commands': [], 'sceneSwitch': None, 'source': 'group', 'handled': True}
    if not explicit: count = 5 if selection['category'] else len(members)
    if not selection['category'] and re.search(r'(\d+|[一二两三四五六七八九十百]+)(?:组|套)', text):
        count *= len(members)
    if count > 100: raise ValueError('每次最多生成 100 个模型，请减少组数。')
    if selection['category'] and re.search(r'种|不同|不重复', text):
        count = min(count, len(members))
    assets = [members[i % len(members)] for i in range(count)]
    token = uuid.uuid4().hex[:10]
    commands = [{'type': 'entity.spawn', 'id': f'group-{token}-{i}', 'asset': asset, 'position': [0, 0], 'scale': .36 if count > 32 else .55} for i, asset in enumerate(assets)]
    names = f"{selection['name']}，共 {count} 个、{len(set(assets))} 种模型。"
    if selection['category'] and count >= len(members): names += '已包含这个分类的全部可用种类。'
    return {'reply': names, 'commands': commands, 'sceneSwitch': None, 'source': 'group', 'matches': [selection['name'], *dict.fromkeys(assets)], 'handled': True}
