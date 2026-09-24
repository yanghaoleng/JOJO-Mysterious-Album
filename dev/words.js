import { ArrowRight, ArrowUpRight, ArrowLeft, Check, LoaderCircle, Music2, VolumeX, createElement } from 'lucide';
import * as THREE from '../vendor/three.module.js';
import { playUISFX, stopUISFX } from '../src/ui-sfx.js';
import { DioramaStage } from './stage.js';
import { createGameSession } from './runtime/game-session.js';
import { StoryVoice, requestJSON } from './voice.js';
import { RealtimeWordVoice } from './word-realtime-voice.js';
let voiceMode='realtime',voicePreference=null;try{voicePreference=new URLSearchParams(location.search).get('voice')||localStorage.getItem('jma.word-voice-mode');voiceMode=voicePreference||'realtime';}catch{}
import { createVoiceInput } from '../src/voice-input-control.js';
import { WORD_CHAPTERS, WORD_PRAISES, WORD_VOCABULARY, getAgeBand, getChapterLessons, getRecommendedWordChapter, createWordSuggestions } from './content/word-games.js';
import { acceptsEnglishUtterance, englishWordContent, createWordLanguageGate, createWordProgress, evaluateWordUtterance } from './word-progress.js';
import { wordSceneEntities, scatterWordSpawns, unknownWordCommands, playerWordProposal } from './word-scene.js';
import { createWordNarration } from './word-narration.js';
import { planWordIntent, validateWordProposal, findWordObjects, WORD_CHARACTER_NAMES } from './word-intent.js';
import { mountWordText } from './presentation/word-text.jsx';
import { welcomeAnswer } from './word-welcome.js';
import { createWordAmbience } from './word-ambience.js';
import { createWordReward } from './word-reward.js';
import { drawWordShareCard } from './word-share-card.js';
import { createWordMusic } from './word-music.js';
import { ASSETS } from './content/assets.js';

const icon=(node,name)=>createElement(node,{width:18,height:18,'stroke-width':2,'aria-hidden':'true',class:`word-arrow-icon lucide lucide-${name}`}).outerHTML;
const arrowRight=icon(ArrowRight,'arrow-right'),arrowUpRight=icon(ArrowUpRight,'arrow-up-right'),arrowLeft=icon(ArrowLeft,'arrow-left'),checkIcon=icon(Check,'check');
const $=id=>document.getElementById(id), STORE='jma.word-play.v1';
const music=createWordMusic($('word-music'),{onIcon:muted=>{$('word-music').innerHTML=icon(muted?VolumeX:Music2,muted?'volume-x':'music-2');}});
const chapters=Object.fromEntries(WORD_CHAPTERS.map(c=>[c.id,c]));
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved;try{saved=JSON.parse(localStorage.getItem(STORE)||'null');}catch{}
let age=getAgeBand(saved?.age)?saved.age:5, view='age',chapter=null,lessonIndex=0,progress=null,game=null,stage=null,voice=null,voiceInput=null,request=null,turn=0,busy=false,canAdvance=false,focusId=null,creative=false;
const journeys=saved?.journeys&&typeof saved.journeys==='object'?saved.journeys:{};
let continuousListening=false,failedReadAttempts=0,rewardedThisLesson=false,praising=false,lastPraise='';
let introStep='name',introName='',introVersion=0;
let heardWords=new Set(),lastAnswer='',sharedScene=null,storageWarning=false,webglFailed=false;
function persist(){try{localStorage.setItem(STORE,JSON.stringify({version:1,age,journeys}));}catch{storageWarning=true;}}
function journeyKey(){return `${getAgeBand(age)?.id}:${chapter?.id}`;}
function saveJourney(){if(!chapter||!game)return;journeys[journeyKey()]={lessonIndex,progress,world:game.runtime.snapshot,words:[...heardWords],completed:view==='complete',lastAnswer};persist();}
function title(main,subtitle=''){ $('world-title').textContent=main;$('world-subtitle').textContent=subtitle; }
function setView(next){if(next!=='play')ambience?.pause();clearPanel();view=next;document.querySelector('.word-layout').dataset.view=next;$('change-age').hidden=next==='age'||next==='complete'||next==='intro';$('change-age').textContent=`${age} 岁 · 换年龄`;$('clear-world').hidden=next!=='play';}
let lessonHint='',statusHint='',hintTimer=null,hintIndex=0;
let textMounts=[], tipTimer=null, speechTimer=null, transitioning=false, voiceState='off';
let openingPending=false,openingActive=false,openingEpoch=0,countdownUntil=0;
const languageGate=createWordLanguageGate();
function cancelOpening(){openingEpoch++;openingPending=false;openingActive=false;document.querySelector('.word-layout').classList.remove('lesson-focus','lesson-focus-reading');}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const primeRewardSound=()=>void playUISFX('select',{volume:0}).catch(()=>{});
document.addEventListener('pointerdown',primeRewardSound,{once:true,passive:true});document.addEventListener('keydown',primeRewardSound,{once:true});
const reward=createWordReward({getTranscript:()=>$('word-transcript'),checkIcon,reduced:()=>reducedMotion.matches,playSound:()=>playUISFX('reward',{volume:.55}).catch(()=>{})});
function clearPanel(){clearInterval(hintTimer);hintTimer=null;lessonHint='';statusHint='';hintIndex=0;sentenceSuggestions=null;countdownUntil=0;cancelOpening();languageGate.reset();reward.clear();menuAnimation?.cancel();menuAnimation=null;menuOpen=false;inputEpoch++;inputQueue=Promise.resolve();pendingWords=0;document.querySelectorAll('.flying-word').forEach(n=>n.remove());document.querySelector('.word-layout').classList.remove('word-menu-open');clearInterval(tipTimer);clearTimeout(speechTimer);textMounts.forEach(m=>m.dispose());textMounts=[];voiceInput?.dispose?.();voiceInput=null;}
function textMotion(id,value,variant='text',options={}){const mount=mountWordText($(id),value,variant,options);textMounts.push(mount);return mount;}
async function transitionScene(change){
  if(transitioning)return;
  transitioning=true;voice?.pause();voice?.skip();clearTimeout(speechTimer);
  const root=document.querySelector('.word-layout');root.classList.add('iris-closed');root.setAttribute('aria-busy','true');
  const wait=()=>new Promise(resolve=>setTimeout(resolve,reducedMotion.matches?0:470));
  try{await wait();change();await new Promise(requestAnimationFrame);root.classList.remove('iris-closed');await wait();}
  finally{root.classList.remove('iris-closed');root.removeAttribute('aria-busy');transitioning=false;}
  if(view==='play')void speak(currentExample());
}
function cancelTurn(keepListening=false){cancelOpening();languageGate.reset();turn++;request?.abort();request=null;busy=false;clearTimeout(speechTimer);if(keepListening)voice?.listen(false);else{continuousListening=false;voice?.pause();}voice?.skip();}
function resumeListening(){if(continuousListening&&['play','intro'].includes(view)&&!document.hidden&&!transitioning){voice?.listen(true);if(!voice?.enabled)void voice?.enable();}}
function recommendation(){return getRecommendedWordChapter(age);}
const speakerIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';

