import { journeys } from './landing-journeys.js?v=20260918-pop';
const world = document.getElementById('landing-world');
const dialog = document.getElementById('landing-dialog');
const content = document.getElementById('landing-dialog-content');
const gate = document.getElementById('mode-gate');
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

function show(html){returnFocus=document.activeElement;content.innerHTML=html;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;gate.style.overflow='hidden';}
function close(){dialog.close();}
dialog.querySelector('.dialog-close').addEventListener('click',close);
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
dialog.addEventListener('close',()=>{stopJourneyAudio();gate.style.overflow='';returnFocus?.focus({preventScroll:true});if(location.search.includes('journey=')||location.search.includes('preview=')){const u=new URL(location.href);u.searchParams.delete('journey');u.searchParams.delete('preview');history.replaceState(null,'',u);}});
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const journeyAudio=new Audio();journeyAudio.preload='none';
let audioButton=null,audioToken=0;
function resetAudioButton(button){if(!button)return;button.dataset.playing='false';button.setAttribute('aria-pressed','false');button.querySelector('.voice-symbol').textContent='▶';button.querySelector('.voice-hint').textContent='听听这句话';}
function stopJourneyAudio(){audioToken++;journeyAudio.pause();journeyAudio.currentTime=0;resetAudioButton(audioButton);audioButton=null;}
journeyAudio.addEventListener('ended',()=>stopJourneyAudio());
journeyAudio.addEventListener('loadedmetadata',()=>{if(audioButton&&Number.isFinite(journeyAudio.duration))audioButton.querySelector('.voice-duration').textContent=`${Math.ceil(journeyAudio.duration)}″`;});
dialog.addEventListener('click',async event=>{
  const button=event.target.closest('[data-journey-audio]');if(!button)return;
  const status=content.querySelector('.journey-audio-status');status.textContent='';
  if(audioButton===button&&!journeyAudio.paused){audioToken++;journeyAudio.pause();resetAudioButton(button);return;}
  const token=++audioToken;
  if(audioButton!==button){journeyAudio.pause();resetAudioButton(audioButton);audioButton=button;journeyAudio.src=button.dataset.journeyAudio;}
  button.querySelector('.voice-hint').textContent='正在准备声音…';
  try{await journeyAudio.play();if(token!==audioToken)return;button.dataset.playing='true';button.setAttribute('aria-pressed','true');button.querySelector('.voice-symbol').textContent='Ⅱ';button.querySelector('.voice-hint').textContent='正在播放 · 点此暂停';}
  catch{if(token!==audioToken)return;resetAudioButton(button);status.textContent='声音暂时没连上，可以再点一次。回答也写在气泡里。';}
});
function openJourney(id){
  const j=journeys[id];if(!j)return;stopJourneyAudio();
  show(`<div class="journey-detail-heading"><span class="child-avatar avatar-${j.avatar}" aria-hidden="true"></span><div><span class="preview-label">示例旅程 · AI 模拟童声</span><h2 id="preview-title">${j.title}</h2></div></div><img class="dialog-art journey-detail-cover" src="./assets/landing/${j.image}.webp" alt="${escapeHTML(j.creation)}"><p class="journey-audio-status" role="status" aria-live="polite"></p><div class="journey-conversations">${j.steps.map((step,i)=>`<article class="journey-moment"><div class="journey-question"><span>${escapeHTML(step.speaker)}问</span><p>“${escapeHTML(step.question)}”</p></div><div class="journey-reply"><span class="reply-name">${j.child}说</span><button class="journey-voice" type="button" data-journey-audio="./assets/landing/audio/${id}-${i+1}.mp3" aria-pressed="false" aria-label="播放${j.child}的模拟回答：${escapeHTML(step.answer)}"><span class="voice-symbol" aria-hidden="true">▶</span><span class="voice-content"><span class="voice-words">${escapeHTML(step.answer)}</span><span class="voice-meta"><span class="voice-hint">听听这句话</span><span class="voice-duration"></span><span class="voice-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></span></span></button></div><figure class="journey-effect"><img src="./assets/landing/journey-${id}-${i+1}.webp" width="1200" height="900" alt="${escapeHTML(step.effect)}" loading="lazy"><figcaption><span>于是，世界有了新变化</span><p>${escapeHTML(step.effect)}</p></figcaption></figure></article>`).join('')}</div><p class="journey-result">这一趟冒险留下了<strong>${j.creation}</strong></p><p class="dialog-footnote">昵称、对话和效果均为模拟示例；声音由 AI 合成，配图为效果示意，不是真实儿童录音或游戏实录。探索留存与授权分享正在规划中。</p><a class="landing-primary" href="./dev/?story=wow">开始自己的第一章 ↗</a>`);
}

document.querySelectorAll('[data-journey]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openJourney(a.dataset.journey);}));
const query=new URLSearchParams(location.search);
if(query.has('journey'))openJourney(query.get('journey'));
else if(query.get('preview')==='debate')location.replace('./dev/debate');
window.addEventListener('pagehide',event=>{stopJourneyAudio();if(!event.persisted)scene?.dispose();});

document.addEventListener('visibilitychange',()=>{if(document.hidden)stopJourneyAudio();});
