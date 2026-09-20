import { DEBATE_STORY } from './content/stories/debate.js';
import { applyPublishedStory } from './content/stories/published.js';
applyPublishedStory(DEBATE_STORY);
import { createGameSession } from './runtime/game-session.js';
import { renderChoices } from './presentation/choice-list.js';
import { AnswerSupport, isVagueAnswer } from './answer-support.js';
import { journey, rememberJourney, DEBATE_TOPICS, debateFallback } from './curiosity-journey.js';
import { getNpc } from '../src/story-npcs/catalog.js';
import { DioramaStage } from './stage.js';
import { StoryVoice, requestJSON } from './voice.js';
import { SeedRealtimeSpeech } from '../src/seed-realtime-speech.js';
import { createVoiceInput } from '../src/voice-input-control.js';
const $=id=>document.getElementById(id);
const speakers=DEBATE_STORY.speakers;
let game;
let stage,phase='ready',result=null,index=0,epoch=0,paused=false,request=null,speechId=0;
const answerSupport = new AnswerSupport({ available: () => phase === 'reflection' && !speech.isActive() && !$('answer-dialog').open && !document.hidden && !document.body.dataset.encounter && $('answer-choices').hidden, reveal: () => showChoices(true) });
const status=text=>{$('status').textContent=text;};
const input=createVoiceInput({button:$('mic-button'),transcript:$('heard'),status:$('voice-feedback')});
const speech=new SeedRealtimeSpeech({onError:()=>status('声音暂时没连上，文字还在。可以轻点对话继续。')});
const voice=new StoryVoice({
  onState:state=>{if(['ready','topic','reflection'].includes(phase))input.setState(speech.isActive()?'speaking':state==='off'?(phase==='ready'?'setup':'paused'):state,{disabled:speech.isActive()});},
  onAnswer:text=>answer(text),onLevel:level=>input.setLevel(level),
  onCapture:update=>{answerSupport.capture(update);if(update.text)input.setTranscript(update.text);if(update.message)status(update.message);},onError:status,
});
function showChoices(reflection = false) {
  const choices = reflection ? DEBATE_STORY.reflections : DEBATE_STORY.topics;
  renderChoices($('answer-choices'),choices,text=>{void speech.unlock();void answer(text);},{className:'quiet',key:text=>text,label:text=>text});
  $('answer-choices').hidden = false; layout();
}
function resumeAnswer() { voice.listen(phase === 'reflection' && !speech.isActive() && !$('answer-dialog').open && !document.hidden && !document.body.dataset.encounter); }
function layout(){if(!stage)return;const r=$('debate-world').getBoundingClientRect();const bottom=document.querySelector('.conversation').getBoundingClientRect();stage.setViewportInsets({top:innerWidth<768?160:100,bottom:Math.max(140,r.bottom-bottom.top+20),left:20,right:20});}
const EXPLORATION_STORAGE = 'jma.dev.clay.v1.exploration.debate';
function debateExploration(reset = false) {
  let saved = null;
  try { if (reset) localStorage.removeItem(EXPLORATION_STORAGE); else saved = JSON.parse(localStorage.getItem(EXPLORATION_STORAGE)); } catch {}
  return { storyId: 'debate', saved, canInteract: () => ['ready','topic','reflection','ending'].includes(phase) && !speech.isActive() && !$('answer-dialog').open,
    onInteraction: open => { if(open){answerSupport.stop();voice.listen(false);}else{speech.stop();if(phase==='reflection')answerSupport.start();resumeAnswer();} },
    onEvent: (name,payload)=>game?.emit(name,payload),
    onCommands: commands=>game?.dispatch(commands),
    onSpeech: (text,npc) => { void speech.speak(text,npc.voice || getNpc(npc.id)?.voiceKey || 'bubble',{npcId:npc.yellow?'':npc.id}); },
    onSave: position => { try { localStorage.setItem(EXPLORATION_STORAGE, JSON.stringify(position)); } catch {} } };
}
function mountWorld(reset=false) {
  game?.dispose();
  let saved=null;
  try { if(reset)localStorage.removeItem('jma.dev.clay.v1.world.debate');else saved=JSON.parse(localStorage.getItem('jma.dev.clay.v1.world.debate')); } catch {}
  game=createGameSession({story:DEBATE_STORY,stage,saved,onChange:snapshot=>{try{localStorage.setItem('jma.dev.clay.v1.world.debate',JSON.stringify(snapshot));}catch{}}});
  stage.setScene(DEBATE_STORY.world,speakers,{exploration:debateExploration(reset)});
  game.bind({id:'debate-main',world:DEBATE_STORY.world},speakers);
  game.emit('debate.ready');
}
try{stage=new DioramaStage($('debate-world'));mountWorld();layout();$('debate-world').dataset.ready='true';}catch(error){console.error(error);$('world-error').hidden=false;}
new ResizeObserver(layout).observe(document.querySelector('.conversation'));addEventListener('resize',layout);
function setPhase(next){answerSupport.stop();phase=next;$('answer-choices').hidden=true;if(['ready','topic'].includes(next))showChoices();if(next==='reflection')answerSupport.start();document.body.dataset.phase=next;const discussing=next==='discussing';$('toggle-play').hidden=$('next-turn').hidden=$('finish').hidden=!discussing;$('mic-button').hidden=next!=='reflection';$('write-answer').hidden=!['ready','topic','reflection'].includes(next);$('next-chapter').hidden=next!=='ending';$('write-answer').textContent=next==='reflection'?'写下我的看法':'写下想法';resumeAnswer();layout();}
async function say(text,who=speakers[0]){const token=++speechId;voice.listen(false);stage?.speak(who.id,true);$('speaker-name').textContent=who.name;$('speech-text').textContent=text;input.setState('speaking',{disabled:true});const played=await speech.speak(text,who.voice);if(token!==speechId)return;stage?.speak('',false);resumeAnswer();return played;}
function cancelSpeech(){speechId++;speech.stop();stage?.speak('',false);}
async function playTurn(){cancelSpeech();if(phase!=='discussing')return;if(index>=result.turns.length)return reflect();const turn=result.turns[index],who=speakers.find(s=>s.id===turn.speakerId)||speakers[index%2];$('round-label').textContent=`${DEBATE_STORY.rounds[Math.floor(index/2)]} · ${index+1}/6`;$('speaker-name').textContent=who.name;$('speech-text').textContent=turn.text;layout();if(paused)return;const token=epoch,currentIndex=index;const played=await say(turn.text,who);if(token!==epoch||paused||phase!=='discussing'||index!==currentIndex)return;if(!played){status('轻点文字或“下一句”，继续听另一种想法。');return;}index++;void playTurn();}
function reflect(){epoch++;cancelSpeech();paused=false;$('toggle-play').textContent='暂停';setPhase('reflection');$('round-label').textContent='轮到你的想法了';void say(result.closingQuestion,speakers[1]);}
async function answer(raw){const text=String(raw).trim().slice(0,phase==='reflection'?120:80);if(!text||document.body.dataset.encounter||!['ready','topic','reflection'].includes(phase))return;if(isVagueAnswer(text)){showChoices(phase==='reflection');status('慢慢想，也可以选一个想法。');return;}if(/\d{7,}|身份证|住在|学校叫|手机号|自杀|杀人|炸弹|色情/.test(text)){status('个人信息不用告诉我们。选一个关于好奇心的问题吧。');return;}input.setTranscript(text);$('answer-input').value='';$('answer-dialog').close();voice.listen(false);cancelSpeech();status('');
  if(phase==='reflection'){rememberJourney('debate',{topic:result.topic,idea:text,completed:true});epoch++;game?.emit('debate.completed');setPhase('ending');voice.pause();$('round-label').textContent='把你的理由，带去创造一个世界';$('topic-caption').textContent=result.commonGround;await say(DEBATE_STORY.ending,speakers[1]);return;}
  const token=++epoch;setPhase('thinking');input.setState('thinking');$('speaker-name').textContent='雪团小兔';$('speech-text').textContent='这个问题很有意思。等一等，我们从两个方向想一想。';status('伙伴正在整理想法……');request?.abort();request=new AbortController();
  try{const data=await requestJSON('/api/debate',{question:text,speakers:speakers.map(({id,name,hint})=>({id,name,hint}))},45000,request.signal);if(token!==epoch)return;if(data.allowed===false){setPhase('topic');$('speech-text').textContent=data.safeMessage;status(data.safeMessage);return;}if(!Array.isArray(data.turns)||data.turns.length!==6)throw new Error('Invalid debate response');result=data;index=0;paused=false;$('toggle-play').textContent='暂停';$('topic-caption').textContent=data.topic;status('');setPhase('discussing');void playTurn();}
  catch(error){if(token!==epoch)return;if(DEBATE_TOPICS.includes(text)){result=debateFallback(text,speakers);index=0;paused=false;status('先听听伙伴准备好的两种理由。');setPhase('discussing');void playTurn();}else{setPhase('topic');$('speech-text').textContent='刚才的新问题没能送到。也可以先选一个好奇心话题。';status('新问题暂时没连上，请再试一次。');}}finally{if(token===epoch)request=null;}
}
$('mic-button').addEventListener('click',async()=>{
  if(phase !== 'reflection' || speech.isActive())return;
  if(voice.enabled){voice.pause();return;}
  await speech.unlock();resumeAnswer();await voice.enable();
});
$('write-answer').addEventListener('click',()=>{voice.listen(false);cancelSpeech();$('answer-title').textContent=phase==='reflection'?'你的想法是什么？':'你想聊些什么？';$('answer-label').textContent=phase==='reflection'?'把自己的理由写下来':'写下你感兴趣的问题';$('answer-input').maxLength=phase==='reflection'?120:80;$('topic-suggestions').hidden=phase==='reflection';$('answer-dialog').showModal();$('answer-input').focus();});
$('close-answer').onclick=()=>$('answer-dialog').close();$('answer-dialog').addEventListener('close',()=>{resumeAnswer();});
$('answer-form').addEventListener('submit',event=>{event.preventDefault();void speech.unlock();void answer($('answer-input').value);});
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>{$('answer-input').value=b.dataset.question;$('answer-input').focus();}));
function next(){if(phase==='discussing'){epoch++;cancelSpeech();index++;void playTurn();}else{cancelSpeech();resumeAnswer();}}
$('speech-card').onclick=next;$('next-turn').onclick=next;$('finish').onclick=reflect;
$('toggle-play').onclick=()=>{paused=!paused;epoch++;cancelSpeech();$('toggle-play').textContent=paused?'继续':'暂停';if(!paused)void playTurn();};
$('restart').onclick=()=>{mountWorld(true);layout();epoch++;request?.abort();request=null;cancelSpeech();voice.stop();input.reset();result=null;index=0;paused=false;$('answer-dialog').close();$('answer-input').value='';setPhase('ready');$('topic-caption').textContent='带着你的好奇，拜访一位想法不一样的朋友。';$('round-label').textContent='星球主人 · 书桌小鸮';$('speaker-name').textContent='书桌小鸮';$('speech-text').textContent='欢迎来到我的小星球！先选一个你想聊的话题吧。';status('');};
addEventListener('pagehide',()=>{answerSupport.stop();epoch++;request?.abort();cancelSpeech();voice.stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){voice.pause();if(phase==='discussing'&&!paused)$('toggle-play').click();}});
window.__DEBATE_3D__={get status(){return {runtime:game?{revision:game.runtime.state.revision,log:game.runtime.log}:null,phase,index,paused,characters:stage?.actors.size||0,world:stage?.worldId,stage:stage?.stats(),voiceEnabled:voice.enabled};}};
setPhase('ready');
function opening(){const previous=journey().wow?.question;$('round-label').textContent='第二章 · 让每个问题都被听见';$('topic-caption').textContent='拯救宇宙的好奇心：先听理由，再表达自己的想法。';$('speech-text').textContent=previous?DEBATE_STORY.handoff.replace('{question}',previous):DEBATE_STORY.opening;}
document.querySelectorAll('[data-question]').forEach((button,i)=>{button.dataset.question=DEBATE_TOPICS[i];button.textContent=DEBATE_STORY.topicLabels[i];});
$('restart').addEventListener('click',opening);opening();
