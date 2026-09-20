/** First chapter, authored from the two DingTalk documents dated 2026-09-20.
 * Stable legacy scene IDs remain save anchors; historical book data stays in src/.
 * Choices replace the source's two drag gestures to honor voice / tap only.
 */
export const WOW_PROPS = {
  torch: { id:'torch', name:'好奇光筒', description:'把声音收成光，也会亮着等你。' },
  radio: { id:'radio', name:'唔姆收音机', description:'旧旅程里留下的声音。' },
  jar: { id:'jar', name:'颜色罐', description:'旧旅程里留下的颜色。' },
};
const beats = [
  ['room-hello','黑暗里的黄毛球','choice','唔……咯？我是咯咯哒，萌萌星第 1 号见习追光员！我在找第一束好奇的光。','轻轻戳戳黄毛球，陪它找光吧。',['戳戳黄毛球']],
  ['first-sound','睡着的星星','choice','以前，小朋友问一个“为什么”，天上就叮地亮一束光。现在，星星睡着啦，只剩我打呼噜充的那一格！','点点那颗灰星星。',['点点灰星星']],
  ['world-name','光的种子','choice','传说，问题能让这颗种子长出光。我只会说“咯咯哒”，也想学着问一问。','轻轻碰一下种子。',['碰碰光的种子']],
  ['voice-light','把声音装进光筒','voice','好奇光筒装的是你的声音。说一个词，或问一个“为什么”，它就啵地亮一下。','你今天想问什么？一个词也行。',['为什么天是蓝的？','为什么鱼会游泳？','先安静看看'], 'torch'],
  ['radio-hello','问题长出一幅画','choice','快看快看！“{firstWords}”正在种子上方发光。种子咕噜翻身，露出一条亮亮的缝。','点点种子，看看你的问题。',['看看我的问题']],
  ['gugu-feeling','给想象涂颜色','voice','光从缝里探出头，等着和你一起玩。要给你的问题画一片天空，你想涂什么颜色？','这片天空，是什么颜色？',['粉色','彩虹色','先安静看看']],
  ['gugu-question','天空里飘着什么','voice','“{skyColor}”的天空铺开啦。快说快说快说——上面会飘着什么？','你想让什么飘在天上？',['棉花糖','小鱼','先安静看看']],
  ['gugu-key','咯咯哒也问出来了','voice','我也想问：“为什么{skyThing}会在天上旅行？”哇，我问出来啦，天线都亮了！','你觉得它为什么想去天上？',['想看看远方','想和星星做朋友','先安静看看']],
  ['garden-response','把光种进草地','choice','听着你的想法，光苗又长高一点。那边有一小片黑黑的草地，正等着我们。','点一下，把光苗种到草地上。',['把光苗种进草地']],
  ['first-color','给光添上第一句话','choice','还记得“{firstWords}”吗？它像一根亮亮的丝线，能和光苗抱在一起。','点一下，把第一句话送进光里。',['把我的第一句话送进去']],
  ['shell-invitation','啵啵兽醒来了','choice','啵！光里钻出一只小家伙，打个嗝，冒出一颗星星。这是你的好奇心长出来的啵啵兽！','轻轻戳戳它，听它说声“啵”。',['戳戳啵啵兽']],
  ['first-light-page','收下绘本第一页','choice','你的一句话，点亮了萌萌星的第一束光。前面的林子里，有只鸟问：“问那么多有什么用？”','收下这一页，带着自己的想法去聊聊吧。',['收下绘本第 1 页']],
];
export const WOW_DEV_STORY = {
  id:'wow', version:2, interaction:'curiosity', firstLight:true, exploration:true,
  title:'第一束好奇的光', subtitle:'和咯咯哒一起，把你的问题种成光。', age:'第一章 · 12 回合',
  onboarding:'direct', companion:'rabbit', companionName:'咯咯哒', color:'#efd36e',
  premise:'黑暗里，有一团黄毛球举着光筒。它也正在学着问出第一个“为什么”。',
  chapters:[{number:1,title:'第一束好奇的光'}],
  events:[{id:'first-light-answer',on:'answer.accepted',effects:[{type:'actor.animate',target:'wow',animation:'wave',expression:'happy'}]}],
  scenes:beats.map(([id,title,inputMode,text,question,labels,prop],i)=>({
    id,title,inputMode,chapter:1,chapterScene:i,world:'meadow',objective:question,question,questionSpeaker:'wow',
    wow:{kind:i===3?'light':'observe',prop,color:'#efd36e',colorName:'第一束好奇光',momo:'咯咯哒'},
    cast:[{id:'wow',name:'咯咯哒',voice:'star',asset:'npc:jiaojiao',color:'#efd36e'}],
    dialogue:[{speaker:'wow',text}],choices:labels.map((label,n)=>({id:`${id}-${n}`,label})),
    closing:[],events:[],final:i===11,
  })),
  ending:{title:'你的第一束光，亮起来了',text:'萌萌星亮起了 25%。第一页已经收好，前面的林子还有一个新问题。',companionLine:'“{firstWords}”——这句话变成了我们的第一束光。带着它，去和那只鸟聊聊吧！'},
};
