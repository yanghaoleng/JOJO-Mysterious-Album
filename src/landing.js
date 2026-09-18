import { createJourneyCarousel } from './landing-carousel.js?v=20260918-journal-compact';
import { journeys, journeyChapters } from './landing-journeys.js?v=20260918-journal-compact';
import { mountJourneyIcons } from '../vendor/landing-icons.js?v=20260918-journal-compact';
const world = document.getElementById('landing-world');
const dialog = document.getElementById('landing-dialog');
const content = document.getElementById('landing-dialog-content');
const gate = document.getElementById('mode-gate');
mountJourneyIcons(gate);
let scene, returnFocus;
const heroObserver=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting))return;
  heroObserver.disconnect();
  import('./landing-scene.js?v=20260918-click').then(async({createLandingScene})=>{
    if(document.getElementById('mode-title')?.dataset.entrance!=='complete'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>{const done=()=>{clearTimeout(timer);window.removeEventListener('mengmeng:hero-title-ready',done);resolve();};const timer=setTimeout(done,2600);window.addEventListener('mengmeng:hero-title-ready',done,{once:true});});
    scene=createLandingScene(world);world.dataset.ready='true';
    scene.renderer.domElement.addEventListener('webglcontextlost',()=>world.removeAttribute('data-ready'));
  }).catch(()=>world.removeAttribute('data-ready'));
},{root:gate});heroObserver.observe(world);
// Touch devices reveal the summary on the first tap; the second tap follows the link.
const cards=[...document.querySelectorAll('.chapter-card')];
cards.forEach(card=>card.addEventListener('click',event=>{
  if(!matchMedia('(hover: none)').matches||card.classList.contains('is-expanded'))return;
  event.preventDefault();cards.forEach(c=>c.classList.remove('is-expanded'));card.classList.add('is-expanded');
}));

