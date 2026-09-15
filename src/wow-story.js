import { WOW_STORY } from './wow-story-data.js';
import { createWowStage } from './wow-stage.js';
import { mountProductIcons } from '../vendor/ui-icons.js';
import { installUISFX, playUISFX } from './ui-sfx.js';
import { localResult } from './wow-local-turn.js';

const $ = id => document.getElementById(id);
const STORAGE = 'wow-first-light-v1';
const chapters = WOW_STORY.chapters;
const total = chapters.reduce((n, chapter) => n + chapter.scenes.length, 0);
const props = {
  torch: ['好奇手电筒', '它把你的话变成光。停下来时，也会留着光等你。'],
  radio: ['唔姆收音机', '先听一听，再把你想说的话寄给MOMO。'],
  jar: ['颜色罐', '已经找到的颜色都会留下，随时可以在“我的旅程”里看。'],
};
const freshState = () => ({ version: 1, chapter: 0, scene: 0, entries: [], props: [], colors: [], firstWords: '', pending: null, done: false });
let state = readState();
let busy = false;
let speechController = null;
let playingAudio = null;
let resolvePlayback = null;
let audioUrl = '';
let readAutomatically = false;
let voiceConsent = false;
let voiceMode = 'idle';
let capture = null;
let recordTimer = null;
let captureGeneration = 0;
let requestController = null;
let asrController = null;
let roundGeneration = 0;
const stage = createWowStage($('wow-stage'));
installUISFX();
mountProductIcons();

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if (!saved || saved.version !== 1 || !Number.isInteger(saved.chapter) || !chapters[saved.chapter] || !Number.isInteger(saved.scene) || !chapters[saved.chapter].scenes[saved.scene]) return freshState();
    if (!Array.isArray(saved.entries) || !Array.isArray(saved.props) || !Array.isArray(saved.colors)) return freshState();
    const ids = new Set(chapters.flatMap(ch => ch.scenes.map(scene => scene.id)));
    saved.entries = saved.entries.filter(e => e && ids.has(e.id) && typeof e.answer === 'string' && typeof e.reaction === 'string').slice(0, total);
    saved.props = saved.props.filter(p => Object.hasOwn(props, p));
    saved.colors = saved.colors.filter(c => c && chapters.some(ch => ch.id === c.id && ch.color === c.color));
    saved.firstWords = String(saved.firstWords || '').slice(0, 160);
    const currentId = chapters[saved.chapter].scenes[saved.scene].id;
    saved.pending = saved.pending && saved.entries.find(e => e.id === currentId) || null;
    saved.done = saved.done === true && saved.entries.length === total;
    return saved;
  } catch { return freshState(); }
}
function save() {
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); }
  catch { $('storage-warning').hidden = false; }
}
const currentChapter = () => chapters[state.chapter];
const currentScene = () => currentChapter().scenes[state.scene];
function expand(value) { return String(value).replaceAll('{firstWords}', state.firstWords || '你好，我在这里。'); }
function currentVisual() { return [...state.entries].reverse().find(e => e.chapter === currentChapter().id && e.kind === 'create')?.visual || null; }
function updateStage(lit = !!state.pending) {
  const chapter = currentChapter(), scene = currentScene();
  stage.update({ chapter: chapter.id, scene: state.scene, kind: scene.kind, lit, color: chapter.color, colors: state.colors, visual: currentVisual(), props: state.props, answer: state.pending?.answer || '', momo: chapter.momo });
  $('wow-stage').setAttribute('aria-label', `${chapter.world}，${scene.speaker}：${expand(scene.text)}${state.pending ? ` 你说：${state.pending.answer}。${state.pending.reaction}` : ''}`);
}
function render() {
  stopSpeech();
  const chapter = currentChapter(), scene = currentScene();
  if (scene.prop && !state.props.includes(scene.prop)) { state.props.push(scene.prop); save(); }
  $('chapter-number').textContent = `第${['一','二','三','四','五','六'][state.chapter]}章`;
  $('chapter-title').textContent = chapter.title;
  $('place').textContent = chapter.world;
  $('scene-count').textContent = `${state.scene + 1} / ${chapter.scenes.length}`;
  $('progress').max = total;
  $('progress').value = state.entries.length;
  $('speaker').textContent = scene.speaker;
  $('story-line').textContent = expand(scene.text);
  $('prompt').textContent = scene.prompt;
  $('answer').value = '';
  $('answer').placeholder = scene.placeholder || '把你想到的，轻轻说出来……';
  $('status').textContent = '';
  $('color-count').textContent = `${state.colors.length} / 6 种颜色`;
  $('stage-note').textContent = state.chapter === 0 && state.scene < 4 ? '有一个小小的声音，正在等你。' : state.pending?.kind === 'create' ? '你说的想法，长成了这把钥匙。' : `${chapter.momo}和你，一起慢慢发现。`;
  $('suggestions').replaceChildren(...scene.suggestions.map(text => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = text;
    button.addEventListener('click', () => submitAnswer(text));
    return button;
  }));
  $('inventory').replaceChildren(...state.props.map(prop => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = props[prop][0];
    button.addEventListener('click', () => { $('status').textContent = props[prop][1]; if (state.pending) $('stage-note').textContent = props[prop][1]; if (prop === 'torch') updateStage(true); });
    return button;
  }));
  $('response-area').hidden = !!state.pending || state.done;
  $('reply').hidden = !state.pending && !state.done;
  if (state.pending) {
    $('your-words').textContent = `你说：“${state.pending.answer}”`;
    $('reaction').textContent = state.pending.reaction;
    $('response-source').textContent = state.pending.source === 'ai' ? 'MOMO · AI 回应' : 'MOMO · 本地故事回应';
  }
  $('next-scene').textContent = state.done ? '翻开我的旅程纪念册 →' : state.scene === chapter.scenes.length - 1 ? state.chapter === 5 ? '把这段旅程留下来 →' : `走进第${['二','三','四','五','六'][state.chapter]}章 →` : '继续听故事 →';
  updateStage();
  if (readAutomatically) void speak(expand(scene.text));
}
function setBusy(value) {
  busy = value;
  document.body.dataset.busy = String(value);
  for (const control of $('response-area').querySelectorAll('button,input')) control.disabled = value;
  $('rest').disabled = value;
  $('restart').disabled = value;
}
async function submitAnswer(raw) {
  if (busy || state.pending || state.done || voiceMode !== 'idle') return;
  const answer = String(raw || '').trim().slice(0,160);
  if (!answer) { $('status').textContent = '先写一句话，或者试试下面的说法。'; $('answer').focus(); return; }
  stopSpeech();
  const scene = currentScene();
  const payload = {chapter:currentChapter().id,kind:scene.kind,answer,prompt:scene.prompt,momo:currentChapter().momo};
  const fallback = localResult(payload);
  if (!fallback.accepted) { $('status').textContent = fallback.reaction; return; }
  const generation = ++roundGeneration;
  setBusy(true);
  $('status').textContent = `${scene.kind === 'create' ? '你的钥匙正在一点点长出来' : 'MOMO 正在认真听你说'}……`;
  updateStage(true);
  let result;
  const controller = new AbortController(); requestController = controller;
  const timer = setTimeout(() => controller.abort(), 13000);
  try {
    const response = await fetch('/api/wow-turn', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),signal:controller.signal });
    if (!response.ok) throw new Error('unavailable');
    result = await response.json();
    if (typeof result.accepted !== 'boolean' || typeof result.reaction !== 'string') throw new Error('invalid');
  } catch { result = fallback; }
  finally { clearTimeout(timer); if(generation === roundGeneration) {requestController = null; setBusy(false);} }
  if (generation !== roundGeneration || currentScene().id !== scene.id) return;
  if (!result.accepted) { $('status').textContent = result.reaction; updateStage(false); return; }
  const visual = { shape:['star','moon','leaf','heart','cloud','fish'].includes(result.visual?.shape) ? result.visual.shape : fallback.visual.shape, color:/^#[0-9a-f]{6}$/i.test(result.visual?.color || '') ? result.visual.color : fallback.visual.color };
  const entry = { id:scene.id,chapter:currentChapter().id,kind:scene.kind,answer,reaction:result.reaction.slice(0,160),source:result.source==='ai'?'ai':'local',visual };
  state.entries.push(entry);
  state.pending = entry;
  if (!state.firstWords) state.firstWords = answer;
  if (scene.kind === 'color' && !state.colors.some(c => c.id === currentChapter().id)) { state.colors.push({id:currentChapter().id,color:currentChapter().color,name:currentChapter().colorName}); playUISFX('reward'); }
  save(); render();
  if (readAutomatically) void speak(entry.reaction);
  $('next-scene').focus({preventScroll:true});
}
function advance() {
  if (busy) return;
  if (state.done) { openBook(); return; }
  if (!state.pending) return;
  if (state.scene < currentChapter().scenes.length - 1) state.scene++;
  else if (state.chapter < chapters.length - 1) { state.chapter++; state.scene = 0; }
  else { state.done = true; save(); render(); openBook(); return; }
  state.pending = null; save(); render();
  $('story-line').setAttribute('tabindex','-1'); $('story-line').focus({preventScroll:true});
  if (innerWidth <= 700) $('story-main').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}