function leave(){introVersion++;saveJourney();cancelTurn();stopUISFX();}
function feedback(text){$('world-feedback').textContent=text;}
function renderVoiceHint(){const messages=[...new Set([statusHint,view==='play'?lessonHint:''].filter(Boolean))];if($('mic-heading'))$('mic-heading').textContent=messages[hintIndex%Math.max(1,messages.length)]||'';}
function voiceHint(text){if(statusHint!==text){statusHint=text;hintIndex=0;}renderVoiceHint();}
function transcriptPending(pending){const node=$('transcript-loading');if(node)node.hidden=!pending;}
function syncVoiceInput(state=voiceState){
  const active=continuousListening&&voice?.enabled;
  voiceInput?.setState(active?'listening':state,{disabled:state==='requesting',...(active?{label:'正在收音，点一下暂停'}:{})});
}
const transcriptLoader=`<span id="transcript-loading" class="transcript-loading" role="status" aria-label="正在识别你的话" hidden>${icon(LoaderCircle,'loader-circle')}</span>`;
let ambience=null;
function newWorld(world='meadow',snapshot){
  ambience?.dispose();ambience=null;game?.dispose();game=null;
  try{
    stage ||=new DioramaStage($('word-stage'));
    stage.setScene(world,[],{studio:true,decorations:{seed:17,steps:6}});stage.setCameraDriftEnabled(false);stage.clearFollowTarget();stage.stopOrbit();stage.shotMode=null;stage.cameraAnim=null;
    stage.characterFocus={width:4.6,height:4.5,meanHeight:2.6};stage.target.set(0,.8,0);
    stage.yaw=.12;stage.pitch=.42;stage.zoom=1;stage.resize();
    game=createGameSession({story:{id:'word-play',version:1},stage,saved:snapshot,onChange:()=>{if(view==='play')saveJourney();}});
    game.bind({id:`words-${chapter?.id||'welcome'}`,world},[]);
    ambience=createWordAmbience({entities,send:commands=>apply(commands,{ambient:true,scatter:false}),reduced:()=>reducedMotion.matches,
      canAct:()=>!openingActive&&!openingPending&&view==='play'&&!document.hidden&&!busy&&!pendingWords&&!transitioning&&!['speaking','thinking','transcribing'].includes(voiceState),
      occupied:()=>{const p=stage.worldPresenter;return [...p.stats.filter(e=>!e.settled||e.occupied).map(e=>e.id),...p.behaviorStats.jobs.flatMap(e=>[e.id,e.target]),...p.feedingStats.jobs.flatMap(e=>[e.id,e.target]),...p.movementStats.jobs.map(e=>e.id)];},
      camera:()=>{}});
    stage.worldPresenter.onPickEntity=id=>{focusId=id;const e=entities()[id];if(e)feedback('Try big, blue, or jump!');};
    $('webgl-error').hidden=true;webglFailed=false;
  }catch(error){webglFailed=true;$('webgl-error').hidden=false;console.error('Word world:',error);}
}
function playerEntities(){return wordSceneEntities(entities());}
function surprisePoop(){const result=apply(unknownWordCommands());if(result.ok){voiceHint('没听清这个想法，变出了一只便便，再试一个词吧');saveJourney();}return result;}
function entities(){return game?.runtime.snapshot.worlds[game.runtime.context.world]?.entities||{};}
function apply(commands,{scatter=true,ambient=false}={}){
  if(!game||!commands.length)return {ok:false};
  if(!ambient)ambience?.before(commands);
  const result=game.gateway.apply({version:1,context:game.runtime.token,commands:scatter?scatterWordSpawns(commands,entities(),Math.random,availableLanding):commands},'player');
  if(result.ok&&view==='play')focusWordEvent(commands);
  if(result.ok&&view==='play'&&!ambient)ambience?.observe(commands);
  return result;
}
const landingRay=new THREE.Raycaster(),landingUp=new THREE.Vector3(),landingPoint=new THREE.Vector3(),landingDirection=new THREE.Vector3();
function availableLanding(position,scale){
  if(!stage?.world)return true;
  stage.world.group.updateWorldMatrix(true,true);
  const center=stage.world.planet.center,radius=stage.world.planet.radius;
  for(const [dx,dz] of [[0,0],[-.35,0],[.35,0],[0,-.35],[0,.35]]){
    landingUp.copy(stage.world.surfaceNormal(position[0]+dx*scale,position[1]+dz*scale));
    landingPoint.copy(center).addScaledVector(landingUp,radius+.08);
    landingRay.set(landingPoint.clone().addScaledVector(landingUp,5),landingUp.clone().negate());landingRay.far=4.86;
    if(landingRay.intersectObject(stage.world.group,true).some(h=>h.object.visible&&h.object.material?.opacity!==0))return false;
  }
  landingUp.copy(stage.world.surfaceNormal(...position));landingPoint.copy(center).addScaledVector(landingUp,radius+scale*.7);
  stage.camera.getWorldDirection(landingDirection);
  landingRay.set(landingPoint.clone().addScaledVector(landingDirection,-20),landingDirection);landingRay.far=19.8;
  return !landingRay.intersectObject(stage.world.group,true).some(h=>h.object.visible&&h.object.material?.opacity!==0);
}
function focusWordEvent(commands){
  const world=entities();
  const spawned=commands.filter(c=>c.type==='entity.spawn'&&world[c.id]);
  const actions=commands.filter(c=>['entity.event','entity.effect','entity.cue','entity.attach','entity.animate','entity.color','entity.scale','group.stack','group.patrol','feeding.start'].includes(c.type));
  const id=spawned.at(-1)?.id||actions.flatMap(c=>[c.id,...(c.targets||[]),...(c.eaters||[])]).filter(id=>world[id]).at(-1);
  if(!id||!stage.worldPresenter.getObject(id))return;
  stage.stopOrbit();stage.shotMode=null;
  const box=new THREE.Box3(),center=new THREE.Vector3(),localCenter=new THREE.Vector3();let measured=false;
  const provider=()=>{
    const object=stage.worldPresenter?.getObject(id),record=entities()[id];if(!object||!record)return null;
    // Aim at the landing spot while the object enters, then follow its live 3D centre.
    if(!stage.worldPresenter.stats.find(e=>e.id===id)?.settled){
      let base=record;const seen=new Set();while(base.attachment&&entities()[base.attachment.target]&&!seen.has(base.id)){seen.add(base.id);base=entities()[base.attachment.target];}
      stage.world.surfacePoint(...base.position,.55,center);return center.toArray();
    }
    object.updateWorldMatrix(true,true);
    if(!measured){box.setFromObject(object);if(box.isEmpty())return null;box.getCenter(localCenter);object.worldToLocal(localCenter);measured=true;}
    return center.copy(localCenter).applyMatrix4(object.matrixWorld).toArray();
  };
  const target=provider();if(!target)return;
  stage.setFollowTarget(provider,id,{worldSpace:true});
  const zoom=1.3;
  if(reducedMotion.matches){stage.cameraAnim=null;stage.target.fromArray(target);stage.panOffset.set(0,0,0);stage.zoom=zoom;stage.resize();}
  else stage.animateCameraTo({yaw:stage.yaw,pitch:.38,zoom,target:new THREE.Vector3(...target),pan:new THREE.Vector3()},.8,{commit:false});
}
function frameWordScene(){
  const spread=Math.max(2.3,...Object.values(entities()).filter(e=>!e.attachment).map(e=>Math.abs(e.position[0])+(e.scale||.7)*1.25));
  const zoom=Math.min(stage.zoom,4.6/(spread*2+.6));
  if(zoom<stage.zoom-.02)stage.animateCameraTo({yaw:stage.yaw,pitch:stage.pitch,zoom,target:stage.target.clone(),pan:stage.panOffset.clone()},reducedMotion.matches?.01:.55);
}
function welcomeWorld(){
  newWorld();
  const assets=['prop:rword-flower','prop:rword-cat','prop:rword-train'];
  apply(assets.filter(a=>ASSETS[a]).map((asset,i)=>({type:'entity.spawn',id:`welcome-${i}`,asset,position:[(i-1)*1.5,.2],scale:.85})));
}
function resetWordRun({keepShared=false}={}){
  introVersion++;introName='';music.randomize();cancelTurn();voice?.stop();voice=null;progress=null;lessonIndex=0;lastAnswer='';focusId=null;canAdvance=false;creative=false;heardWords.clear();saved=null;
  for(const key of Object.keys(journeys))delete journeys[key];
  try{localStorage.removeItem(STORE);for(const key of Object.keys(sessionStorage))if(key.startsWith('jma.word-play'))sessionStorage.removeItem(key);}catch{}
  if(!keepShared){sharedScene=null;if(location.hash.startsWith('#make='))history.replaceState(null,'',location.pathname+location.search);}
  chapter=null;
}
function renderIntro(){
  leave();setView('intro');newWorld();
  apply([{type:'entity.spawn',id:'welcome-domi',asset:'npc:domi',position:[0,1],scale:.58}],{scatter:false});
  introStep='name';introName='';
  $('word-panel').innerHTML=`<div class="intro-heading"><p class="intro-kicker">和 DOMI 认识一下</p><h1 id="intro-question" lang="en">Hi! I'm Domi.</h1><p id="intro-help">告诉我你的名字和年龄，一起去造个小世界。</p></div><div class="onboarding intro-controls">${transcriptLoader}<p id="word-transcript" hidden></p><p id="mic-heading" class="voice-hint" role="status" aria-live="polite">点一下，和 Domi 聊聊</p><div class="voice-controls"><button id="word-mic" aria-label="和 Domi 聊聊"></button></div><button id="skip-intro" class="quiet-button">跳过</button></div>`;
  voice?.stop();voice=null;ensureVoice();voiceInput=createVoiceInput({button:$('word-mic'),waveDots:6});
  $('skip-intro').onclick=()=>void transitionScene(renderAge);
  $('word-mic').onclick=async()=>{
    if(introStep==='ready')return;
    if(continuousListening){continuousListening=false;voice.pause();$('mic-heading').textContent='已暂停，点一下继续';return;}
    continuousListening=true;const active=voice,version=++introVersion;
    active.listen(false);await active.unlock().catch(()=>{});await active.enable();
    if(view!=='intro'||version!==introVersion||voice!==active)return;
    if(!active.enabled){continuousListening=false;return;}
    await askIntro(introStep==='name'?"Hi! I'm Domi. What is your name?":'How old are you?');
  };
}
async function askIntro(question){
  if(view!=='intro'||introStep==='ready')return;
  const version=introVersion,active=voice;
  $('intro-question').textContent=question;
  active.listen(false);await active.say(question,'sprout');
  if(view==='intro'&&version===introVersion&&voice===active)resumeListening();
}
async function introAnswer(raw){
  if(view!=='intro'||introStep==='ready'||!continuousListening)return;
  const answer=welcomeAnswer(raw,introStep);
  if(!answer.english)return;
  $('word-transcript').hidden=false;$('word-transcript').textContent=`“${String(raw).slice(0,160)}”`;
  if(answer.name)introName=answer.name;
  if(answer.age)age=answer.age;
  if(!introName){await askIntro('What is your name? You can use a nickname.');return;}
  if(!answer.age){
    introStep='age';$('intro-question').textContent=`Hi, ${introName}! How old are you?`;$('intro-help').textContent='用英语告诉 Domi，你今年几岁。';
    await askIntro(answer.outOfRange?'Please choose an age from three to ten.':`Hi, ${introName}! How old are you?`);
    return;
  }
  introStep='ready';continuousListening=false;
  const active=voice,version=introVersion,c=sharedScene?chapters[sharedScene.chapter]:recommendation();
  active.pause();active.skip();
  const confirmation=`You're ${age}! Let's go somewhere fun together!`;
  $('intro-question').textContent=confirmation;$('intro-help').textContent='Domi 正带你去一个好玩的地方。';
  await active.say(confirmation,'sprout');
  if(view!=='intro'||introVersion!==version||voice!==active)return;
  // Keep the user-unlocked audio context across the child-to-teacher voice handoff.
  // A fresh context can remain suspended indefinitely without another touch.
  const audioContext=active.context,workletReady=active.workletReady;
  active.context=null;active.workletReady=null;
  resetWordRun({keepShared:Boolean(sharedScene)});persist();ensureVoice({gameMode:true});
  if(audioContext?.state!=='closed'){voice.context=audioContext;voice.workletReady=workletReady;}
  await transitionScene(()=>{openChapter(c.id,{fresh:true,shared:sharedScene});continuousListening=true;voice.listen(false);});
}
function renderAge(){
  const initial=view==='age';leave();if(!initial)resetWordRun({keepShared:view==='intro'&&Boolean(sharedScene)});chapter=null;setView('age');welcomeWorld();feedback('');
  $('word-panel').innerHTML=`<h1 class="welcome-title">开口，造个小世界。<small>A LITTLE WORLD, MADE BY YOU</small></h1><div class="onboarding"><h2 class="age-question">你今年几岁啦？</h2><div class="age-stepper" role="group" aria-label="选择年龄"><button class="step-button" id="age-minus" aria-label="年龄减一"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><div class="age-value"><span id="age-number" class="age-number" role="spinbutton" aria-label="年龄" aria-valuemin="3" aria-valuemax="10" tabindex="0"></span><span class="age-unit">岁</span></div><button class="step-button" id="age-plus" aria-label="年龄加一"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button></div><button id="choose-age" class="primary-button">继续 ${arrowRight}</button></div>`;
  const number=textMotion('age-number',age,'slots');
  const update=delta=>{
    const before=age;age=Math.max(3,Math.min(10,age+delta));number.update(age);
    $('age-number').setAttribute('aria-valuenow',age);$('age-minus').disabled=age===3;$('age-plus').disabled=age===10;
    if(age===before)return;
    void playUISFX(delta>0?'forward':'back',{volume:.65,playbackRate:delta>0?1.18:.88,retrigger:'restart'}).catch(()=>{});
    const button=$(delta>0?'age-plus':'age-minus');button.getAnimations().forEach(a=>a.cancel());
    if(!reducedMotion.matches)button.animate([
      {transform:'scale(1)',backgroundColor:'rgba(255,255,255,.13)'},
      {transform:'scale(1.3)',backgroundColor:'rgba(255,255,255,.40)',offset:.32},
      {transform:'scale(.96)',backgroundColor:'rgba(255,255,255,.20)',offset:.75},
      {transform:'scale(1)',backgroundColor:'rgba(255,255,255,.13)'}
    ],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
  };update(0);
  $('age-minus').onclick=()=>update(-1);$('age-plus').onclick=()=>update(1);
  $('age-number').onkeydown=e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();update(e.key==='Home'?3-age:e.key==='End'?10-age:['ArrowUp','ArrowRight'].includes(e.key)?1:-1);}};
  $('choose-age').onclick=()=>{resetWordRun({keepShared:Boolean(sharedScene)});persist();void transitionScene(renderChapters);};
}
function renderChapters(){
  leave();chapter=null;setView('chapters');feedback('');
  const c=sharedScene?chapters[sharedScene.chapter]:recommendation();
  newWorld(c.world);
  const preview={monster:'robot-toy',color:'rword-train',sports:'rword-frog',toys:'rword-robot',garden:'rword-flower',rhyme:'rword-cat'}[c.id];
  apply([{type:'entity.spawn',id:'chapter-preview',asset:`prop:${preview}`,position:[0,0],scale:1.25}]);
  $('word-panel').innerHTML=`<div class="onboarding"><article class="recommend-card" data-chapter="${c.id}"><div class="eyebrow">${sharedScene?'朋友的小世界':'为你准备的小冒险'}</div><h2>${escape(c.title)}</h2><p>${escape(c.subtitle)}</p><button class="primary-button" id="continue-chapter">继续 ${arrowRight}</button></article></div>`;
  $('continue-chapter').onclick=()=>{ensureVoice();void voice.unlock().catch(()=>{});void transitionScene(()=>openChapter(c.id,sharedScene?{fresh:true,shared:sharedScene}:{}));};
}
function openChapter(id,{fresh=false,shared=null}={}){
  leave();chapter=chapters[id];if(!chapter){renderChapters();return;}
  const record=fresh?null:journeys[journeyKey()];
  lessonIndex=Number.isInteger(record?.lessonIndex)?Math.max(0,Math.min(5,record.lessonIndex)):0;
  if(record?.completed)lessonIndex=0;
  progress=record?.completed?null:record?.progress;heardWords=new Set(record?.words||[]);lastAnswer='';focusId=null;
  setView('play');title(chapter.title);
  const snapshot=shared?.world||(record&&!record.completed?record.world:null);
  const migrated=snapshot?JSON.parse(JSON.stringify(snapshot)):null;
  if(chapter.id==='monster'&&migrated)for(const world of Object.values(migrated.worlds||{}))for(const e of Object.values(world.entities||{}))if(/^wg-(body|head|hand|foot)-/.test(e.id)&&/^prop:rword-(body|head|hand|foot)$/.test(e.asset))e.asset=e.asset.replace('rword-','robot-');
  newWorld(chapter.world,migrated);
  if(chapter.id==='monster'&&!Object.values(entities()).some(e=>e.asset==='prop:robot-body'))apply([{type:'entity.spawn',id:'wg-body-0',asset:'prop:robot-body',position:[0,0],scale:.9}]);
  if(shared?.commands?.length&&game)game.gateway.apply({version:1,context:game.runtime.token,commands:validateWordProposal(shared,{})},'player');
  frameWordScene();renderLesson();saveJourney();sharedScene=null;

}
function currentLesson(){return getChapterLessons(chapter.id,age)[lessonIndex];}
let sentenceMotion=null,sentenceSuggestions=null;
function currentExample(){return sentenceSuggestions?.readingText||currentLesson().example;}
function updateSentence(result,text=''){
  if(!sentenceSuggestions)return;
  if(text)sentenceSuggestions.accept(text,{nouns:findWordObjects(text).flatMap(h=>h.alias.toLowerCase().split(/\s+/))});
  sentenceMotion.update(sentenceSuggestions.text);
  progress.sentence=sentenceSuggestions.snapshot;
}
function renderLesson(){
  clearPanel();voice?.skip();canAdvance=false;creative=false;busy=false;failedReadAttempts=0;rewardedThisLesson=false;
  openingPending=true;document.querySelector('.word-layout').classList.add('lesson-focus');
  const lesson=currentLesson();if(progress?.lessonId!==lesson.id)progress=createWordProgress(lesson);
  const firstPrompt=chapter.id==='monster'&&lessonIndex===0&&getAgeBand(age).id==='early'?'跟随朗读，画出一个大大的头。':lesson.mode==='build'?'跟随朗读，说完整的一句，让想法变出来。':lesson.mode==='cloze'?'补上空白，试着说出完整的一句。':'你可以说出别的名词或形容词。';
  $('word-panel').innerHTML=`<div class="lesson-heading"><div class="lesson-progress-row"><div class="lesson-pagination" id="lesson-pagination"><button id="previous-lesson" class="previous-lesson" aria-label="上一关" ${lessonIndex===0?'hidden':''}>${arrowLeft}</button><button type="button" class="lesson-progress" id="reveal-previous" aria-label="第 ${lessonIndex+1} 句，共六句">${Array.from({length:6},(_,i)=>`<span class="${i<lessonIndex?'done':i===lessonIndex?'current':''}"></span>`).join('')}</button></div></div><div class="sentence-row"><h2 class="sentence" id="lesson-sentence" lang="en"></h2><button class="listen-button" id="listen-example" aria-label="再听一次例句">${speakerIcon}</button></div></div><div class="play-bottom"><div class="answer-result"><button class="next-button" id="next-lesson" hidden><span>${lessonIndex===5?'完成':'继续'}<span class="continue-countdown" id="continue-countdown" aria-hidden="true" hidden></span></span>${arrowRight}</button>${transcriptLoader}<div id="word-transcript" hidden></div></div><p id="mic-heading" class="voice-hint" role="status" aria-live="polite">轮到你啦，试着说出来</p><div class="voice-controls"><button id="word-mic" aria-label="打开麦克风"></button><button class="options-button" id="word-options-toggle" aria-label="打开单词菜单" aria-expanded="false" aria-controls="word-menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="3" height="3" rx=".8"/><rect x="10.5" y="3" width="3" height="3" rx=".8"/><rect x="18" y="3" width="3" height="3" rx=".8"/><rect x="3" y="10.5" width="3" height="3" rx=".8"/><rect x="10.5" y="10.5" width="3" height="3" rx=".8"/><rect x="18" y="10.5" width="3" height="3" rx=".8"/><rect x="3" y="18" width="3" height="3" rx=".8"/><rect x="10.5" y="18" width="3" height="3" rx=".8"/><rect x="18" y="18" width="3" height="3" rx=".8"/></svg></button><div class="word-menu" id="word-menu" role="dialog" aria-label="点一个单词，让世界变化" hidden><p>也可以点一个词</p><div class="word-options" id="word-options"></div><button id="voice-mode" class="voice-mode"></button></div></div></div>`;
  const suggestions=sentenceSuggestions=createWordSuggestions(lesson,progress.sentence);
  const changeWord=index=>{if(voiceState==='speaking'||voiceState==='thinking'||busy||transitioning)return;sentenceMotion.update(suggestions.change(index));};
  sentenceMotion=textMotion('lesson-sentence',suggestions.text,'text',{getParts:()=>suggestions.parts,canReplace:suggestions.canChange,onReplace:index=>{changeWord(index);scheduleSuggestion();}});
  function scheduleSuggestion(){clearInterval(tipTimer);tipTimer=setInterval(()=>{if(view==='play'&&!document.hidden&&$('word-menu')?.hidden)changeWord();},12000);}

  updateSentence();initVoice();renderWordOptions();lessonHint=firstPrompt;voiceHint(firstPrompt);hintTimer=setInterval(()=>{if(!document.hidden){hintIndex++;renderVoiceHint();}},4200);
  $('next-lesson').onclick=()=>void nextLesson();
  $('previous-lesson').onclick=()=>void previousLesson();
  $('reveal-previous').onclick=()=>$('lesson-pagination').classList.toggle('show-previous',lessonIndex>0);
  $('listen-example').onclick=()=>{failedReadAttempts=0;continuousListening=true;cancelTurn(true);void speak(currentExample());};
  $('word-options-toggle').onclick=()=>toggleMenu();
  $('voice-mode').textContent=voice?.realtimeFailed?'已回退经典 · 保存此选择':voiceMode==='realtime'?'实时对话 · 切回经典语音':'经典语音 · 试试实时对话';
  $('voice-mode').onclick=()=>{const mode=voiceMode==='realtime'?'legacy':'realtime';try{localStorage.setItem('jma.word-voice-mode',mode);}catch{}saveJourney();voice?.pause();const url=new URL(location.href);url.searchParams.set('voice',mode);location.href=url.href;};
  let menuWords=[];
  $('word-options').onclick=event=>{
    const b=event.target.closest('[data-word]');if(!b)return;
    void playUISFX('select',{volume:.55}).catch(()=>{});
    if(!reducedMotion.matches)b.animate([{transform:'scale(1)'},{transform:'scale(1.18)',backgroundColor:'rgba(255,255,255,.42)',offset:.4},{transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'});
    voice?.skip();
    const word=b.dataset.word,epoch=inputEpoch;
    const exampleWords=lesson.example.toLowerCase().match(/[a-z]+/g)||[];
    menuWords=exampleWords.includes(word)?[...menuWords,word]:[word];
    const text=lesson.mode==='build'?word:menuWords.join(' '),displayText=menuWords.join(' ');
    const flight=flyWord(b,word);pendingWords++;
    inputQueue=inputQueue.then(async()=>{
      await flight;
      while(busy&&epoch===inputEpoch)await new Promise(resolve=>setTimeout(resolve,30));
      if(epoch!==inputEpoch)return;
      try{await submit(text,{displayText,fromMenu:true});}finally{if(epoch===inputEpoch)pendingWords--;}
    }).catch(error=>console.error(error));
  };
  if(progress.heard.length){const r=evaluateWordUtterance(lesson,progress.lastText||'',progress);canAdvance=progress.unlocked||r.targetComplete||(lesson.mode==='open'&&Object.keys(playerEntities()).length>0);showContinue(canAdvance);}
  scheduleSuggestion();
}
function renderWordOptions(){
  const lesson=currentLesson();
  const base=lesson.mode==='build'?lesson.buildWords:lesson.example.toLowerCase().match(/[a-z]+/g)||[];
  const ideas=['sunny','rainy','snowy','big','little','blue','happy','sleepy','head','robot','flower','poop','grow','jump',...Object.values(WORD_CHARACTER_NAMES)];
  $('word-options').innerHTML=[...new Set([...base,...ideas])].map(w=>{const meaning=lesson.words.find(x=>x.word===w)?.meaning||WORD_VOCABULARY[w]?.meaning;return `<button class="word-option" data-word="${escape(w)}"><span lang="en">${escape(w)}</span>${meaning?`<small>${escape(meaning)}</small>`:''}</button>`;}).join('');
}
let menuOpen=false,menuAnimation=null,inputEpoch=0,inputQueue=Promise.resolve(),pendingWords=0;
function showContinue(show){
  const button=$('next-lesson');if(!button)return;
  const entering=show&&button.hidden;button.hidden=!show;if(entering)countdownUntil=0;
  if(entering&&!reducedMotion.matches)button.animate([{opacity:0,transform:'translateY(-10px) scale(.75)'},{opacity:1,transform:'translateY(2px) scale(1.08)',offset:.7},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'});
}
function tickAutoContinue(){
  const badge=$('continue-countdown'),button=$('next-lesson');
  const eligible=view==='play'&&button&&!button.hidden&&continuousListening&&voice?.enabled&&voice.recording&&!document.hidden&&!busy&&!pendingWords&&!transitioning&&!openingActive&&!openingPending&&!menuOpen&&!['speaking','transcribing','thinking','requesting'].includes(voiceState);
  if(!eligible){countdownUntil=0;if(badge)badge.hidden=true;return;}
  const now=performance.now();if(!countdownUntil)countdownUntil=now+3000;
  const left=Math.max(0,Math.ceil((countdownUntil-now)/1000));
  if(badge){badge.hidden=false;badge.textContent=` ${left}`;}
  if(left===0){countdownUntil=0;void nextLesson();}
}
async function flyWord(button,word){
  const target=$('word-transcript');target.hidden=false;
  if(!target.textContent)target.textContent='…';
  if(reducedMotion.matches)return;
  const from=button.querySelector('[lang=en]').getBoundingClientRect(),to=target.getBoundingClientRect();
  const label=document.createElement('span');label.className='flying-word';label.textContent=word;label.setAttribute('aria-hidden','true');
  Object.assign(label.style,{left:`${from.x}px`,top:`${from.y}px`});document.body.append(label);
  const dx=to.x+to.width/2-from.x-from.width/2,dy=to.y+to.height/2-from.y-from.height/2;
  try{await label.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.55}px,${dy*.55-35}px) scale(1.3)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(1.05)`,opacity:0}],{duration:460,easing:'cubic-bezier(.22,.7,.3,1)'}).finished;}catch{}finally{label.remove();}
}
async function toggleMenu(open=!menuOpen){
  const menu=$('word-menu'),toggle=$('word-options-toggle');if(!menu||!toggle)return;
  menuOpen=open;document.querySelector('.word-layout').classList.toggle('word-menu-open',open);menuAnimation?.cancel();toggle.setAttribute('aria-expanded',String(open));
  if(open){menu.hidden=false;menu.inert=false;}else{menu.inert=true;toggle.focus();}
  void playUISFX(open?'open':'close',{volume:.35}).catch(()=>{});
  if(!reducedMotion.matches){
    const frames=[{opacity:0,transform:'translateY(16px) scale(.88)'},{opacity:1,transform:'translateY(0) scale(1)'}];
    const animation=menu.animate(open?frames:[...frames].reverse(),{duration:open?240:180,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});menuAnimation=animation;
    try{await animation.finished;}catch{return;}
    if(menuAnimation!==animation)return;menuAnimation=null;animation.cancel();
  }
  if(!open)menu.hidden=true;else menu.querySelector('button')?.focus();
}
function ensureVoice({gameMode=false}={}){
  if(voice)return;
  const onboarding=view==='intro'&&!gameMode;
  voice=new ((onboarding&&voicePreference!=='legacy')||voiceMode==='realtime'?RealtimeWordVoice:StoryVoice)({getMode:()=>onboarding?'onboarding':'game',getLesson:()=>view==='play'?currentExample():'',language:'en-US',readingSpeed:onboarding?1:.8,speechProfile:onboarding?'wow-child':'',preferredVoice:onboarding?'':'female',continuousMeter:true,
    onState:state=>{music.setVoiceState(continuousListening&&state==='off'?'listening':state);voiceState=state;syncVoiceInput(state);transcriptPending(state==='transcribing'||state==='thinking');voiceHint(({requesting:'正在打开麦克风',listening:'我会一直听，你可以接着说',speaking:praising?'说得真棒！听听给你的鼓励':'先听一听，再跟着说',transcribing:'正在听懂你的话',thinking:'正在听懂你的话',off:continuousListening?'我会一直听，你可以接着说':'轮到你啦，试着说出来',paused:'已暂停，点一下继续'})[state]||'我在听');},
    onAnswer:(raw,details)=>{transcriptPending(false);const {text,remind}=languageGate.accept(raw,details);if(!text){if(remind){voiceHint('准备好时，试着用英语说给我听吧');if(view==='intro')return askIntro('Please speak in English.');if(view==='play')return speak('Please speak in English.');}return;}return view==='intro'?introAnswer(text):submit(text,{fromRealtime:Boolean(voice?.realtimeActive)});},onLevel:level=>{voiceInput?.setLevel(level);if(level>.05)countdownUntil=performance.now()+3000;},
    onError:(message,details={})=>{transcriptPending(false);if(details.code==='empty'&&view==='play'&&!busy&&!transitioning){surprisePoop();return;}voiceHint(({
      NotAllowedError:'请在浏览器和系统设置中允许使用麦克风',
      NotFoundError:'没有找到麦克风，请连接后再试',
      NotReadableError:'麦克风正被占用，关闭其他录音后再试',
      capture_unavailable:'这个浏览器暂不支持收音，可以换 Chrome 或 Safari',
      asr_not_configured:'语音识别暂未就绪，请稍后再试',
      request_timeout:'这次识别有点慢，请再说一次',
      asr_upstream_error:'语音服务暂时没连上，请再试一次',
      empty:'刚才没有听清，靠近一点再说一次',
      tts_unavailable:'朗读暂时没连上，点喇叭可以重试',
    })[details.code]||(/[\u3400-\u9fff]/.test(message)?message:'语音暂时没连上，请再试一次'));},
    onCapture:packet=>{if(packet.state==='reply'&&view==='intro'&&introStep!=='ready'&&acceptsEnglishUtterance(packet.text))$('intro-question').textContent=packet.text;if(packet.state==='partial'){transcriptPending(false);const english=englishWordContent(packet.text);if(english&&$('word-transcript')){reward.clear();$('word-transcript').hidden=false;$('word-transcript').textContent=`“${english}”`;}}if(packet.state==='reconnecting')voiceHint('正在重新连接语音，你可以继续说');if(packet.state==='fallback'){voiceHint('实时语音暂时没连上，已切换备用语音');if($('voice-mode'))$('voice-mode').textContent='已回退经典 · 保存此选择';}if(['quiet','short','empty','error'].includes(packet.state)){transcriptPending(false);voiceHint('刚才没有听清，靠近一点再说一次');}if(packet.state==='paused')transcriptPending(false);}

  });
}
function initVoice(){
  ensureVoice();voiceInput=createVoiceInput({button:$('word-mic'),waveDots:6});
  $('word-mic').onclick=async()=>{if(continuousListening){continuousListening=false;voice.pause();voiceInput.setState('paused');$('mic-heading').textContent='已暂停，点一下继续';}else{continuousListening=true;const activeVoice=voice;activeVoice.skip();activeVoice.listen(true);await activeVoice.enable();if(voice===activeVoice&&!activeVoice.enabled)continuousListening=false;}};
}
async function sayGuidance(text){
  const mount=sentenceMotion,example=currentExample(),session=game,active=voice;
  const focused=openingPending&&text===example,epoch=openingEpoch;
  const current=()=>view==='play'&&game===session&&sentenceMotion===mount&&voice===active&&openingEpoch===epoch;
  const ensureDemo=()=>{if(chapter.id==='monster'&&!Object.values(wordSceneEntities(entities(),'demo')).some(e=>e.asset==='prop:robot-body'))apply([{type:'entity.spawn',id:'demo-body-0',asset:'prop:robot-body',position:[0,0],scale:.9}]);};
  active.listen(false);
  if(focused){
    try{stage.renderer.render(stage.scene,stage.camera);document.querySelector('.scene-focus').style.setProperty('--scene-focus-image',`url("${stage.renderer.domElement.toDataURL('image/jpeg',.8)}")`);}catch{document.querySelector('.scene-focus').style.removeProperty('--scene-focus-image');}
    openingPending=false;openingActive=true;document.querySelector('.word-layout').classList.add('lesson-focus-reading');await new Promise(resolve=>setTimeout(resolve,reducedMotion.matches?80:180));if(!current())return;}
  else if(example.toLowerCase().includes(text.toLowerCase()))ensureDemo();
  const narrate=createWordNarration(text,{getContext:()=>({entities:entities(),chapter:chapter.id,focusId}),apply});
  const offset=example.toLowerCase().indexOf(text.toLowerCase());let ended=false;
  await active.say(text,'gentle',()=>{},'',offset>=0?packet=>{
    if(current()){mount.read(example,{...packet,start:packet.start<0?-1:packet.start+offset,end:packet.end<0?-1:packet.end+offset});if(focused)ended=packet.status==='ended'||ended;else narrate(packet);}
  }:undefined);
  if(!current())return;
  if(focused){
    document.querySelector('.word-layout').classList.remove('lesson-focus','lesson-focus-reading');
    await new Promise(resolve=>setTimeout(resolve,reducedMotion.matches?100:280));
    if(!current())return;
    openingActive=false;
    if(ended){ensureDemo();narrate({status:'ended'});}
  }
  resumeListening();
}
async function sayPraise(){
  if(!voice||document.hidden||view!=='play')return;
  const choices=WORD_PRAISES.filter(text=>text!==lastPraise),text=choices[Math.floor(Math.random()*choices.length)];
  const active=voice,session=game,mount=sentenceMotion;
  lastPraise=text;praising=true;active.listen(false);
  try{await active.say(text,'gentle');}
  finally{praising=false;if(view==='play'&&game===session&&sentenceMotion===mount&&voice===active)resumeListening();}
}
async function speak(text){if(!voice||busy||document.hidden||view!=='play')return;await voice.unlock().catch(()=>{});if(view==='play')await sayGuidance(text);}
async function submit(raw,{displayText,fromMenu=false,fromRealtime=false}={}){
  const text=englishWordContent(raw);if(!text||busy||view!=='play'||openingActive)return;
  const session=game,version=++turn,lesson=currentLesson();busy=true;if(!fromRealtime)voice?.listen(false);
  if(!fromRealtime)voice?.skip();reward.clear();$('word-transcript').hidden=false;$('word-transcript').textContent=`“${displayText||text}”`;voiceHint('正在把你的想法变出来');
  try{
    const result=evaluateWordUtterance(lesson,text,progress);
    let plan=planWordIntent(text,{entities:playerEntities(),chapter:chapter.id,focusId,feedback:true});
    // The first sentence is a construction: an earlier colour/number remains meaningful when its noun arrives.
    if(lesson.mode==='build'&&result.currentMatched.length&&result.matched.length>result.currentMatched.length){
      const cumulative=planWordIntent(result.progress.heard.join(' '),{entities:playerEntities(),chapter:chapter.id,focusId,feedback:true});
      if(cumulative.commands.length)plan=cumulative;
    }
    let applied=plan.commands.length?apply(plan.commands):{ok:false};
    let extraReply='';
    const filler=new Set('uh um er erm hmm a an the my your his her its this that these those is are am be has have make makes give put let please it them with and then on in at near beside over together to of i you we they do want can big little tiny small giant blue green red purple pink white black brown orange yellow rainbow high fast slowly slow grow grows growing dance dances dancing spin spins spinning fly flies flying run runs stop stops swim swims jump jumps walk walks sleep sleepy funny happy sad angry two three four five six seven eight nine ten one'.split(' '));
    for(const word of ["it's","that's","there's"])filler.add(word);
    const unresolved=result.unknownWords.filter(word=>!filler.has(word)&&!plan.matched.includes(word)&&!plan.matched.includes(word.replace(/s$/,'')));
    if((!plan.commands.length&&!result.currentMatched.length&&(text.toLowerCase().match(/[a-z]+/g)||[]).some(w=>!filler.has(w)))||unresolved.length){
      request=new AbortController();
      try{
        const response=await requestJSON('/api/scene-control',{text,context:{world:chapter.world,entities:playerEntities(),worlds:[chapter.world]}},18000,request.signal);
        if(turn!==version||game!==session||view!=='play')return;
        const isFallback=response.source==='random-poop'||response.commands?.some(c=>c.asset==='prop:procedural');
        const proposed=isFallback?unknownWordCommands():playerWordProposal(validateWordProposal(response,playerEntities()));
        const extra=proposed.length?apply(proposed):{ok:false};
        if(!extra.ok){surprisePoop();extraReply='没听清这个想法，变出了一只便便，再试一个词吧';}
        applied={ok:applied.ok||(!isFallback&&extra.ok)};
        if(extra.ok&&isFallback)extraReply='没听清这个想法，变出了一只便便，再试一个词吧';
        else if(extra.ok&&(response.substitution||proposed.some(c=>c.asset==='prop:procedural')))extraReply='变出来啦，再试试颜色或动作吧';
        else if(extra.ok)extraReply='你的新想法变出来啦';

      }catch(error){if(error.name==='AbortError'||turn!==version)return;surprisePoop();extraReply='没听清这个想法，变出了一只便便，再试一个词吧';}
    }
    if(turn!==version||game!==session||view!=='play')return;
    if(plan.commands.length&&!applied.ok)throw new Error(applied.error||'场景还没准备好');
    progress=result.progress;lastAnswer=text;
    for(const word of result.knownWords)heardWords.add(word);
    for(const word of plan.matched)heardWords.add(word);
    focusId=plan.focusId||focusId;
    const made=applied.ok;
    canAdvance=canAdvance||progress?.unlocked||result.targetComplete||(lesson.mode==='open'&&made)||(made&&result.creative&&result.progress.heard.length>=2&&plan.matched.length>0);
    progress.unlocked=canAdvance;
    creative=made&&!result.targetComplete;
    if(creative)lessonHint='你可以换一个名词或形容词，让世界继续变化';
    updateSentence(result,text);
    showContinue((canAdvance||(creative&&lesson.mode!=='build'))&&!webglFailed);
    voiceHint(extraReply||(made&&creative?'你的想法变出来啦，继续试试吧':result.targetComplete?'说得真棒，你做到了！':result.nextWord?'再试着说出完整的一句吧':'再试一个词吧'));
    feedback(made?'Your world is changing!':result.currentMatched.length?`I heard ${result.currentMatched.join(', ')}.`:'Try another word.');
    const matched=(result.targetComplete&&result.currentMatched.length>0)||(made&&result.creative);
    if(matched){reward.show({celebrate:!rewardedThisLesson});rewardedThisLesson=true;}
    if(made&&result.targetComplete)apply([{type:'fx.play',effect:'sparkle'}]);
    saveJourney();
    if(matched&&!fromMenu)await sayPraise();
    if(turn!==version||game!==session||view!=='play')return;
    if(result.targetComplete||canAdvance)failedReadAttempts=0;
    else if(!fromMenu&&continuousListening&&++failedReadAttempts>=2){failedReadAttempts=0;await sayGuidance(currentExample());}
  }catch(error){if(turn===version)voiceHint('这次没有成功，再试一次吧');console.error(error);}
  finally{if(turn===version){busy=false;request=null;if(!fromRealtime)resumeListening();}}
}
async function nextLesson(){
  if(transitioning||(!canAdvance&&(!creative||currentLesson().mode==='build')))return;
  cancelTurn(continuousListening&&lessonIndex<5);
  if(lessonIndex===5){await transitionScene(renderComplete);return;}
  // Keep the child's assembled world visible between sentences; the iris marks a new chapter/scene.
  lessonIndex++;progress=null;lastAnswer='';renderLesson();saveJourney();feedback('');
  void speak(currentExample());
}
async function previousLesson(){
  if(busy||pendingWords||transitioning||lessonIndex===0)return;
  cancelTurn(continuousListening);lessonIndex--;progress=null;lastAnswer='';renderLesson();saveJourney();feedback('');
  void speak(currentExample());
}
function shareURL(){
  const world={version:1,worlds:{[chapter.world]:game.runtime.snapshot.worlds[chapter.world]}};
  const bytes=new TextEncoder().encode(JSON.stringify({v:2,chapter:chapter.id,age,world}));
  const payload=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return `${location.origin}/dev/words.html#make=${payload}`;
}
function captureCard(){
  if(stage)stage.renderer.render(stage.scene,stage.camera);
  return drawWordShareCard({source:stage?.renderer.domElement,words:[...heardWords],examples:getChapterLessons(chapter.id,age).map(lesson=>lesson.example)});
}
async function renderComplete(){
  setView('complete');title('你的话，成了一个世界。');feedback('');saveJourney();
  const completedGame=game;await document.fonts.load('700 68px MohrRounded').catch(()=>{});if(view!=='complete'||game!==completedGame)return;
  const card=captureCard(),image=card.toDataURL('image/png');
  $('word-panel').innerHTML=`<div class="onboarding complete-panel"><div class="complete-stamp" role="img" aria-label="已完成">${checkIcon}</div><p class="step-kicker">六次表达，一次奇妙冒险</p><h2 class="panel-title">把你的点子，交给朋友。</h2><img class="share-preview" src="${image}" alt="${escape(chapter.title)}的实际3D作品卡"><p class="small-note save-image-hint">长按图片可以保存</p><div class="lesson-actions"><button class="primary-button" id="share-world">分享 ${arrowUpRight}</button><button class="secondary-button" id="choose-age-again">重新选择年龄</button></div><p id="share-status" class="small-note" role="status"></p><input id="share-link" class="share-link" readonly aria-label="作品分享链接" hidden></div>`;
  $('share-world').onclick=async()=>{const url=shareURL();try{if(navigator.share){await navigator.share({title:`来改造我的${chapter.title}`,text:'我用英语造了一个小世界，轮到你啦。',url});$('share-status').textContent='已打开分享入口。';}else{await navigator.clipboard.writeText(url);$('share-status').textContent='作品链接已复制，可以粘贴到微信群。';}}catch(e){if(e.name==='AbortError')return;$('share-link').hidden=false;$('share-link').value=url;$('share-link').select();$('share-status').textContent='长按或选中上面的链接复制，发给朋友即可。';}};
  $('choose-age-again').onclick=()=>void transitionScene(renderAge);
}
// Block browser page zoom without taking scrolling, rapid button taps or image saving away.
for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,e=>e.preventDefault(),{passive:false});
let lastTouchTap=null,touchStartedAt=0;
document.addEventListener('touchstart',()=>{touchStartedAt=performance.now();},{passive:true});
document.addEventListener('touchend',e=>{
  const touch=e.changedTouches[0],at=performance.now();
  if(!touch||e.touches.length||at-touchStartedAt>400||e.target.closest('button,a,input,textarea,select,[role=button],canvas')){lastTouchTap=null;return;}
  if(lastTouchTap&&at-lastTouchTap.at<320&&Math.hypot(touch.clientX-lastTouchTap.x,touch.clientY-lastTouchTap.y)<25)e.preventDefault();
  lastTouchTap={at,x:touch.clientX,y:touch.clientY};
},{passive:false});
$('change-age').onclick=()=>void transitionScene(renderAge);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('word-menu')&&!$('word-menu').hidden)toggleMenu(false);
  if(view!=='play'||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable=true],[role=button]'))return;
  if(e.key==='Enter'){e.preventDefault();if(!$('next-lesson').hidden)void nextLesson();else if(!continuousListening)void $('word-mic').onclick();}
  if(e.code==='Space'){e.preventDefault();cancelOpening();continuousListening=false;voice?.pause();voice?.skip();voiceInput?.setState('paused');voiceHint('已暂停，按回车继续');}
});
document.addEventListener('click',e=>{if($('word-menu')&&!$('word-menu').hidden&&!e.target.closest('.voice-controls'))toggleMenu(false);});
$('clear-world').onclick=()=>void transitionScene(()=>{cancelTurn();progress=null;newWorld(chapter.world);if(chapter.id==='monster')apply([{type:'entity.spawn',id:'wg-body-0',asset:'prop:robot-body',position:[0,0],scale:.9}]);renderLesson();saveJourney();feedback('Ready for a new idea!');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelOpening();ambience?.pause();continuousListening=false;saveJourney();voice?.pause();voice?.skip();}});
window.addEventListener('pagehide',()=>{clearInterval(ambienceTimer);clearInterval(autoContinueTimer);ambience?.dispose();music.dispose();stopUISFX();saveJourney();cancelTurn();clearPanel();voice?.stop();game?.dispose();stage?.dispose();});
// Shared scenes are untrusted data: a bounded payload still passes the same resource and command checks.
try{
  const payload=location.hash.match(/^#make=([A-Za-z0-9_-]{1,100000})$/)?.[1];
  if(payload){const bytes=Uint8Array.from(atob(payload.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));const data=JSON.parse(new TextDecoder().decode(bytes));
    if([1,2].includes(data.v)&&chapters[data.chapter]&&getAgeBand(data.age)&&((data.v===1&&Array.isArray(data.commands)&&data.commands.length<=100)||(data.v===2&&data.world?.version===1))){sharedScene=data;age=data.age;}}
}catch{}
const autoContinueTimer=setInterval(tickAutoContinue,100);
const ambienceTimer=setInterval(()=>ambience?.tick(),1000);
$('word-stage').addEventListener('pointerdown',()=>{ambience?.manual();stage?.clearFollowTarget();if(stage)stage.cameraAnim=null;});
renderIntro();
window.__WORD_GAME__={get status(){return {camera:stage?{yaw:stage.yaw,pitch:stage.pitch,zoom:stage.zoom,target:stage.target.toArray(),following:stage.followTarget?.name||null}:null,behaviors:stage?.worldPresenter?.behaviorStats,ambience:ambience?.status,music:music.status,opening:openingActive||openingPending,voiceState,voiceTransport:voice?.realtimeActive?'realtime':'legacy',introStep,listening:continuousListening,recording:Boolean(voice?.recording),pendingWords,view,age,chapter:chapter?.id,lessonIndex,progress,canAdvance,creative,entities:entities(),busy,webglFailed,presentation:stage?.worldPresenter?.stats||[],words:[...heardWords]};}};
