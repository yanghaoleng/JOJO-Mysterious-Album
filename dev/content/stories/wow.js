import { firstLightModelEvents } from './first-light-models.js';
/** First chapter, authored from the two DingTalk documents dated 2026-09-20.
 * Stable legacy scene IDs remain save anchors; historical book data stays in src/.
 * Choices replace the source's two drag gestures to honor voice / tap only.
 */
export const WOW_PROPS = {
  torch: { id:'torch', name:'好奇光筒', description:'把声音收成光，也会亮着等你。' },
  radio: { id:'radio', name:'唔姆收音机', description:'旧旅程里留下的声音。' },
  jar: { id:'jar', name:'颜色罐', description:'旧旅程里留下的颜色。' },
};
const tapTargets = {'first-sound':'fl-star','garden-response':'fl-seed','first-light-page':'fl-book'};
const beats = [
  ['first-sound','咯咯哒与睡着的星星','choice','我是见习追光员咯咯哒。以前，一个认真提出的问题就能点亮星星；现在它睡着了。','点点灰星星，陪我找回第一束光。',['点点灰星星']],
  ['voice-light','留下你的问题','voice','光种子在等你的声音。一个词，或一个“为什么”，都可以让它发亮。','你今天想问什么？',['为什么天是蓝的？','为什么鱼会游泳？','先安静看看'], 'torch'],
  ['gugu-feeling','给问题画个样子','voice','“{firstWords}”让光种子亮了。再给它画一片天空，放进一样你想看的东西。','什么颜色的天空里有什么？一句话说完吧。',['粉色天空里有小鱼','粉色天空里有棉花糖','彩虹色天空里有小鱼','彩虹色天空里有棉花糖','先安静看看']],
  ['garden-response','种下光，遇见啵啵兽','choice','你的问题有了颜色和形状。把光种进草地，看看谁会醒来。','点一下光种子，把它种进草地。',['把光种进草地']],
  ['first-light-page','带着问题去找小鸮','choice','啵！啵啵兽醒来了。你的问题点亮了第一束光。书桌小鸮想知道：“问出来以后，怎么试出答案？”','收下绘本页，带着问题去听两种办法。',['带着问题去找小鸮']],
];
export const WOW_DEV_STORY = {
  id:'wow', version:4, interaction:'curiosity', firstLight:true, exploration:true,
  title:'第一束好奇的光', subtitle:'和咯咯哒一起，把你的问题种成光。', age:'第一章 · 5 回合',
  onboarding:'direct', companion:'rabbit', companionName:'咯咯哒', color:'#efd36e',
  premise:'黑暗里，有一团黄毛球举着光筒。它也正在学着问出第一个“为什么”。',
  chapters:[{number:1,title:'第一束好奇的光'}],
  events:[{id:'first-light-answer',on:'answer.accepted',effects:[{type:'actor.animate',target:'wow',animation:'wave',expression:'happy'}]}],
  scenes:beats.map(([id,title,inputMode,text,question,labels,prop],i)=>({
    id,title,inputMode,tapTarget:tapTargets[id] || null,chapter:1,chapterScene:i,world:'meadow',objective:question,question,questionSpeaker:'wow',
    wow:{kind:id==='voice-light'?'light':'observe',prop,color:'#efd36e',colorName:'第一束好奇光',momo:'咯咯哒'},
    cast:[{id:'wow',name:'咯咯哒',voice:'star',asset:'npc:jiaojiao',color:'#efd36e'}],
    dialogue:[{speaker:'wow',text}],choices:labels.map((label,n)=>({id:`${id}-${n}`,label})),
    closing:[],events:firstLightModelEvents(id),final:i===beats.length-1,
  })),
  ending:{title:'你的第一束光，亮起来了',text:'第一页已经收好。书桌小鸮和雪团小兔正在讨论怎样试试你的想法。',companionLine:'“{firstWords}”变成了第一束光。带着这个问题，去听听两位朋友的办法吧！'},
};
