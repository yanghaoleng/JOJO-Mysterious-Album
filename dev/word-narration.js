import { wordSceneEntities } from './word-scene.js';
import { findWordObjects, planWordIntent } from './word-intent.js';

// Narration shares world commands with speech input, but never touches answer progress.
export function createWordNarration(text, { getContext, apply }) {
  let lastEnd=0, closed=false;
  const context=()=>{const c=getContext();return {...c,entities:wordSceneEntities(c.entities,'demo'),focusId:null,idPrefix:'demo'};};
  const sent=new Set(), participants=new Set();
  const mentions=findWordObjects(text).filter((h,i,hits)=>!(h.item.word==='toy'&&['box','car'].includes(hits[i+1]?.item.word)));
  const finalEnd=[...text.matchAll(/[a-z0-9]+/gi)].at(-1)?.index;
  function advance(end) {
    if(end<=lastEnd)return;
    const prefix=text.slice(0,end), nouns=mentions.filter(hit=>hit.end<=end);
    const complete=finalEnd!==undefined&&end>finalEnd;
    const newNouns=nouns.filter(hit=>hit.end>lastEnd);
    const hasNewNoun=newNouns.length>0;
    lastEnd=end;
    if(!hasNewNoun&&!complete)return;
    const plan=planWordIntent(prefix,{...context(),feedback:true});
    const namedIds=new Set(newNouns.flatMap(hit=>planWordIntent(hit.alias,{...context(),feedback:true}).commands.filter(c=>c.cue==='mention').map(c=>c.id)));
    const commands=plan.commands.filter(c=>{
      if(c.cue==='mention'&&!namedIds.has(c.id))return false;
      if(c.type==='entity.event'&&!complete)return false;
      const key=JSON.stringify(c);if(sent.has(key))return false;
      sent.add(key);return true;
    });
    if(commands.length){const result=apply(commands);if(result?.ok!==false)for(const c of commands)if(c.type==='entity.cue')participants.add(c.id);}
  }
  return packet=>{
    if(closed)return;
    if(packet.status==='playing'&&packet.end>0)advance(packet.end);
    if(packet.status==='ended'){advance(text.length);closed=true;}
    if(packet.status==='cancelled'){
      closed=true;
      const entities=getContext().entities;
      const commands=[...participants].filter(id=>entities[id]).map(id=>({type:'entity.cue',id,cue:'cancel'}));
      if(commands.length)apply(commands);
    }
  };
}
