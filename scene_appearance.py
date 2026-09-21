"""Explicit size/color choices are kept through automatic placement."""
import re
from scene_interactions import resolve_objects
from scene_groups import select_scene_group
NORMAL_SCALE=.65
COLORS={'红色':'#e66b65','蓝色':'#528ccc','黄色':'#efcc4d','绿色':'#70b681','紫色':'#9e72cf','橙色':'#ef962f','粉色':'#e899bd','黑色':'#343b46','白色':'#f3f0e6','棕色':'#99734d'}

def attributes(text):
    result={}
    times=re.search(r'(\d+(?:\.\d+)?|[一二两三四五六七八九十])倍',text)
    if times:
        number=times.group(1);digits={'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}
        factor=digits[number] if number in digits else float(number)
        if not .2<=factor<=8: raise ValueError('大小比例请使用0.2到8倍。')
        result['scale']=round(NORMAL_SCALE*factor,4)
    elif re.search(r'正常(?:尺寸|大小)?|标准(?:尺寸|大小)?|原始大小|原大小',text): result['scale']=NORMAL_SCALE
    elif re.search(r'超大|巨大|特别大',text): result['scale']=NORMAL_SCALE*2.5
    elif re.search(r'超小|特别小|迷你',text): result['scale']=NORMAL_SCALE*.4
    elif re.search(r'大的|大一点|大一些|变大|放大|大号',text): result['scale']=NORMAL_SCALE*1.5
    elif re.search(r'小的|小一点|小一些|变小|缩小|小号',text): result['scale']=NORMAL_SCALE*.65
    for word,color in COLORS.items():
        if word in text or re.search(r'(?:变|改成|染成)'+word[0]+r'(?:色|的|$)',text): result['color']=color
    return result


def appearance_edit(text,context,catalog,root,quantity):
    objects=resolve_objects(text,catalog,quantity)
    group=select_scene_group(text,context,catalog,root)
    stripped=text
    for entry in catalog['modules']:
        if entry.get('kind') in {'actor','prop'}:
            for word in sorted([entry['name'],*entry.get('keywords',[])],key=len,reverse=True):
                if len(word)>1: stripped=stripped.replace(word,'')
    choices=attributes(stripped)
    if not choices or not re.search(r'把|变成|改成|改为|调成|放大|缩小|恢复|变大|变小|染成|变红|变蓝|变绿|变黄|变紫',text): return None
    if re.search(r'生成|变出|召唤|来[一二两三四五六七八九十\d个些]',text): return None
    entities=context.get('entities',{}) if isinstance(context,dict) else {}
    targets=set(group['members'] if group else [o['asset'] for o in objects])
    selected=[id for id,e in entities.items() if e.get('asset') in targets or (not targets and (len(entities)==1 or re.search(r'全部|所有|它们|这些',text)))]
    if not selected:return {'reply':'当前没有找到要调整的模型，请先召唤或说出模型名字。','commands':[],'sceneSwitch':None,'source':'appearance','handled':True}
    commands=[]
    for id in selected[:100]:
        if 'scale' in choices: commands.append({'type':'entity.scale','id':id,'scale':choices['scale']})
        if 'color' in choices: commands.append({'type':'entity.color','id':id,'color':choices['color']})
    return {'reply':f'已调整{len(selected[:100])}个模型的大小或颜色；指定大小保持不变。','commands':commands,'sceneSwitch':None,'source':'appearance','handled':True}


def decorate_spawns(result,text,catalog):
    if not result:return result
    by_id={entry['id']:entry for entry in catalog['modules']}
    spawns=[c for c in result.get('commands',[]) if c['type']=='entity.spawn']
    types=set(c['asset'] for c in spawns)
    matches=[]
    for asset in types:
        entry=by_id[asset]
        candidates=[(text.find(word),word) for word in [entry['name'],*entry.get('keywords',[])] if len(word)>1 and word in text]
        if candidates:
            start,word=min(candidates,key=lambda p:(p[0],-len(p[1])))
            matches.append((start,start+len(word),asset))
    matches.sort();local={};previous=0
    for start,end,asset in matches:
        local[asset]=attributes(text[previous:start]);previous=end
    if len(types)==1:
        cleaned=text
        for _,_,asset in matches:
            entry=by_id[asset]
            for word in sorted([entry['name'],*entry.get('keywords',[])],key=len,reverse=True): cleaned=cleaned.replace(word,'')
        for asset in types:local[asset]=attributes(cleaned)
    for c in spawns:
        opts=local.get(c['asset'],{})
        if 'scale' in opts:c.update(scale=opts['scale'],sizeLocked=True)
        if 'color' in opts:c.update(color=opts['color'],colorOverride=True)
    return result