function stopSpeech() {
  speechController?.abort(); speechController=null;
  if (playingAudio) { playingAudio.pause(); playingAudio=null; }
  resolvePlayback?.(); resolvePlayback=null;
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl=''; }
  $('read-aloud').textContent = '听一听';
}
async function speak(text) {
  stopSpeech();
  if (voiceMode !== 'idle') return;
  const controller = new AbortController(); speechController=controller;
  const chunks=Array.from(String(text)).reduce((parts,char)=>{if(!parts.length||parts.at(-1).length+char.length>100)parts.push('');parts[parts.length-1]+=char;return parts;},[]);
  try {
    for(const chunk of chunks){
      if(controller.signal.aborted)return;
      $('read-aloud').textContent='正在准备声音…';
      const timer=setTimeout(()=>controller.abort(),16000);
      let blob;
      try{
        const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:chunk,voice:'bubble'}),signal:controller.signal});
        if(!response.ok)throw new Error('tts');
        blob=await response.blob();
      }finally{clearTimeout(timer);}
      if(controller.signal.aborted)return;
      if(audioUrl)URL.revokeObjectURL(audioUrl);
      audioUrl=URL.createObjectURL(blob);
      const audio=new Audio(audioUrl);playingAudio=audio;
      const ended=new Promise(resolve=>{resolvePlayback=resolve;audio.onended=resolve;audio.onerror=resolve;});
      await audio.play();$('read-aloud').textContent='暂停声音';
      await ended;
      if(controller.signal.aborted)return;
      if(audio.error)throw new Error('audio');
      playingAudio=null;resolvePlayback=null;
    }
    if(speechController===controller)stopSpeech();
  }catch(error){
    if(speechController===controller){stopSpeech();$('status').textContent=error.name==='AbortError'?'声音暂时没连上，故事文字还在这里。':'声音暂时没连上，故事文字还在这里，可以继续。';}
  }
}

