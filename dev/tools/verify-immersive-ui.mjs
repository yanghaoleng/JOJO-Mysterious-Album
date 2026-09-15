/**
 * Real-browser acceptance for the character-first immersive /dev edition.
 * Run: node dev/tools/verify-immersive-ui.mjs
 * Supports DEV_QA_BASE / DEV_QA_SESSION / DEV_QA_BROWSER.
 * Optional DEV_QA_VIEWPORTS=390x844,360x800 / DEV_QA_WORLDS=meadow
 * select resumable batches. DEV_QA_BATCH names a separate result; use
 * DEV_QA_SKIP_FINAL_CHECKS=1 only when another batch covers the final checks.
 *
 * Synthetic legacy records live only in a fresh isolated browser session.
 * Default media requests are denied. VOICE_GUARDS_ONLY instead supplies a
 * zero-valued WebAudio stream and one-second silent-WAV TTS timing fixture;
 * that mode verifies input guards, not recognition or synthesis quality.
 * Product methods/progress are never mocked. Scenes enter
 * through the real Start button; visible speech bubbles can skip narration.
 * Unlike verify-planet-ui, a complete planet is NOT a framing requirement.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STORIES } from '../stories.js';

const browser = process.env.DEV_QA_BROWSER || '/Users/jojo/.npm-global/bin/agent-browser';
const session = process.env.DEV_QA_SESSION || `dev-immersive-qa-${process.pid}`;
const base = process.env.DEV_QA_BASE || 'http://127.0.0.1:8913/dev/';
const environment = ['localhost', '127.0.0.1'].includes(new URL(base).hostname) ? 'local' : 'production';
const interactionOnly = process.env.DEV_QA_INTERACTION_ONLY === '1';
const voiceGuardsOnly = process.env.DEV_QA_VOICE_GUARDS_ONLY === '1';
const batch = process.env.DEV_QA_BATCH || '';
assert(/^[a-z0-9-]*$/.test(batch), 'DEV_QA_BATCH must contain lowercase letters, numbers, or hyphens');
const requestedViewports=process.env.DEV_QA_VIEWPORTS?.split(',').map(value=>{
  assert(/^\d+x\d+$/.test(value),'DEV_QA_VIEWPORTS must use widthxheight');return value.split('x').map(Number);
});
const requestedWorlds=process.env.DEV_QA_WORLDS?.split(',');
const skipFinalChecks=process.env.DEV_QA_SKIP_FINAL_CHECKS==='1';
const artifacts = mkdtempSync(join(tmpdir(), `dev-immersive-${environment}-`));
const resultFile = new URL(`./verify-immersive-ui-${environment}${batch ? `-${batch}` : voiceGuardsOnly ? '-voice-guards' : interactionOnly ? '-interactions' : ''}-results.json`, import.meta.url);
const rows = [], issues = [];
let complete = false, closed = false, failure = null;
let currentTab = null;
const command = (...args) => execFileSync(browser, ['--session', session, ...args], { encoding: 'utf8', timeout: 30000 }).trim();
const evaluate = source => JSON.parse(execFileSync(browser, ['--session', session, 'eval', '--stdin'], { input: source, encoding: 'utf8', timeout: 30000 }).trim());
const status = () => evaluate('window.__DEV_STORY__.status');
function assert(test, message) { if (!test) throw Error(message); }
function record(event, detail) { rows.push({ event, ...detail }); console.log(JSON.stringify({ event, ...detail })); }
function issue(label, message, evidence) { issues.push({ label, message, evidence }); console.error(JSON.stringify({ issue: label, message, evidence })); }
function visible(selector) { return evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)})?.checkVisibility())`); }
function click(selector) {
  assert(visible(selector), `Attempt to click hidden control ${selector}`);
  evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});true`);
  command('click', selector);
}
function keyboard(selector, key = 'Enter') { assert(visible(selector), `Hidden keyboard target ${selector}`);command('focus', selector);command('press', key); }
function ready() {
  // This browser driver hides the page after a native-dialog Escape. A real
  // tab selection restores visibility before waiting for rAF/ResizeObserver.
  // Without it tests can read a previous frame even while DOM layout changed.
  if(!currentTab){const tabs=JSON.parse(command('--json','tab','list')).data.tabs;currentTab=(tabs.find(tab=>tab.active)||tabs[0]).tabId;}
  command('tab',currentTab);
  return evaluate(`(async()=>{
    const began=Date.now();
    while(Date.now()-began<15000){
      const loading=document.querySelector('.stage-loading');
      if(window.__DEV_STORY__?.status?.stage?.safeViewport&&(!loading||Number(getComputedStyle(loading).opacity)===0)){
        await new Promise(r=>setTimeout(r,90));
        await Promise.race([new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),new Promise(r=>setTimeout(r,250))]);
        return window.__DEV_STORY__.status;
      }
      await new Promise(r=>setTimeout(r,70));
    }
    throw Error('Immersive stage did not become ready');
  })()`);
}
function protectMicrophone() {
  evaluate(`(()=>{
    if(window.__immersiveMediaFixture)return true;
    window.__immersiveMediaFixture={calls:0,mode:'always-reject-no-device'};
    if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{window.__immersiveMediaFixture.calls++;throw new DOMException('QA explicitly denies microphone access','NotAllowedError')};
    return true;
  })()`);
}
function open(url) { command('open', url);ready();protectMicrophone(); }
function noMicrophone(label, expectedRequests = 0) {
  const evidence = evaluate(`({voice:window.__DEV_STORY__.status.voice,fixture:window.__immersiveMediaFixture})`);
  assert(evidence.fixture.calls === expectedRequests && !evidence.voice.enabled && !evidence.voice.opening && !evidence.voice.recording, `${label}: unexpected microphone activation`);
  return evidence;
}
function decision() {
  return evaluate(`(async()=>{
    const began=Date.now(),phases=new Set(),lines=[];let last='';
    while(Date.now()-began<20000){
      const state=window.__DEV_STORY__.status;phases.add(state.phase);
      if(['setup','question','complete'].includes(state.phase)&&!state.busy)return{state,phases:[...phases],lines};
      const card=document.querySelector('#speech-card');
      if(card?.checkVisibility()&&card.dataset.speaking==='true'){
        const text=document.querySelector('#speech-text').textContent;if(text!==last){lines.push(text);last=text}card.click();
      }
      await new Promise(r=>setTimeout(r,120));
    }
    throw Error('Question did not arrive '+JSON.stringify(window.__DEV_STORY__.status));
  })()`);
}
function capture(name) { const path=join(artifacts,`${name}.png`);command('screenshot',path);return path; }
function view(label, { expanded = false, short = false } = {}) {
  ready();
  const evidence = evaluate(`(()=>{
    const state=window.__DEV_STORY__.status;
    const box=node=>{const r=node.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const canvas=document.querySelector('#stage canvas'),bounds=box(canvas),panel=box(document.querySelector('#story-panel'));
    const actorHits=state.stage.focus.projectedActors.map(actor=>{
      const chest={x:(actor.head.x+actor.foot.x)/2,y:(actor.head.y+actor.foot.y)/2};
      return{id:actor.id,points:[actor.head,chest,actor.foot].map(point=>{const x=point.x+bounds.left,y=point.y+bounds.top;const hit=document.elementFromPoint(x,y);return{x,y,target:hit?.id||hit?.tagName,canvas:hit===canvas}})};
    });
    const controls=[...document.querySelectorAll('button,input,a')].filter(n=>n.checkVisibility()).map(n=>({id:n.id,label:n.textContent.trim().slice(0,25),...box(n)}));
    return{state,bounds,panel,actorHits,controls,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
      bodyWidth:document.body.scrollWidth,reply:document.body.dataset.reply,active:document.activeElement?.id,
      caption:box(document.querySelector('#scene-caption')),topbar:box(document.querySelector('.topbar')),
      overlay:Boolean(document.querySelector('[data-nextjs-dialog],.vite-error-overlay'))};
  })()`);
  const { state, bounds, panel } = evidence;
  assert(!evidence.overlay && bounds.width > 100, `${label}: page/renderer failed`);
  if (Math.abs(bounds.left) > .5 || Math.abs(bounds.top) > .5 || Math.abs(bounds.width-evidence.width)>1 || Math.abs(bounds.height-evidence.height)>1) issue(label, 'Story canvas is not full viewport', bounds);
  if (evidence.scrollWidth > evidence.width || evidence.bodyWidth > evidence.width) issue(label, 'Horizontal overflow', { document:evidence.scrollWidth,body:evidence.bodyWidth,width:evidence.width });
  const outliers = evidence.controls.filter(item=>item.left<-.5||item.right>evidence.width+.5);
  if (outliers.length) issue(label,'Controls outside horizontal viewport',outliers);
  const safe=state.stage.safeViewport;
  if(safe.bottom+bounds.top>panel.top+.5||safe.top+bounds.top<Math.max(evidence.caption.bottom,evidence.topbar.bottom)-.5)issue(label,'Safe viewport does not account for actual UI', {safe,panel,caption:evidence.caption,topbar:evidence.topbar});
  for(const actor of state.stage.focus.projectedActors){
    const minimum=short?32:expanded?48:72;
    if(!actor.insideSafeViewport||actor.height<minimum)issue(label,'Character too small or outside safe viewport',actor);
    if(actor.bottom+bounds.top>panel.top+.5)issue(label,'Character intersects bottom interaction panel',actor);
  }
  const covered=evidence.actorHits.filter(actor=>actor.points.some(point=>!point.canvas));
  if(covered.length)issue(label,'Character head/chest/foot covered by a real DOM layer',covered);
  const screenshot=capture(label);
  record('view',{label,world:state.stage.world,phase:state.phase,period:state.stage.lighting.period,radius:state.stage.planet.radius,reply:evidence.reply,
    canvas:bounds,panel,safeViewport:safe,actors:state.stage.focus.projectedActors,actorHits:evidence.actorHits,screenshot});
  return evidence;
}
function collapsed() {
  assert(visible('#mic-button')&&visible('#reply-more')&&!visible('#reply-options')&&!visible('#show-choices')&&!visible('#answer-input'),'Default answer UI is not progressively disclosed');
  assert(evaluate(`document.querySelector('#reply-more').getAttribute('aria-expanded')==='false'`),'Collapsed aria state incorrect');
}
function replies(mode) {
  if(!visible('#reply-options'))click('#reply-more');
  if(mode==='text')click('#show-text');else if(!visible('#choices'))click('#show-choices');
  ready();
  assert(visible('#reply-options')&&visible(mode==='text'?'#text-form':'#choices'),'Reply mode failed');
  assert(evaluate(`document.querySelector(${JSON.stringify(mode==='text'?'#show-text':'#show-choices')}).getAttribute('aria-expanded')==='true'`),'Reply tab aria state incorrect');
  if(mode==='text')assert(!visible('#mic-button')&&!visible('#reply-more')&&evaluate(`document.activeElement.id==='answer-input'`),'Text mode did not focus input or hid wrong controls');
}
function escapeTo(selector) {
  command('press','Escape');ready();
  assert(evaluate(`(async()=>{const until=Date.now()+1500;while(Date.now()<until){if(document.activeElement.id===${JSON.stringify(selector)})return true;await new Promise(r=>setTimeout(r,40));}return false})()`),`Escape did not restore ${selector} focus`);
}
function fixture(story, index) {return{sceneIndex:index,setupDone:true,companion:{type:'rabbit',color:'#eee3d5',name:'测试伙伴',manner:'calm'},inventory:[{id:'qa-keepsake',name:'测试纪念',description:'仅独立测试会话'}],inventions:story.id==='moon'?[{scene:'测试旧进度',visual:{kind:'rocket',name:'测试火箭',primary:'#7b9aab',accent:'#e1b671',details:'原样保留',upgrades:['navigation','float']}}]:[],completed:false};}
function install(story,index) {
  const value=JSON.stringify(fixture(story,index));
  evaluate(`localStorage.setItem(${JSON.stringify(`jma.dev.clay.v1.story.${story.id}`)},${JSON.stringify(value)});true`);
  open(`${base}?story=${story.id}`);return value;
}
function stored(id) {return evaluate(`localStorage.getItem(${JSON.stringify(`jma.dev.clay.v1.story.${id}`)})`);}
function menuTests(label) {
  keyboard('#open-story-menu');assert(visible('#story-menu'),'Menu keyboard open failed');
  const before=status().stage.orbit;
  const snapshot=command('snapshot','-i');assert(snapshot.includes('小小背包'),'Menu tools absent from accessibility snapshot');
  keyboard('#bag-button');assert(evaluate(`document.querySelector('#bag-dialog').open`),'Bag did not open');
  assert(!visible('#story-menu'),'Menu remains open behind dialog');
  // Native dialog tab navigation may temporarily give BODY focus when Chrome
  // moves through browser chrome; no background page control may receive it.
  const dialogFocus=[];
  for(let i=0;i<4;i++){
    command('press','Tab');const focus=evaluate(`({id:document.activeElement.id,tag:document.activeElement.tagName,inside:Boolean(document.activeElement.closest('#bag-dialog'))})`);
    dialogFocus.push(focus);assert(focus.inside||focus.tag==='BODY','Dialog focused a background control');
  }
  command('focus','#close-bag');
  escapeTo('open-story-menu');assert(!evaluate(`document.querySelector('#bag-dialog').open`),'Escape did not close bag');
  keyboard('#open-story-menu','Space');assert(visible('#story-menu'),'Space did not open menu');
  escapeTo('open-story-menu');assert(!visible('#story-menu'),'Escape did not close menu');
  keyboard('#open-story-menu');keyboard('#scene-reset');assert(!visible('#story-menu'),'Scene reset did not close menu');
  const after=status().stage.orbit;assert(Math.abs(after.yaw-.28)<1e-6&&Math.abs(after.pitch-.25)<1e-6&&after.zoom===1,'Scene reset failed');
  record('menu-keyboard-dialog',{label,before,after,dialogFocus,focused:evaluate('document.activeElement.id')});
}
function pointerIsolation(label) {
  ready();
  evaluate(`(()=>{window.__uiNotices=[];window.__uiNoticeObserver?.disconnect();window.__uiNoticeObserver=new MutationObserver(records=>{for(const r of records)if(r.type==='childList')window.__uiNotices.push(document.querySelector('#notice').textContent)});window.__uiNoticeObserver.observe(document.querySelector('#notice'),{childList:true});return true})()`);
  const count=()=>evaluate('window.__uiNotices.length');
  const pointClick=point=>{command('mouse','move',String(Math.round(point.x)),String(Math.round(point.y)));command('mouse','down');command('mouse','up');};
  const canvas=evaluate(`(()=>{const r=document.querySelector('#stage canvas').getBoundingClientRect();return{left:r.left,top:r.top}})()`);
  let hit=null;
  for(const actor of status().stage.focus.projectedActors){
    for(const ratio of[.5,.35,.7]){
      const point={x:canvas.left+actor.head.x+(actor.foot.x-actor.head.x)*ratio,y:canvas.top+actor.head.y+(actor.foot.y-actor.head.y)*ratio};
      const before=count();pointClick(point);if(count()>before){hit={id:actor.id,point};break;}
    }
    if(hit)break;
  }
  assert(hit,'Pointer positive control could not touch a visible actor');
  click('#open-story-menu');const notices=count(),before=status().stage.orbit;
  pointClick(hit.point);ready();
  assert(!visible('#story-menu')&&count()===notices,'Dismissing menu clicked through to the actor');
  assert(JSON.stringify(status().stage.orbit)===JSON.stringify(before),'Menu dismissal changed camera');
  replies('choices');click('#show-text');ready();click('#close-replies');ready();
  assert(count()===notices&&JSON.stringify(status().stage.orbit)===JSON.stringify(before),'Reply controls interacted with the 3D scene');
  const safe=status().stage.safeViewport;const x=(safe.left+safe.right)/2,y=(safe.top+safe.bottom)/2;
  command('mouse','move',String(Math.round(x)),String(Math.round(y)));command('mouse','down');
  for(let i=1;i<=4;i++)command('mouse','move',String(Math.round(x+i*15)),String(Math.round(y+i*5)));
  command('mouse','up');ready();const rotated=status().stage.orbit;
  assert(Math.abs(rotated.yaw-before.yaw)>.1,'Real drag did not rotate camera');
  click('#open-story-menu');click('#scene-reset');ready();const reset=status().stage.orbit;
  assert(Math.abs(reset.yaw-.28)<1e-6&&Math.abs(reset.pitch-.25)<1e-6&&reset.zoom===1,'Menu reset failed after a real orbit');
  record('pointer-isolation-and-real-reset',{label,positiveControl:hit,notices,before,rotated,reset,screenshot:capture(`${label}-pointer-reset`)});
}
function voiceGuardTests() {
  const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  for(const[name,next]of[['setupQuestion','renderAnswerOptions'],['enterScene','matchChoice']]){
    const body=source.slice(source.indexOf(`async function ${name}(`),source.indexOf(`function ${next}(`));
    assert(body.includes('resumeListening()')&&!body.includes('voice.listen(true)'),`${name} bypasses the shared listening guard`);
  }
  record('voice-guard-source-routing',{functions:['setupQuestion','enterScene'],sharedGuard:true});
  const waitRecording=wanted=>evaluate(`(async()=>{const until=Date.now()+6000;while(Date.now()<until){if(window.__DEV_STORY__.status.voice.recording===${wanted})return window.__DEV_STORY__.status.voice;await new Promise(r=>setTimeout(r,70));}throw Error('Capture did not become '+${wanted})})()`);
  const story=STORIES.find(item=>item.id==='doudou');
  for(const branch of['setup','scene'])for(const surface of['menu','bag']){
    const label=`silent-fixture-${branch}-${surface}`;
    if(branch==='setup'){
      open(`${base}?story=doudou`);click('#open-story-menu');click('#restart');
    }else install(story,0);
    keyboard('#start-story');const initial=decision();
    assert(initial.state.phase===(branch==='setup'?'setup':'question'),'Wrong voice-guard starting phase');
    evaluate(`(()=>{
      window.__silentMediaFixture={calls:0,ttsCalls:0,kind:'zero-valued-WebAudio-stream-no-physical-device'};
      const wav=new ArrayBuffer(44+48000*2),header=new DataView(wav);
      const tag=(offset,value)=>{for(let i=0;i<value.length;i++)header.setUint8(offset+i,value.charCodeAt(i))};
      tag(0,'RIFF');header.setUint32(4,wav.byteLength-8,true);tag(8,'WAVE');tag(12,'fmt ');
      header.setUint32(16,16,true);header.setUint16(20,1,true);header.setUint16(22,1,true);
      header.setUint32(24,48000,true);header.setUint32(28,96000,true);header.setUint16(32,2,true);header.setUint16(34,16,true);
      tag(36,'data');header.setUint32(40,96000,true);
      const originalFetch=window.fetch.bind(window);
      window.fetch=(input,init)=>{
        const url=new URL(typeof input==='string'?input:input.url,location.href);
        if(url.pathname==='/api/tts'){
          window.__silentMediaFixture.ttsCalls++;
          return Promise.resolve(new Response(wav.slice(0),{status:200,headers:{'Content-Type':'audio/wav'}}));
        }
        return originalFetch(input,init);
      };
      navigator.mediaDevices.getUserMedia=async()=>{
        const fixture=window.__silentMediaFixture;fixture.calls++;
        const context=new AudioContext(),destination=context.createMediaStreamDestination(),source=context.createConstantSource();
        source.offset.value=0;source.connect(destination);source.start();await context.resume();
        Object.assign(fixture,{context,source,stream:destination.stream});return destination.stream;
      };return true;
    })()`);
    click('#mic-button');ready();const before=waitRecording(true);
    replies('choices');const choiceId=evaluate(`document.querySelector('#choices button').dataset.choice`);click(`[data-choice="${choiceId}"]`);
    click('#open-story-menu');if(surface==='bag')click('#bag-button');
    const opened=status();assert(opened.busy&&!['setup','question','complete'].includes(opened.phase),'Overlay was not opened during narration');
    // Do not programmatically skip the speech card behind a modal. Let the
    // actual narration finish naturally while its input blocker remains open.
    const blocked=evaluate(`(async()=>{
      const until=Date.now()+27000;
      while(Date.now()<until){
        const s=window.__DEV_STORY__.status;
        if(!s.busy&&s.phase===${JSON.stringify(branch==='setup'?'setup':'question')}&&${branch==='setup'?'s.setupStep===1':'s.sceneIndex===1'}){
          await new Promise(r=>setTimeout(r,650));
          return{voice:window.__DEV_STORY__.status.voice,phase:s.phase,scene:s.sceneIndex,setupStep:s.setupStep,
            menu:!document.querySelector('#story-menu').hidden,bag:document.querySelector('#bag-dialog').open,
            fixtureCalls:window.__silentMediaFixture.calls,ttsFixtureCalls:window.__silentMediaFixture.ttsCalls,
            tracks:window.__silentMediaFixture.stream.getAudioTracks().map(t=>({enabled:t.enabled,readyState:t.readyState}))};
        }
        await new Promise(r=>setTimeout(r,100));
      }
      throw Error('Natural narration exceeded voice guard test deadline');
    })()`);
    assert(blocked[surface]&&blocked.voice.enabled&&!blocked.voice.recording&&blocked.tracks.every(track=>!track.enabled&&track.readyState==='live'),`${label}: narration resumed microphone through open UI`);
    if(surface==='bag')click('#close-bag');else click('#open-story-menu');
    ready();const resumed=waitRecording(true);click('#mic-button');ready();
    const released=evaluate(`({voice:window.__DEV_STORY__.status.voice,tracks:window.__silentMediaFixture.stream.getTracks().map(t=>({enabled:t.enabled,readyState:t.readyState}))})`);
    assert(!released.voice.enabled&&!released.voice.recording&&released.tracks.every(track=>track.readyState==='ended'),`${label}: pause did not release silent fixture`);
    evaluate(`(async()=>{try{window.__silentMediaFixture.source.stop()}catch{}await window.__silentMediaFixture.context.close();return true})()`);
    record('voice-guard-real-worklet-fixture',{label,fixture:'zero-valued WebAudio MediaStream and one-second silent-WAV TTS timing; real AudioWorklet and UI progression; no physical microphone or ASR utterance',before,openedPhase:opened.phase,blocked,resumed,released});
  }
}

try {
  command('set','viewport','390','844');open(base);command('snapshot','-i');
  assert(!evaluate(`Object.keys(localStorage).some(key=>key.startsWith('jma.dev.clay.v1'))`),'Use a fresh isolated browser session');
  if(voiceGuardsOnly){
    voiceGuardTests();
  }else{
  const byWorld=new Map();for(const story of STORIES)story.scenes.forEach((scene,index)=>{if(!byWorld.has(scene.world))byWorld.set(scene.world,{story,index});});
  assert(byWorld.size===11,'Stories no longer cover eleven worlds');
  if(requestedWorlds)assert(requestedWorlds.every(world=>byWorld.has(world)),'Unknown DEV_QA_WORLDS entry');
  for(const [width,height]of(requestedViewports||(interactionOnly?[[390,844]]:[[1280,900],[390,844],[360,800]]))){
    command('set','viewport',String(width),String(height));
    for(const[world,{story,index}]of byWorld){
      if(interactionOnly&&world!=='orchard')continue;
      if(requestedWorlds&&!requestedWorlds.includes(world))continue;
      const label=`${width}x${height}-${world}`;const old=install(story,index);
      view(`${label}-ready`);noMicrophone(label);
      assert(visible('#start-story')&&!visible('#answer-dock')&&!visible('#camera-reset'),'Ready screen controls incorrect');
      if(world==='orchard')menuTests(label);
      assert(stored(story.id)===old,'UI viewing/menu changed legacy save');
      keyboard('#start-story');const next=decision();assert(next.state.phase==='question'&&next.state.sceneIndex===index,'Start did not resume the saved scene');
      collapsed();noMicrophone(label);view(`${label}-question`);
      keyboard('#reply-more');replies('choices');view(`${label}-choices`,{expanded:true});
      keyboard('#show-text');ready();replies('text');view(`${label}-text`,{expanded:true});
      escapeTo('reply-more');collapsed();
      if(world==='orchard'){
        // Keyboard tab order must not include any collapsed answer/tool child.
        const tabbed=[];command('focus','#reply-more');for(let i=0;i<7;i++){command('press','Tab');tabbed.push(evaluate('document.activeElement.id'));}
        assert(!tabbed.some(id=>['show-text','show-choices','answer-input','close-replies','bag-button','restart','scene-reset'].includes(id)),'Collapsed controls remain keyboard-focusable');
        replies('choices');keyboard('#close-replies','Space');collapsed();assert(evaluate(`document.activeElement.id==='reply-more'`),'Close replies did not restore focus');
        menuTests(label);pointerIsolation(label);record('keyboard-collapsed-layers',{label,tabbed});
      }
      assert(stored(story.id)===old,'Expansion/camera/menu altered the existing story record');
      command('reload');ready();protectMicrophone();assert(stored(story.id)===old&&status().sceneIndex===index,'Reload changed legacy progress');
      record('legacy-save-unchanged',{label,story:story.id,index,byteIdentical:true});
    }
  }

  if(!skipFinalChecks){
  // Exercise actual setup fallback/selection, including next-state collapse.
  command('set','viewport','390','844');open(`${base}?story=doudou`);click('#open-story-menu');click('#restart');
  keyboard('#start-story');let next=decision();assert(next.state.phase==='setup'&&next.state.setupStep===0,'Doudou lost its setup');
  replies('text');command('fill','#answer-input','一片云');keyboard('#text-form button');ready();
  assert(visible('#reply-options')&&visible('#choices')&&!visible('#text-form'),'Unmatched setup answer did not reveal fallback choices');
  view('390x844-setup-unmatched-fallback',{expanded:true});
  click('[data-choice="rabbit"]');next=decision();assert(next.state.setupStep===1,'Setup selection did not advance exactly once');collapsed();
  noMicrophone('setup-fallback');
  // Explicit denial is an environment fixture, never a real microphone call.
  click('#mic-button');ready();assert(evaluate('window.__immersiveMediaFixture.calls')===1,'Explicit mic request not exercised');
  assert(visible('#reply-options')&&visible('#choices'),'Permission failure did not reveal fallback');
  noMicrophone('denial-fallback',1);view('390x844-permission-denied-fallback',{expanded:true});
  replies('text');command('fill','#answer-input','还没提交的想法');
  command('set','viewport','390','500');ready();view('390x500-text-resize-proxy',{expanded:true,short:true});
  assert(visible('#answer-input')&&visible('#text-form button'),'Reduced-height text controls absent');
  record('short-viewport-proxy',{note:'Viewport resize proxy, not a claim of testing a physical iOS keyboard',input:evaluate(`document.querySelector('#answer-input').value`)});
  command('set','viewport','390','844');escapeTo('reply-more');collapsed();
  click('#home-link');ready();assert(status().phase==='home'&&!visible('#reply-options')&&!visible('#story-menu'),'Leave retained an open overlay');
  // Completed old record must remain compatible without starting over.
  const echo=STORIES.find(story=>story.id==='echo');const completedFixture={...fixture(echo,5),completed:true};
  evaluate(`localStorage.setItem('jma.dev.clay.v1.story.echo',${JSON.stringify(JSON.stringify(completedFixture))});true`);open(`${base}?story=echo`);
  assert(status().completed&&stored('echo')===JSON.stringify(completedFixture),'Completed legacy record changed');
  }
  }
  const errors=command('errors'),consoleText=command('console');record('browser-errors',{errors,console:consoleText});
  assert(!errors.trim()&&!/\[error\]|Shader Error|VALIDATE_STATUS.*false|webgl.*context lost/i.test(consoleText),'Browser/shader errors');
  complete=true;if(issues.length)process.exitCode=1;
}catch(error){failure=error.stack||String(error);process.exitCode=1;console.error(failure);
  const diagnostics={};
  for(const[name,read]of Object.entries({
    page:()=>evaluate(`({url:location.href,ready:document.readyState,visibility:document.visibilityState,state:window.__DEV_STORY__?.status||null,loading:document.querySelector('#stage-loading')?.textContent,resources:performance.getEntriesByType('resource').map(r=>({url:r.name,duration:r.duration,transfer:r.transferSize}))})`),
    screenshot:()=>capture('failure'),errors:()=>command('errors'),console:()=>command('console'),network:()=>command('network','requests')
  }))try{diagnostics[name]=read()}catch(captureError){diagnostics[name]={captureError:String(captureError)}}
  record('failure',diagnostics);
}
finally{
  try{command('close');closed=true;}catch{}
  writeFileSync(resultFile,`${JSON.stringify({base,session,artifacts,scope:batch?'filtered-world-viewport-batch':voiceGuardsOnly?'silent-device-voice-guards':interactionOnly?'focused-interactions':'full-world-viewport-matrix',filters:{batch,viewports:requestedViewports||null,worlds:requestedWorlds||null,skipFinalChecks},checkedAt:new Date().toISOString(),complete,passed:complete&&!issues.length&&!failure,issues,failure,closed,
    method:voiceGuardsOnly?'real UI and AudioWorklet; synthetic silent MediaStream and one-second silent-WAV TTS timing fixture; source guard routing assertions; no physical microphone, ASR, or synthesis-quality claim':'real browser UI and keyboard; synthetic session-only legacy saves; always-rejected media-device fixture; independent DOM occlusion vs projected model bounds; no full-sphere requirement',rows},null,2)}\n`);
}
