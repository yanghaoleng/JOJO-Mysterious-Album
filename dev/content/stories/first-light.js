import { PRIVATE, DANGER, visualFor } from '../../../src/wow-local-turn.js';
export function safeLightWords(raw) {
  const text=String(raw||'').trim().slice(0,160);
  return PRIVATE.test(text)||DANGER.test(text) ? '' : text;
}
export function lightMemory(entries=[], id, fallback='') {
  const words=safeLightWords(entries.find(entry=>entry.id===id)?.answer);
  return words && words !== '先安静看看' ? words : fallback;
}
export function firstLightReply(scene, raw) {
  const words=safeLightWords(raw), quiet=words==='先安静看看';
  const quote=words ? `“${words.slice(0,48)}”` : '这点小小的光';
  const question=scene.question;
  const reaction=quiet ? '安静看看也好，光筒亮着陪你。种子啵地摇一摇，我们一起看它长大。'
    : !words ? '啵，光筒亮了一下。我们给种子留一束暖暖的光，一起看看它。'
    : scene.inputMode==='voice' ? `${quote}，我听见啦！它像亮亮的小种子，啵地摇出了光。`
    : `${quote}，啵！你的轻轻一点，让这片光又亮了一下。`;
  return {accepted:true,source:'local',reaction,visual:visualFor(words),question};
}
export function acceptLightReply(result, fallback, words) {
  const reaction=result?.reaction;
  const safe=safeLightWords(words);
  const fragment=safe.slice(0,48);
  if(!safe || !reaction || typeof reaction!=='string' || reaction.length>180 || !result.accepted ||
    PRIVATE.test(reaction)||DANGER.test(reaction)||/不对|错了|不够|答错|听不懂|标准答案|必须|不行/.test(reaction) ||
    !reaction.includes(fragment) || (reaction.match(/[。！？!?]/g)||[]).length>3) return fallback;
  return {...fallback,reaction,source:result.source==='ai'?'ai':'local'};
}