async function beginCapture() {
  if (busy || voiceMode !== 'idle' || state.pending) return;
  stopSpeech();
  if (!navigator.mediaDevices?.getUserMedia) { $('status').textContent='这个浏览器暂时不能打开麦克风，可以用文字或下面的说法继续。'; return; }
  const generation = ++captureGeneration;
  voiceMode='starting'; $('record').disabled=true; $('status').textContent='正在打开麦克风……';
  let stream, context;
  try {
    stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
    if (generation !== captureGeneration) { stream.getTracks().forEach(t=>t.stop()); return; }
    context=new (window.AudioContext||window.webkitAudioContext)(); await context.resume();
    if (generation !== captureGeneration) { stream.getTracks().forEach(t=>t.stop()); await context.close().catch(()=>{}); return; }
    const source=context.createMediaStreamSource(stream), processor=context.createScriptProcessor(4096,1,1), gain=context.createGain(), chunks=[];
    gain.gain.value=0;
    processor.onaudioprocess=event=>chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    source.connect(processor); processor.connect(gain); gain.connect(context.destination);
    capture={async stop(){ processor.onaudioprocess=null; source.disconnect(); processor.disconnect(); gain.disconnect(); stream.getTracks().forEach(t=>t.stop()); const rate=context.sampleRate; await context.close().catch(()=>{}); let length=0;for(const chunk of chunks)length+=chunk.length;const all=new Float32Array(length);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}const ratio=rate/16000, pcm=new Int16Array(Math.floor(length/ratio));for(let i=0;i<pcm.length;i++){const s=Math.max(-1,Math.min(1,all[Math.floor(i*ratio)]||0));pcm[i]=s<0?s*32768:s*32767;}return new Uint8Array(pcm.buffer);}};
    voiceMode='recording'; $('record').disabled=false; $('record').setAttribute('aria-pressed','true'); $('record').querySelector('span').textContent='说好了，点这里';
    $('status').textContent='我在听。说完点一下，最多录 25 秒；你可以检查文字后再寄出。';
    recordTimer=setTimeout(()=>finishCapture(),25000);
  } catch { stream?.getTracks().forEach(t=>t.stop()); context?.close().catch(()=>{}); if(generation===captureGeneration){voiceMode='idle'; $('record').disabled=false; $('status').textContent='麦克风没有打开。可以检查浏览器权限再试，也可以用文字继续。';} }
}
async function finishCapture(discard=false) {
  const generation = ++captureGeneration;
  asrController?.abort(); asrController=null;
  clearTimeout(recordTimer);
  const active=capture;capture=null;
  if (!active) { voiceMode='idle'; $('record').disabled=false; $('record').setAttribute('aria-pressed','false'); $('record').querySelector('span').textContent='用声音说'; return; }
  voiceMode='transcribing'; $('record').disabled=true; $('record').setAttribute('aria-pressed','false'); $('record').querySelector('span').textContent='用声音说';
  try {
    const bytes=await active.stop();
    if (discard || generation !== captureGeneration) return;
    if (bytes.length<1600) throw new Error('short');
    $('status').textContent='正在把声音写成文字……';
    let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    const controller=new AbortController(); asrController=controller;
    const timer=setTimeout(()=>controller.abort(),16000);
    let data;
    try {
      const response=await fetch('/api/asr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pcm:btoa(binary)}),signal:controller.signal});
      if (!response.ok) throw new Error('asr');
      data=await response.json();
    } finally { clearTimeout(timer); }
    if (generation !== captureGeneration) return;
    if (!data.transcript?.trim()) throw new Error('empty');
    $('answer').value=data.transcript.trim().slice(0,160);
    $('status').textContent='听到的话已经写好。看看有没有听错，再点“寄出”。'; $('answer').focus();
  } catch { if(!discard && generation===captureGeneration)$('status').textContent='这次没听清，可以再说一次，也可以打字。'; }
  finally { if(generation===captureGeneration){asrController=null;voiceMode='idle'; $('record').disabled=false;} }
}

function renderBook() {
  $('book-content').replaceChildren();
  if (!state.entries.length) { const p=document.createElement('p');p.className='book-empty';p.textContent='寄出第一句话，你的旅程就会从这里长出来。';$('book-content').append(p); }
  chapters.forEach(chapter=>{
    const entries=state.entries.filter(e=>e.chapter===chapter.id);
    if(!entries.length)return;
    const section=document.createElement('section');section.className='book-chapter';
    const h=document.createElement('h3');h.textContent=`${chapter.id}. ${chapter.title}`;section.append(h);
    const color=state.colors.find(c=>c.id===chapter.id);
    const p=document.createElement('p');p.textContent=color?`和${chapter.momo}一起留下：${color.name}`:`正在和${chapter.momo}慢慢发现`;section.append(p);
    const key=entries.find(e=>e.kind==='create');if(key){const line=document.createElement('p');line.textContent=`你的钥匙：“${key.answer}”`;section.append(line);}
    const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');summary.textContent=`你留下的 ${entries.length} 句话`;details.append(summary,list);
    entries.forEach(entry=>{const li=document.createElement('li');li.textContent=entry.answer;list.append(li);});section.append(details);$('book-content').append(section);
  });
  $('download-book').disabled=!state.entries.length;
}
function cancelRound() { ++roundGeneration;requestController?.abort();requestController=null;setBusy(false); }
function openBook() { cancelRound();stopSpeech(); void finishCapture(true); renderBook(); $('restart-confirm').hidden=true; if(!$('book-dialog').open)$('book-dialog').showModal(); }
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function downloadBook() {
  const content=chapters.map(ch=>{const entries=state.entries.filter(e=>e.chapter===ch.id);if(!entries.length)return '';return `<section><h2>${ch.id}. ${escapeHtml(ch.title)}</h2><p>${escapeHtml(ch.world)} · ${escapeHtml(ch.momo)}${state.colors.some(c=>c.id===ch.id)?` · 留下${escapeHtml(ch.colorName)}`:' · 旅程进行中'}</p>${entries.map(e=>`<article><h3>${escapeHtml(ch.scenes.find(s=>s.id===e.id)?.prompt||'')}</h3><blockquote>${escapeHtml(e.answer)}</blockquote><p>${escapeHtml(e.reaction)}</p></article>`).join('')}</section>`;}).join('');
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>我的哇呜旅程</title><style>body{max-width:760px;margin:60px auto;padding:0 24px;background:#fffefa;color:#263a4b;font-family:system-ui,sans-serif;line-height:1.9}h1{font-size:38px}h2{margin-top:60px}h3{font-size:16px}blockquote{margin:12px 0;padding:10px 20px;border-left:3px solid #d4ac3c;background:#faf5e5;white-space:pre-wrap;overflow-wrap:anywhere}article{break-inside:avoid;border-bottom:1px solid #ddd;padding:15px 0}p{overflow-wrap:anywhere}small{color:#5b6b73}@media print{body{margin:0}section{break-before:page}}</style><h1>我的哇呜旅程</h1><p>哇呜！第一束好奇光</p><p>这一切，从你的一句话开始：</p><blockquote>${escapeHtml(state.firstWords)}</blockquote><small>${state.entries.length} 段回应 · ${state.colors.length} 种颜色 · ${state.done?'六章旅程已完成':'旅程还在继续'}<br>这是一份根据本次记录整理的纪念册，可以在浏览器中阅读或打印。不是成长测评。</small>${content}<footer><h2>小灯会留着光，等你回来。</h2><p>谢谢你愿意问，也愿意听。${state.done?'你最初说的那句话，我们一直记着。':''}</p></footer></html>`;
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='我的哇呜旅程.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('download-status').textContent='纪念册已准备好。打开下载的文件，就可以阅读或打印。';
}
$('answer-form').addEventListener('submit',event=>{event.preventDefault();void submitAnswer($('answer').value);});
$('next-scene').addEventListener('click',advance);
$('read-aloud').addEventListener('click',()=>{if(playingAudio||speechController){stopSpeech();readAutomatically=false;}else{readAutomatically=true;void speak(state.pending?.reaction||expand(currentScene().text));}});
$('record').addEventListener('click',()=>{if(voiceMode==='recording')void finishCapture();else if(voiceMode==='idle'){if(!voiceConsent)$('voice-consent').showModal();else void beginCapture();}});
$('voice-consent').addEventListener('close',()=>{if($('voice-consent').returnValue==='allow'){voiceConsent=true;void beginCapture();}});
$('open-book').addEventListener('click',openBook);
$('close-book').addEventListener('click',()=>$('book-dialog').close());
$('download-book').addEventListener('click',downloadBook);
$('restart').addEventListener('click',()=>{$('restart-confirm').hidden=false;});
$('cancel-restart').addEventListener('click',()=>{$('restart-confirm').hidden=true;});
$('confirm-restart').addEventListener('click',()=>{if(busy)return;stopSpeech();state=freshState();readAutomatically=false;save();$('book-dialog').close();render();});
$('rest').addEventListener('click',()=>{stopSpeech();void finishCapture(true);$('rest-dialog').showModal();});
$('resume').addEventListener('click',()=>$('rest-dialog').close());
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSpeech();void finishCapture(true);}});
window.addEventListener('pagehide',event=>{stopSpeech();void finishCapture(true);cancelRound();if(!event.persisted)stage.destroy();});
render();
