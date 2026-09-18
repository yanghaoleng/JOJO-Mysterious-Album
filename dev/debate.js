import { DioramaStage } from './stage.js';
import { StoryVoice, requestJSON } from './voice.js';
import { SeedRealtimeSpeech } from '../src/seed-realtime-speech.js';
import { createVoiceInput } from '../src/voice-input-control.js';
const $=id=>document.getElementById(id);
const speakers=[{id:'book-owl',name:'书桌小鸮',hint:'认真又爱唱反调的星球主人，会倾听其他理由。',type:'owl',voice:'neighbor'},{id:'snow-rabbit',name:'雪团小兔',hint:'温柔好奇的同行伙伴，愿意多想一种办法。',type:'rabbit',voice:'bubble'}];
let stage,phase='ready',result=null,index=0,epoch=0,paused=false,request=null,speechId=0;
const status=text=>{$('status').textContent=text;};
const input=createVoiceInput({button:$('mic-button'),transcript:$('heard'),status:$('voice-feedback')});
const speech=new SeedRealtimeSpeech({onError:()=>status('声音暂时没连上，文字还在。可以轻点对话继续。')});
const voice=new StoryVoice({
  onState:state=>{if(['ready','topic','reflection'].includes(phase))input.setState(speech.isActive()?'speaking':state==='off'?(phase==='ready'?'setup':'paused'):state,{disabled:speech.isActive()});},
  onAnswer:text=>answer(text),onLevel:level=>input.setLevel(level),
  onCapture:update=>{if(update.text)input.setTranscript(update.text);if(update.message)status(update.message);},onError:status,
});
function layout(){if(!stage)return;const r=$('debate-world').getBoundingClientRect();const bottom=document.querySelector('.conversation').getBoundingClientRect();stage.setViewportInsets({top:innerWidth<768?160:100,bottom:Math.max(140,r.bottom-bottom.top+20),left:innerWidth<900?0:innerWidth*.12,right:0});}
try{stage=new DioramaStage($('debate-world'));stage.setScene('meadow',speakers);stage.yaw=.04;stage.pitch=.14;stage.frameCharacters();stage.setCameraDriftEnabled(true);layout();$('debate-world').dataset.ready='true';}catch{$('world-error').hidden=false;}
new ResizeObserver(layout).observe(document.querySelector('.conversation'));addEventListener('resize',layout);
function setPhase(next){phase=next;document.body.dataset.phase=next;const discussing=next==='discussing';$('toggle-play').hidden=$('next-turn').hidden=$('finish').hidden=!discussing;$('mic-button').hidden=!['ready','topic','reflection'].includes(next);$('write-answer').hidden=!['ready','topic','reflection'].includes(next);$('next-chapter').hidden=next!=='ending';$('write-answer').textContent=next==='reflection'?'写下我的看法':'写下想法';voice.listen(['topic','reflection'].includes(next));layout();}
async function say(text,who=speakers[0]){const token=++speechId;voice.listen(false);stage?.speak(who.id,true);$('speaker-name').textContent=who.name;$('speech-text').textContent=text;input.setState('speaking',{disabled:true});const played=await speech.speak(text,who.voice);if(token!==speechId)return;stage?.speak('',false);if(['topic','reflection'].includes(phase))voice.listen(true);return played;}
function cancelSpeech(){speechId++;speech.stop();stage?.speak('',false);}
async function playTurn(){cancelSpeech();if(phase!=='discussing')return;if(index>=result.turns.length)return reflect();const turn=result.turns[index],who=speakers.find(s=>s.id===turn.speakerId)||speakers[index%2];$('round-label').textContent=`${['先说说自己的理由','再听听另一种想法','带走一个新问题'][Math.floor(index/2)]} · ${index+1}/6`;$('speaker-name').textContent=who.name;$('speech-text').textContent=turn.text;layout();if(paused)return;const token=epoch,currentIndex=index;const played=await say(turn.text,who);if(token!==epoch||paused||phase!=='discussing'||index!==currentIndex)return;if(!played){status('轻点文字或“下一句”，继续听另一种想法。');return;}index++;void playTurn();}
function reflect(){epoch++;cancelSpeech();paused=false;$('toggle-play').textContent='暂停';setPhase('reflection');$('round-label').textContent='轮到你的想法了';void say(result.closingQuestion,speakers[1]);}
async function answer(raw){const text=String(raw).trim().slice(0,phase==='reflection'?120:80);if(!text||!['ready','topic','reflection'].includes(phase))return;input.setTranscript(text);$('answer-input').value='';$('answer-dialog').close();voice.listen(false);cancelSpeech();status('');
  if(phase==='reflection'){epoch++;setPhase('ending');voice.pause();$('round-label').textContent='没有输赢，多了一种看世界的方法';$('topic-caption').textContent=result.commonGround;await say(`谢谢你把自己的想法放进来。${result.commonGround}`,speakers[1]);return;}
  const token=++epoch;setPhase('thinking');input.setState('thinking');$('speaker-name').textContent='雪团小兔';$('speech-text').textContent='这个问题很有意思。等一等，我们从两个方向想一想。';status('伙伴正在整理想法……');request?.abort();request=new AbortController();
  try{const data=await requestJSON('/api/debate',{question:text,speakers:speakers.map(({id,name,hint})=>({id,name,hint}))},45000,request.signal);if(token!==epoch)return;if(data.allowed===false){setPhase('topic');$('speech-text').textContent=data.safeMessage;status(data.safeMessage);return;}if(!Array.isArray(data.turns)||data.turns.length!==6)throw new Error('Invalid debate response');result=data;index=0;paused=false;$('toggle-play').textContent='暂停';$('topic-caption').textContent=data.topic;status('');setPhase('discussing');void playTurn();}
  catch(error){if(token!==epoch)return;setPhase('topic');$('speech-text').textContent='刚才的想法没能送到。我们可以再试一次。';status('网络暂时没连上，请重新说出或写下问题。');}finally{if(token===epoch)request=null;}
}
$('mic-button').addEventListener('click',async()=>{
  if(voice.enabled){voice.pause();return;}
  await speech.unlock();await voice.enable();
  if(!voice.enabled)return;
  if(phase==='ready'){setPhase('topic');$('round-label').textContent='先说说你的好奇';await say('你最近最想聊什么？告诉我一个你感兴趣的问题吧。',speakers[1]);}else voice.listen(['topic','reflection'].includes(phase)&&!speech.isActive());
});
$('write-answer').addEventListener('click',()=>{voice.listen(false);cancelSpeech();$('answer-title').textContent=phase==='reflection'?'你的想法是什么？':'你想聊些什么？';$('answer-label').textContent=phase==='reflection'?'把自己的理由写下来':'写下你感兴趣的问题';$('answer-input').maxLength=phase==='reflection'?120:80;$('topic-suggestions').hidden=phase==='reflection';$('answer-dialog').showModal();$('answer-input').focus();});
$('close-answer').onclick=()=>$('answer-dialog').close();$('answer-dialog').addEventListener('close',()=>{if(['topic','reflection'].includes(phase))voice.listen(true);});
$('answer-form').addEventListener('submit',event=>{event.preventDefault();void speech.unlock();void answer($('answer-input').value);});
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>{$('answer-input').value=b.dataset.question;$('answer-input').focus();}));
function next(){if(phase==='discussing'){epoch++;cancelSpeech();index++;void playTurn();}else{cancelSpeech();if(['topic','reflection'].includes(phase))voice.listen(true);}}
$('speech-card').onclick=next;$('next-turn').onclick=next;$('finish').onclick=reflect;
$('toggle-play').onclick=()=>{paused=!paused;epoch++;cancelSpeech();$('toggle-play').textContent=paused?'继续':'暂停';if(!paused)void playTurn();};
$('restart').onclick=()=>{epoch++;request?.abort();request=null;cancelSpeech();voice.stop();input.reset();result=null;index=0;paused=false;$('answer-dialog').close();$('answer-input').value='';setPhase('ready');$('topic-caption').textContent='带着你的好奇，拜访一位想法不一样的朋友。';$('round-label').textContent='星球主人 · 书桌小鸮';$('speaker-name').textContent='书桌小鸮';$('speech-text').textContent='欢迎来到我的小星球。我有好多主意，不过……你也许和我想得不一样！';status('');};
addEventListener('pagehide',()=>{epoch++;request?.abort();cancelSpeech();voice.stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){voice.pause();if(phase==='discussing'&&!paused)$('toggle-play').click();}});
window.__DEBATE_3D__={get status(){return {phase,index,paused,characters:stage?.actors.size||0,world:stage?.worldId,voiceEnabled:voice.enabled};}};
setPhase('ready');
