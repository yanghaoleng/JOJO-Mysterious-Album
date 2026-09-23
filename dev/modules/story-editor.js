import { WOW_DEV_STORY } from '../content/stories/wow.js';
import { MOON_CURIOSITY_STORY } from '../content/stories/moon.js';
import { DEBATE_STORY, debateFallback } from '../content/stories/debate.js';
import { WORLD_CATALOG } from '../content/worlds.js';
import { validateEvents, safeId } from '../runtime/contracts.js';
import { publishStory } from '../content/stories/published.js';
import { createElement, Upload, Send, GripVertical, Trash2 } from 'lucide';
const sources = { wow: WOW_DEV_STORY, moon: MOON_CURIOSITY_STORY, debate: DEBATE_STORY };
const clone = x => JSON.parse(JSON.stringify(x));
const uid = prefix => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const triggers = ['scene.enter','scene.exit','answer.accepted','creation.saved','encounter.enter','encounter.choice','zone.enter','entity.interact','story.completed','debate.ready','debate.completed'];
export function validateDraft(story) {
  if (!story || !safeId(story.id)) throw Error('故事 ID 无效');
  validateEvents(story.events);
  if (story.interaction === 'debate') {
    if (!Array.isArray(story.topics) || !story.topics.length || story.topics.some(x => typeof x !== 'string' || !x.trim())) throw Error('请填写辩论话题');
    for (const key of ['topicLabels','reflections','rounds']) if (!Array.isArray(story[key]) || story[key].some(x => typeof x !== 'string')) throw Error(`缺少或无效的 ${key}`);
    if (!Array.isArray(story.speakers) || story.speakers.length < 2 || story.speakers.some(x => !x || !safeId(x.id))) throw Error('辩论需要两位有效角色');
    return story;
  }
  if (!Array.isArray(story.scenes) || !story.scenes.length) throw Error('至少需要一幕');
  const ids = new Set();
  for (const s of story.scenes) {
    if (!safeId(s.id) || ids.has(s.id)) throw Error('场景 ID 无效或重复');
    ids.add(s.id);
    if (!WORLD_CATALOG.some(w => w.id === s.world)) throw Error(`${s.id} 的星球无效`);
    for (const key of ['dialogue','closing']) if (s[key] !== undefined && (!Array.isArray(s[key]) || s[key].some(l => typeof l.text !== 'string' || typeof l.speaker !== 'string'))) throw Error(`${s.id} 的对白无效`);
    const choices = new Set();
    if (!Array.isArray(s.choices)) throw Error('选项列表无效');
    for (const c of s.choices) { if (!safeId(c.id) || choices.has(c.id) || typeof c.label !== 'string' || !c.label.trim()) throw Error(`${s.id} 的选项为空或 ID 重复`); choices.add(c.id); }
    validateEvents(s.events);
  }
  for (const s of story.scenes) for (const next of [s.next, ...s.choices.map(c => c.next)]) if (next && next !== 'end' && !ids.has(next)) throw Error(`跳转目标 ${next} 不存在，请先修正引用`);
  return story;
}
export function mountStoryEditor(root, sourceId) {
  const key = `jma.author.draft.v1.${sourceId}${sourceId === "wow" && sources.wow.version >= 2 ? ".first-light" : ""}`;
  let draft = clone(sources[sourceId]), active = 0, disposed = false, initial = '编辑会自动保存在此浏览器。完成后可以直接发布。';
  try { const saved = localStorage.getItem(key); if (saved) { draft = validateDraft(JSON.parse(saved)); initial = '已恢复本地草稿。'; } } catch { initial = '本地草稿无法读取，已展示原始脚本；编辑后会保存新草稿。'; }
  root.classList.add('story-editor');
  const el = (tag, text, parent, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; parent?.append(n); return n; };
  const btn = (parent, text, fn) => { const b = el('button', text, parent); b.type = 'button'; b.onclick = fn; return b; };
  const iconButton = (parent, label, icon, fn, primary = false) => { const b = btn(parent, '', fn); b.className = `se-action${primary ? ' se-action-primary' : ''}`; b.title = label; b.setAttribute('aria-label', label); b.append(createElement(icon, { width: 15, height: 15, 'stroke-width': 1.8, 'aria-hidden': 'true' }), el('span', label)); return b; };
  let status;
  const save = () => { try { localStorage.setItem(key, JSON.stringify(draft)); status.textContent = '已保存本地草稿 · 不影响正式游戏'; } catch { status.textContent = '浏览器无法保存，请导出备份后再离开。'; } };
  const field = (parent, label, value, change, options, multiline = false) => {
    const wrap = el('label', label, parent, 'se-field');
    if (options) {
      wrap.classList.add('se-select-field');
      if (options.length > 5) {
        const menu = el('details', undefined, wrap, 'se-menu');
        const summary = el('summary', options.find(([v]) => v === value)?.[1] || '请选择', menu);
        const group = el('div', undefined, menu, 'se-menu-options');
        options.forEach(([v, t]) => { const b = btn(group, t, () => { change(v); save(); render(); }); b.className = 'se-menu-option'; b.setAttribute('aria-pressed', String(value === v)); });
        return wrap;
      }
      const group = el('div', undefined, wrap, 'se-choice-options');
      options.forEach(([v, t]) => { const b = btn(group, t, () => { change(v); save(); render(); }); b.className = 'se-choice-option'; b.setAttribute('aria-pressed', String(value === v)); });
      return wrap;
    }
    const input = el(multiline ? 'textarea' : 'input', undefined, wrap);
    if (!multiline) input.type = 'text';
    if (multiline) input.rows = 6;
    input.value = value ?? ''; input.setAttribute('aria-label', label);
    input.onchange = () => { change(input.value); save(); };
    return input;
  };
  const choiceField = (parent, label, value, change, options) => {
    const wrap = el('div', undefined, parent, 'se-field se-choice-field');
    el('span', label, wrap, 'se-field-label');
    const group = el('div', undefined, wrap, 'se-choice-options');
    options.forEach(([v, t]) => { const b = btn(group, t, () => { change(v); save(); render(); }); b.className = 'se-choice-option'; b.setAttribute('aria-pressed', String(value === v)); });
    return wrap;
  };
  const section = (parent, title) => { const s = el('section', undefined, parent, 'se-section'); el('h3', title, s); return s; };
  const events = (parent, owner, title) => {
    const box = section(parent, title); owner.events ||= [];
    owner.events.forEach((e, i) => {
      const row = el('div', undefined, box, 'se-event');
      field(row, '触发时机', e.on, v => e.on = v, [...new Set([...triggers, e.on])].map(v => [v, ({'scene.enter':'进入这一幕','answer.accepted':'回答被接受','scene.exit':'离开这一幕','creation.saved':'作品保存后'})[v] || v]));
      field(row, '触发次数', e.once ? 'once' : 'always', v => e.once = v === 'once', [['always','每次都触发'],['once','只触发一次']]);
      e.effects.forEach((effect, effectIndex) => {
        if (effect.type === 'world.react') field(row, `世界回应 ${effectIndex + 1}`, effect.action, v => { effect.action = v; render(); }, [['celebrate','庆祝'],['listen','倾听'],['wave','挥手'],['hop','跳一跳']]);
        if (effect.type === 'actor.animate') { field(row, '动作角色', effect.target, v => effect.target = v); field(row, '角色动作', effect.animation, v => { effect.animation = v; render(); }, ['idle','wave','hop','listen','talk','walk'].map(v => [v,v])); }
        if (effect.type === 'environment.set') field(row, '环境预设', effect.preset, v => { effect.preset = v; render(); }, ['day','dusk','night','default'].map(v => [v,v]));
      });
      el('p', e.effects.map(x => ({'actor.animate':`角色 ${x.target} 做 ${x.animation}`, 'world.react':`世界回应：${x.action}`, 'environment.set':`环境变为 ${x.preset}`, 'entity.spawn':`出现物件 ${x.asset}`})[x.type] || x.type).join(' → '), row);
      const details = el('details', undefined, row); el('summary','高级：条件与效果', details);
      const area = field(details,'事件配置（JSON）',JSON.stringify(e,null,2), () => {}, undefined, true);
      area.onchange = () => { try { const value = JSON.parse(area.value); validateEvents([value]); owner.events[i] = value; save(); render(); } catch(error) { status.textContent = `事件未应用：${error.message}`; area.setAttribute('aria-invalid','true'); } };
      btn(row,'删除事件', () => { owner.events.splice(i,1); save(); render(); });
    });
    btn(box,'＋ 新增事件', () => { owner.events.push({id:uid('event'),on:draft.interaction === 'debate' ? 'debate.completed' : 'answer.accepted',once:false,effects:[{type:'world.react',action:'celebrate'}]}); save(); render(); });
  };
  const lines = (parent, scene, key, title) => {
    const box = section(parent,title); scene[key] ||= [];
    scene[key].forEach((line,i) => { const row=el('div',undefined,box,'se-line'); field(row,'说话人',line.speaker,v=>line.speaker=v); field(row,'对白内容',line.text,v=>line.text=v); const remove=btn(row,'',()=>{scene[key].splice(i,1);save();render();}); remove.className='se-icon-button'; remove.title='删除对白'; remove.setAttribute('aria-label','删除对白'); remove.append(createElement(Trash2,{width:15,height:15,'stroke-width':1.8,'aria-hidden':'true'})); });
    btn(box,'＋ 添加对白',()=>{scene[key].push({speaker:'guide',text:'在这里写一句对白。'});save();render();});
  };
  const preview = () => {
    try { validateDraft(draft); } catch(e) { status.textContent=e.message; return; }
    const panel = el('section',undefined,root,'se-preview'); el('h3','文字分支预演',panel); el('p','检查对白与选项跳转；事件仅展示，不执行 3D 效果或 AI 回答。',panel);
    const body=el('div',undefined,panel); btn(panel,'关闭预演',()=>panel.remove());
    const show = i => { body.replaceChildren(); const s=draft.scenes[i]; el('h4',s.title,body); for (const l of s.dialogue || []) el('p',`${l.speaker}：${l.text}`,body); el('strong',s.question,body);
      const advance = choice => { for (const l of s.closing || []) el('p',`${l.speaker}：${l.text}`,body); const target=choice?.next || s.next; const next=target==='end' ? -1 : target ? draft.scenes.findIndex(x=>x.id===target) : i+1; body.querySelectorAll('button').forEach(b=>b.disabled=true); if(next<0 || next>=draft.scenes.length) el('p','故事结束',body); else btn(body,'进入下一幕',()=>show(next)); };
      for(const c of s.choices) btn(body,c.label,()=>advance(c)); if(!s.choices.length) btn(body,'继续',()=>advance());
    }; show(active); panel.scrollIntoView({block:'nearest'});
  };
  function render() {
    root.replaceChildren();
    const toolbar=el('div',undefined,root,'se-toolbar');
    iconButton(toolbar,'发布脚本',Send,()=>{try {if(root.querySelector('[aria-invalid="true"]'))throw Error('请先修正未应用的事件配置');validateDraft(draft);publishStory({...draft,id:sourceId});status.textContent='已发布。重新打开游戏页面即可读取这版脚本。';}catch(e){status.textContent=`无法发布：${e.message}`;}},true);
    const upload=el('input',undefined,toolbar);upload.type='file';upload.accept='.json,application/json';upload.hidden=true;
    iconButton(toolbar,'导入脚本',Upload,()=>upload.click()); upload.onchange=async()=>{try{const file=upload.files[0];if(!file)return;if(file.size>2e6)throw Error('文件不能超过 2 MB');const next=validateDraft(JSON.parse(await file.text()));if((next.interaction==='debate') !== (sourceId==='debate'))throw Error('请在对应类型的脚本页面导入');if(disposed)return;draft=next;active=0;save();render();}catch(e){status.textContent=`导入失败：${e.message}`;}};
    status=el('p',initial,root,'se-status');status.setAttribute('role','status');
    field(root,'故事标题',draft.title || '辩论与表达',v=>draft.title=v);
    el('p',`草稿身份：${draft.id} · 原场景 ID 保留，改台词不改变存档身份。`,root,'muted');
    if(draft.interaction==='debate') {
      const box=section(root,'辩论流程'); el('p','选择话题 → 两位角色用四句承接式对话商量 → 反思选项 → 带着想法去造物。下面展示的是现有备用台词。',box);
      for(const name of ['opening','handoff','ending'])field(box,({opening:'开场对白',handoff:'承接对白',ending:'结尾对白'})[name],draft[name],v=>draft[name]=v);
      draft.topics.forEach((topic,i)=>{field(box,`话题 ${i+1}`,topic,v=>draft.topics[i]=v);field(box,`话题 ${i+1} 的短选项`,draft.topicLabels[i],v=>draft.topicLabels[i]=v);const details=el('details',undefined,box);el('summary','查看备用四句对白（只读）',details);for(const turn of debateFallback(sources.debate.topics[i] || '',draft.speakers).turns)el('p',`${turn.speakerId}：${turn.text}`,details);});
      draft.reflections.forEach((v,i)=>field(box,`反思选项 ${i+1}`,v,x=>draft.reflections[i]=x));events(root,draft,'全故事事件');return;
    }
    const layout=el('div',undefined,root,'se-layout'), nav=el('nav',undefined,layout,'se-scenes'), main=el('div',undefined,layout,'se-content'); nav.setAttribute('aria-label','场景流程');
    draft.scenes.forEach((s,i)=>{const b=btn(nav,'',()=>{active=i;render();});b.className='se-scene-item';b.draggable=true;b.dataset.sceneIndex=String(i);b.setAttribute('aria-current',String(i===active));b.append(createElement(GripVertical,{class:'se-drag-handle',width:15,height:15,'stroke-width':1.7,'aria-hidden':'true'}),el('span',`${String(i+1).padStart(2,'0')}  ${s.title || s.id}\n${s.choices.length} 个选项 · ${(s.events || []).length} 个事件`));b.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',String(i));event.dataTransfer.effectAllowed='move';});b.addEventListener('dragover',event=>{event.preventDefault();b.classList.add('is-drag-over');});b.addEventListener('dragleave',()=>b.classList.remove('is-drag-over'));b.addEventListener('drop',event=>{event.preventDefault();b.classList.remove('is-drag-over');const from=Number(event.dataTransfer.getData('text/plain'));if(!Number.isInteger(from)||from===i)return;const [moved]=draft.scenes.splice(from,1);draft.scenes.splice(i,0,moved);active=i;save();render();});});
    btn(nav,'＋ 新增场景',()=>{draft.scenes.push({id:uid('scene'),title:'新的相遇',world:'meadow',chapter:1,inputMode:'choice',dialogue:[],question:'你想怎么做？',choices:[],events:[],closing:[]});active=draft.scenes.length-1;save();render();});
    const s=draft.scenes[active];
    const meta=section(main,'场景与去向');field(meta,'场景标题',s.title,v=>{s.title=v;render();});el('code',s.id,meta);
    field(meta,'所在星球',s.world,v=>s.world=v,WORLD_CATALOG.map(w=>[w.id,w.name]));
    const destinations=[['','按场景顺序继续'],['end','结束故事'],...draft.scenes.map(x=>[x.id,x.title || x.id])];
    field(meta,'默认下一幕',s.next,v=>{if(v)s.next=v;else delete s.next;},destinations);
    lines(main,s,'dialogue','对白 · 按顺序说');
    const q=section(main,'问题与匹配选项');field(q,'向孩子提出的问题',s.question,v=>s.question=v);choiceField(q,'输入方式',s.inputMode || 'choice',v=>s.inputMode=v,[['choice','直接点选'],['voice','先听后选']]);
    s.choices.forEach((c,i)=>{const row=el('div',undefined,q,'se-choice');field(row,`选项 ${i+1}`,c.label,v=>c.label=v);field(row,`选项 ${i+1} 的去向`,c.next,v=>{if(v)c.next=v;else delete c.next;},destinations);const remove=btn(row,'',()=>{s.choices.splice(i,1);save();render();});remove.className='se-icon-button';remove.title='删除选项';remove.setAttribute('aria-label','删除选项');remove.append(createElement(Trash2,{width:15,height:15,'stroke-width':1.8,'aria-hidden':'true'}));});
    btn(q,'＋ 添加选项',()=>{s.choices.push({id:uid('choice'),label:'新的想法'});save();render();});
    lines(main,s,'closing','回应后的对白');events(main,s,'这一幕的事件');
    const global=el('details',undefined,main);el('summary',`全故事事件 · ${(draft.events || []).length} 条`,global);events(global,draft,'在整个故事中生效');
  }
  render();
  return ()=>{disposed=true;root.classList.remove('story-editor');};
}