let dialogMotion=null,closing=false;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(html){
  inventionPinned=false;clearTimeout(inventionTimer);returnFocus=document.activeElement;dialogMotion?.cancel();closing=false;dialog.classList.remove('is-closing');
  content.innerHTML=html;mountJourneyIcons(content);if(!dialog.open)dialog.showModal();dialog.scrollTop=0;gate.style.overflow='hidden';
  if(!reducedMotion())dialogMotion=dialog.animate([{opacity:0,transform:'translateY(30px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
}
function close(){
  if(!dialog.open||closing)return;closing=true;stopJourneyAudio();dialogMotion?.cancel();
  if(reducedMotion()){dialog.close();return;}
  dialog.classList.add('is-closing');
  dialogMotion=dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(22px) scale(.98)'}],{duration:220,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
  dialogMotion.finished.then(()=>{if(closing)dialog.close();}).catch(()=>{});
}
dialog.querySelector('.dialog-close').addEventListener('click',close);
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
dialog.addEventListener('click',e=>{
  if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}
  const stop=e.target.closest('[data-journal-stop]');
  if(stop)document.getElementById(stop.dataset.journalStop)?.scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});
});
dialog.addEventListener('close',()=>{
  stopJourneyAudio();dialogMotion?.cancel();dialogMotion=null;closing=false;dialog.classList.remove('is-closing');gate.style.overflow='';returnFocus?.focus({preventScroll:true});
  if(location.search.includes('journey=')||location.search.includes('preview=')){const u=new URL(location.href);u.searchParams.delete('journey');u.searchParams.delete('preview');history.replaceState(null,'',u);}
});
let inventionPinned=false,inventionTimer;
function setInventionOpen(open){
  clearTimeout(inventionTimer);
  const panel=content.querySelector('.invention-popover'),button=content.querySelector('.invention-count');
  if(panel)panel.hidden=!open;if(button)button.setAttribute('aria-expanded',String(open));
  if(!open)inventionPinned=false;
}
dialog.addEventListener('pointerover',event=>{if(event.pointerType==='mouse'&&event.target.closest('.invention-count,.invention-popover'))setInventionOpen(true);});
dialog.addEventListener('pointerout',event=>{
  if(event.pointerType==='mouse'&&event.target.closest('.invention-metric')&&!event.relatedTarget?.closest?.('.invention-metric')&&!inventionPinned&&!content.querySelector('.invention-metric')?.contains(document.activeElement))inventionTimer=setTimeout(()=>setInventionOpen(false),160);
});
dialog.addEventListener('focusin',event=>{if(event.target.closest('.invention-count'))setInventionOpen(true);});
dialog.addEventListener('focusout',event=>{if(event.target.closest('.invention-metric')&&!event.relatedTarget?.closest?.('.invention-metric')&&!inventionPinned)setInventionOpen(false);});
dialog.addEventListener('click',event=>{if(event.target.closest('.invention-count')){inventionPinned=!inventionPinned;setInventionOpen(inventionPinned);}});
dialog.addEventListener('pointerdown',event=>{if(!event.target.closest('.invention-metric'))setInventionOpen(false);});
dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&content.querySelector('.invention-count')?.getAttribute('aria-expanded')==='true'){event.preventDefault();event.stopPropagation();setInventionOpen(false);}});
dialog.addEventListener('close',()=>setInventionOpen(false));
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const journeyAudio=new Audio();journeyAudio.preload='none';
let audioButton=null,audioToken=0;
function resetAudioButton(button){if(!button)return;button.dataset.playing='false';button.setAttribute('aria-pressed','false');button.querySelector('.voice-symbol').textContent='▶';button.removeAttribute('aria-busy');}
function stopJourneyAudio(){audioToken++;journeyAudio.pause();journeyAudio.currentTime=0;resetAudioButton(audioButton);audioButton=null;}
journeyAudio.addEventListener('ended',()=>stopJourneyAudio());
journeyAudio.addEventListener('loadedmetadata',()=>{if(audioButton&&Number.isFinite(journeyAudio.duration))audioButton.querySelector('.voice-duration').textContent=`${Math.ceil(journeyAudio.duration)}″`;});
dialog.addEventListener('click',async event=>{
  const share=event.target.closest('[data-share-journey]');
  if(share){const url=location.href;try{await navigator.clipboard.writeText(url);}catch{const input=document.createElement('input');input.value=url;document.body.append(input);input.select();document.execCommand('copy');input.remove();}share.textContent='已复制';setTimeout(()=>{if(share.isConnected)share.textContent='复制分享链接';},1800);return;}
  const button=event.target.closest('[data-journey-audio]');if(!button)return;
  const status=content.querySelector('.journey-audio-status');status.textContent='';
  if(audioButton===button&&!journeyAudio.paused){audioToken++;journeyAudio.pause();resetAudioButton(button);return;}
  const token=++audioToken;
  if(audioButton!==button){journeyAudio.pause();resetAudioButton(audioButton);audioButton=button;journeyAudio.src=button.dataset.journeyAudio;}
  button.setAttribute('aria-busy','true');
  try{await journeyAudio.play();if(token!==audioToken)return;button.dataset.playing='true';button.setAttribute('aria-pressed','true');button.querySelector('.voice-symbol').textContent='Ⅱ';button.removeAttribute('aria-busy');}
  catch{if(token!==audioToken)return;resetAudioButton(button);status.textContent='声音暂时没连上，可以再点一次。回答也写在气泡里。';}
});
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
function openJourney(id){
  const j=journeys[id];if(!j)return;stopJourneyAudio();
  dialog.style.setProperty('--journal-backdrop-image',`url("${new URL(`../assets/landing/journal-map-${j.backdrop||id}.webp`,import.meta.url).href}")`);
  const ideaCount=j.steps.reduce((sum,step)=>sum+step.ideas.length,0);
  const avatar=(extra='')=>`<span class="child-avatar avatar-${j.avatar} ${extra}" role="img" aria-label="${j.child}的冒险头像"></span>`;
  const entry=(step,i)=>`<article class="journey-moment journal-entry">
    <span class="journal-pin">${icon(step.icon)}</span>
    <div class="journal-entry-heading" aria-hidden="true"></div>
    <div class="journal-entry-body"><div class="journal-dialogue">
      <div class="journey-question"><p><span class="question-speaker">${icon('message-circle')} ${escapeHTML(step.speaker)}问：</span>“${escapeHTML(step.question)}”</p></div>
      <div class="journey-reply">${avatar('reply-avatar')}<div class="reply-body"><span class="reply-name"><strong>${j.child}</strong> 的回答 <small>AI 模拟童声</small></span>
        <button class="journey-voice" type="button" data-journey-audio="./assets/landing/audio/${id}-${i+1}.mp3" aria-pressed="false" aria-label="播放${j.child}的模拟回答：${escapeHTML(step.answer)}"><span class="voice-symbol" aria-hidden="true">▶</span><span class="voice-content"><span class="voice-words">${escapeHTML(step.answer)}</span><span class="voice-meta"><span class="voice-duration"></span><span class="voice-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></span></span></button>
      </div></div>
    </div><div class="journey-effect"><p><span class="effect-label">${icon('sparkles')} 世界的变化：</span>${escapeHTML(step.effect)}</p></div></div>
  </article>`;
  const visited=journeyChapters.filter((_,ci)=>j.steps.some(step=>step.chapter===ci)).length;
  show(`<div class="journey-journal journal-${j.theme}">
    <header class="journal-header"><div class="journal-title-row">${avatar()}<h2 id="preview-title">${j.child}的冒险日志</h2></div>
      <dl class="journal-stats"><div><dt>${icon('clock-3')}探索时光</dt><dd>${j.duration}<span>分钟</span></dd></div><div><dt>${icon('message-circle')}自己的回答</dt><dd>${j.steps.length}<span>个</span></dd></div><div><dt>${icon('lightbulb')}冒出的新点子</dt><dd>${ideaCount}<span>个</span></dd></div><div class="invention-metric"><dt>${icon('flag')}留下的发明</dt><dd><button class="invention-count" type="button" aria-expanded="false" aria-controls="invention-popover" aria-label="查看${j.child}留下的${j.steps.length}件发明">${j.steps.length}<span>件</span></button></dd><div class="invention-popover" id="invention-popover" role="region" aria-label="${j.child}的发明口袋" hidden><h3>${j.child}的发明口袋</h3>${j.steps.map(step=>`<div class="journal-invention">${icon(step.icon)}<span>${escapeHTML(step.invention)}</span></div>`).join('')}</div></div></dl>
    </header>

    <section class="journal-route" aria-labelledby="route-title"><div class="journal-section-title"><h3 id="route-title">我的探索路线</h3><span>留下了 ${visited} 个章节的足迹</span></div><nav class="journal-stops" aria-label="跳到旅程章节">${journeyChapters.map((chapter,ci)=>{const seen=j.steps.some(step=>step.chapter===ci);return `<button type="button" class="journal-stop ${seen?'is-visited':'is-unvisited'}" data-journal-stop="journal-${id}-chapter-${ci}"><span class="stop-symbol">${icon(chapter.icon)}</span><strong>${chapter.number} · ${chapter.title}</strong><small>${j.stops[ci]} · ${seen?j.steps.filter(step=>step.chapter===ci).length+' 次回答':'待探索'}</small></button>`;}).join('')}</nav></section>
    <p class="journey-audio-status" role="status" aria-live="polite"></p>
    <div class="journey-conversations journal-timeline">${journeyChapters.map((chapter,ci)=>{const steps=j.steps.map((step,i)=>({step,i})).filter(({step})=>step.chapter===ci);return `<section class="journal-chapter ${steps.length?'':'chapter-unvisited'}" id="journal-${id}-chapter-${ci}"><div class="journal-chapter-heading"><span>${icon(chapter.icon)}</span><div><h3>${chapter.number} · ${chapter.title}</h3></div></div>${steps.length?steps.map(({step,i})=>entry(step,i)).join(''):`<p class="journal-unvisited">这一站还没有出发。下一次，${j.child}可以把新的想法带到这里。</p>`}</section>`;}).join('')}</div>
    <footer class="journal-end"><span class="journal-finish">${icon('flag')}</span><p>这一次，${j.child}留下了</p><h3>${escapeHTML(j.creation)}</h3><p>一个想法接着一个想法，走出了自己的路线。</p><div class="journal-end-actions"><button class="landing-primary" type="button" data-share-journey>复制分享链接</button><a class="landing-primary" href="./">开启我的冒险 ${icon('arrow-up-right')}</a></div></footer>
    <p class="dialog-footnote">这是一份模拟的冒险日志，昵称、统计和对话均为示例；声音由 AI 合成，配图为 3D 效果示意，不是真实儿童录音或游戏实录。探索留存与授权分享正在规划中。</p>
  </div>`);
}

const carousel=createJourneyCarousel(document.getElementById('journeys'),dialog);
gate.addEventListener('click',event=>{const card=event.target.closest('[data-journey]');if(card){event.preventDefault();openJourney(card.dataset.journey);}});
const query=new URLSearchParams(location.search);
if(query.has('journey'))openJourney(query.get('journey'));
else if(query.get('preview')==='debate')location.replace('./dev/debate');
window.addEventListener('pagehide',event=>{stopJourneyAudio();if(!event.persisted){scene?.dispose();carousel.dispose();}});

document.addEventListener('visibilitychange',()=>{if(document.hidden)stopJourneyAudio();});
