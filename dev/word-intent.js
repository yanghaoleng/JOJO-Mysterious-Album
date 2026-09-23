import { BEHAVIOR_ACTIONS, BEHAVIOR_EFFECTS } from './content/behavior-events.js';
import { RLINE_MODEL_WORDS } from './content/rline-nouns.js';
import { CREATION_KITS } from './content/props.js';
import { ASSETS } from './content/assets.js';

const colors={red:'#de7066',blue:'#6eabd0',yellow:'#efd06d',green:'#8cba87',pink:'#e5a1b5',purple:'#b09ace',orange:'#e9a260',white:'#f2ede1',black:'#45474e',brown:'#ac7957','红':'#de7066','蓝':'#6eabd0','黄':'#efd06d','绿':'#8cba87','粉':'#e5a1b5','紫':'#b09ace','橙':'#e9a260','白':'#f2ede1','黑':'#45474e','棕':'#ac7957'};
const quantities={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,'一':1,'两':2,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
const effectWords={grow:['grow','grows','growing','生长','长大','长高'],shrink:['shrink','shrinks','small','tiny','little','变小','小小'],long:['long','longer','变长','长长'],tall:['tall','taller','高高'],normal:['normal','正常','恢复'],jump:['jump','jumps','hop','leap','跳'],fly:['fly','flies','flying','飞'],swim:['swim','swims','swimming','游泳'],run:['run','runs','running','跑'],walk:['walk','walks','walking','go','走'],roll:['roll','rolls','滚'],dance:['dance','dances','dancing','跳舞'],spin:['spin','spins','spinning','旋转'],sail:['sail','sails','航行'],sleep:['sleep','sleeps','睡觉'],sleepy:['sleepy','困'],stop:['stop','stops','停'],happy:['happy','开心','快乐'],sad:['sad','伤心','难过'],angry:['angry','生气'],funny:['funny','搞笑'],wet:['wet','湿'],dry:['dry','干燥','弄干'],fast:['fast','faster','快'],slow:['slow','slowly','慢'],high:['high','高高地'],rainbow:['rainbow','彩虹色'],hum:['hum','hums','哼唱','哼歌'],hot:['hot','热的','变热','烫'],yummy:['yummy','好吃','美味'],new:['new','崭新','焕然一新']};
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export const hasWord=(text,word)=>/[a-z]/i.test(word)?new RegExp(`\\b${esc(word)}\\b`,'i').test(text):text.includes(word);
function aliases(item){const words=[item.word,...(item.aliases||[]),item.zh];if(!/s$/.test(item.word))words.push(item.word+'s');if(item.word.endsWith('y'))words.push(item.word.slice(0,-1)+'ies');return [...new Set(words)].filter(Boolean);}
export const WORD_CHARACTER_NAMES=Object.freeze({'yellow:jiaojiao':'JOJO','npc:zhuxiaodi':'BOBO','npc:domi':'DOMI'});
const lexicon=[...RLINE_MODEL_WORDS.map(n=>({...n,match:aliases(n)})),...Object.values(ASSETS).filter(a=>a.kind==='actor').map(a=>({word:WORD_CHARACTER_NAMES[a.id]?.toLowerCase()||a.name,zh:a.name,assetId:a.id,match:[...(WORD_CHARACTER_NAMES[a.id]?[WORD_CHARACTER_NAMES[a.id]]:[]),a.name,a.id.split(':').at(-1)]})),...CREATION_KITS.filter(k=>!k.id.startsWith('rword-')).map(k=>({word:k.id,zh:k.name,assetId:`prop:${k.id}`,match:k.words.split('|').filter(w=>w.length>1)}))];
export const WORD_SPEECH_VOCABULARY=[...new Set([...Object.values(WORD_CHARACTER_NAMES),...lexicon.flatMap(item=>item.match).filter(word=>/^[a-z][a-z \'-]{0,59}$/i.test(word))])];
export function findWordObjects(text) {
  const hits=[];
  for(const item of lexicon)for(const alias of item.match){
    const re=/[a-z]/i.test(alias)?new RegExp(`\\b${esc(alias)}\\b`,'ig'):new RegExp(esc(alias),'g');
    for(const match of text.matchAll(re))hits.push({item,index:match.index,end:match.index+match[0].length,alias:match[0]});
  }
  hits.sort((a,b)=>a.index-b.index||(b.end-b.index)-(a.end-a.index)||Number(b.item.assetId.startsWith('prop:rword-'))-Number(a.item.assetId.startsWith('prop:rword-')));
  const result=[];
  for(const hit of hits)if(!result.some(h=>hit.index<h.end&&hit.end>h.index))result.push(hit);
  return result;
}
export function planWordIntent(text,{entities={},chapter='color',focusId=null,feedback=false,idPrefix='wg'}={}) {
  text=String(text||'').trim().slice(0,240);
  if(!text)return {commands:[],matched:[],reply:'说一个你想变出来的东西吧。'};
  const robotParts={robot:'body',monster:'body',body:'body',head:'head',hand:'hand',foot:'foot',feet:'foot'};
  const found=findWordObjects(text).map(h=>{
    if(chapter!=='monster')return h;
    const word=h.item.word.replace(/^robot-(body|head|hand|foot)$/, '$1');
    return robotParts[word]?{...h,item:{...h.item,word,assetId:`prop:robot-${robotParts[word]}`}}:h;
  });
  const objects=found.filter((h,i)=>!(h.item.word==='toy'&&['box','car'].includes(found[i+1]?.item.word))&&!(['run','nap','pop','cut'].includes(h.item.word)&&(found.length>1||Object.keys(entities).length||BEHAVIOR_ACTIONS.some(a=>a.id===h.item.word&&a.aliases.some(w=>hasWord(text,w)))))),commands=[],matched=[],targets=[];
  const known=Object.values(entities);
  const globalEffects=Object.entries(effectWords).filter(([,words])=>words.some(w=>hasWord(text,w))).map(([e])=>e);
  const commandEffect=(id,scope)=>{
    for(const [word,color] of Object.entries(colors))if(hasWord(scope,word)){commands.push({type:'entity.color',id,color});break;}
    if(/\bbig\b|\bhuge\b|\bgiant\b|巨大|大大|变大/i.test(scope))commands.push({type:'entity.scale',id,scale:1.05});
    const effects=Object.entries(effectWords).filter(([,words])=>words.some(w=>hasWord(scope,w))).sort((a,b)=>Math.min(...a[1].filter(w=>hasWord(scope,w)).map(w=>scope.toLowerCase().indexOf(w)))-Math.min(...b[1].filter(w=>hasWord(scope,w)).map(w=>scope.toLowerCase().indexOf(w)))).map(([e])=>e);
    for(const effect of effects)commands.push({type:'entity.effect',id,effect});
  };
  for(let i=0;i<objects.length;i++) {
    const h=objects[i], before=text.slice(i?objects[i-1].end:0,h.index);
    const segmentStart=Math.max(...[' and ', ' with ', ' near ', ' on ', ' in ', ' over ', ' beside ', ',', '，', '和', '戴上', '旁边'].map(s=>before.toLowerCase().includes(s)?before.toLowerCase().lastIndexOf(s)+s.length:0));
    const prefix=before.slice(segmentStart);
    const suffix=text.slice(h.end,objects[i+1]?.index??text.length).split(/\band\b|\b(?:with|near|on|in|over|beside)\b|[,，。和]/i)[0];
    const descriptors=['shrink','long','tall','normal','happy','sad','angry','sleepy','funny','wet','dry','rainbow'];
    const after=objects[i+1]&&!/\b(?:is|are|becomes?)\b|变/.test(suffix)?Object.entries(effectWords).filter(([effect,words])=>!descriptors.includes(effect)&&words.some(w=>hasWord(suffix,w))).map(([effect])=>effect).join(' '):suffix;
    const scope=`${prefix} ${h.alias} ${after}`;
    let count=1,explicit=false;
    const n=[...prefix.matchAll(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b|([一二两三四五六七八九十])(?:个|只|朵|棵|辆)?/gi)].at(-1);
    if(n){count=Math.max(1,Math.min(12,Number(n[1])||quantities[(n[1]||n[2]).toLowerCase()]||1));explicit=true;}
    if(explicit&&h.item.word==='feet')h.item={...h.item,word:'foot',assetId:chapter==='monster'?'prop:robot-foot':'prop:rword-foot'};
    const existing=known.filter(e=>e.asset===h.item.assetId);
    if(explicit&&existing.length>count)for(const extra of existing.slice(count))commands.push({type:'entity.remove',id:extra.id});
    const ids=[];
    const total=explicit?count:Math.max(1,existing.length);
    for(let j=0;j<total;j++) {
      const id=existing[j]?.id||`${idPrefix}-${chapter==='monster'&&['monster','robot','body'].includes(h.item.word)?'body':h.item.word}-${j}`;
      ids.push(id);
      if(!entities[id]){
        const index=known.length+commands.filter(c=>c.type==='entity.spawn').length;
        commands.push({type:'entity.spawn',id,asset:h.item.assetId,name:h.item.word,position:[(index%4-1.5)*1.3,Math.floor(index/4)*1.1],scale:.7});
      }
      commandEffect(id,scope);
    }
    targets.push({hit:h,ids});matched.push(h.item.word);
  }
  if(!targets.length) {
    const focus=entities[focusId]||known.at(-1);
    if(focus)commandEffect(focus.id,text);
  }
  // Imperatives before all nouns apply to each named object: “make the flower and poop grow”.
  if(targets.length&&globalEffects.length&&(objects.length===1||/\b(all|both)\b|都|一起/.test(text)))for(const {ids}of targets)for(const id of ids)for(const effect of globalEffects)if(!commands.some(c=>c.id===id&&c.effect===effect))commands.push({type:'entity.effect',id,effect});
  if(targets.length>=2){
    const accessory=new Set(['hat','cap','wig','bow','cape','glasses','coat','dress','skirt']);
    // "cat with a hat on the mat": dress the cat first, then place the cat on the mat.
    for(let i=1;i<targets.length;i++){
      const current=targets[i],previous=targets[i-1];
      const gap=text.slice(previous.hit.end,current.hit.index);
      const wear=accessory.has(current.hit.item.word)&&(/\b(?:give|wear|wears|wearing|with|has)\b|戴|穿/i.test(text.slice(0,current.hit.index)));
      if(wear){commands.push({type:'entity.attach',id:current.ids[0],target:targets[0].ids[0],slot:['hat','cap','wig','glasses'].includes(current.hit.item.word)?'hair':'on'});for(const c of commands)if(c.type==='entity.effect'&&current.ids.includes(c.id)&&['dance','jump','spin','fly','run','walk','swim','sleep'].includes(c.effect))c.id=targets[0].ids[0];continue;}
      const relation=gap.match(/\b(on|in|over|beside|near)\b|上面|里面|旁边/i);
      if(relation){const subject=i>1&&accessory.has(previous.hit.item.word)?targets[0]:previous;const slot=relation[1]?.toLowerCase()||({'上面':'on','里面':'in','旁边':'beside'}[relation[0]]);for(const id of subject.ids){commands.push({type:'entity.attach',id,target:current.ids[0],slot});if(slot==='in')commands.push({type:'entity.scale',id,scale:.35});}}
    }
  }
  if(chapter==='monster'){
    const bodyId=known.find(e=>['prop:robot-body','prop:rword-body'].includes(e.asset))?.id||commands.find(c=>c.asset==='prop:robot-body')?.id;
    const slots={head:'head',hair:'hair',face:'face',hand:'left-hand',foot:'left-foot',feet:'left-foot',eye:'left-eye',ear:'left-ear',nose:'nose',mouth:'mouth',tail:'tail'};
    if(bodyId)for(const {hit,ids}of targets)if(slots[hit.item.word])ids.forEach((id,j)=>{
      let slot=j%2===1?slots[hit.item.word].replace('left','right'):slots[hit.item.word];if(hit.item.word==='eye'&&j===2)slot='middle-eye';
      commands.push({type:'entity.attach',id,target:bodyId,slot});
      if(['eye','ear','nose','mouth'].includes(hit.item.word))commands.push({type:'entity.scale',id,scale:.23});
    });
  }
  if(/\brain\b|下雨/i.test(text)&&!objects.some(h=>h.item.word==='rain'))commands.push({type:'weather.set',preset:'rain'});
  if(/\b(eat|eats)\b|吃/.test(text)&&targets.length>=2)commands.push({type:'feeding.start',eaters:targets[0].ids,foods:targets.slice(1).flatMap(t=>t.ids)});
  if(/^water\b|浇水|浇花/i.test(text))for(const {hit,ids}of targets)if(hit.item.word!=='water')for(const id of ids)commands.push({type:'entity.effect',id,effect:'grow'},{type:'entity.effect',id,effect:'wet'});
  if(/\brun\b.*\bthen\s+stop\b|先跑.*再停/i.test(text))for(const {ids}of targets)for(const id of ids)commands.push({type:'entity.effect',id,effect:'run-stop'});
  const events=BEHAVIOR_ACTIONS.filter(a=>a.aliases.some(w=>hasWord(text,w)));
  for(const action of events){
    const at=Math.min(...action.aliases.filter(w=>hasWord(text,w)).map(w=>text.toLowerCase().indexOf(w)));
    let subject=[...targets].reverse().find(t=>t.hit.index<at)||targets[0];
    // “Look out” is a single expression; do not also start a looking event.
    if(action.id==='look'&&events.some(a=>a.id==='look-out'))continue;
    let ids=subject?.ids||[];
    if(!ids.length){
      const focused=entities[focusId]||known.at(-1);
      if(focused)ids=[focused.id];
      else {const id=`${idPrefix}-event-subject`;commands.push({type:'entity.spawn',id,asset:'prop:rword-cat',position:[0,0],scale:.7});ids=[id];}
    }
    if(/大家|所有|\ball\b/.test(text)&&!targets.length&&known.length)ids=known.map(e=>e.id);
    const other=targets.find(t=>t!==subject)?.ids[0];
    for(const id of ids){
      // Timed movement owns its trajectory; remove only its corresponding continuous effect.
      for(let i=commands.length-1;i>=0;i--)if(commands[i].id===id&&commands[i].type==='entity.effect'&&[action.id,...(action.id==='leap'||action.id==='hop'?['jump']:[])].includes(commands[i].effect))commands.splice(i,1);
      const palette=[...new Set(Object.entries(colors).filter(([w])=>hasWord(text,w)).map(([,c])=>c))].slice(0,2);
      commands.push({type:'entity.event',id,action:action.id,...(action.id==='mix'&&palette.length===2?{colors:palette}:{}),...(other&&other!==id?{target:other}:{})});
    }
    matched.push(action.word);focusId=ids[0];
  }
  if(/\bsame\b|相同|一样/.test(text)&&targets.length>=2){
    const source=known.find(e=>e.id===targets[1].ids[0])||commands.find(c=>c.type==='entity.spawn'&&c.id===targets[1].ids[0]);
    for(const id of targets[0].ids){commands.push({type:'entity.color',id,color:commands.findLast(c=>c.type==='entity.color'&&c.id===targets[1].ids[0])?.color||source?.color||'#9ab8ba'},{type:'entity.scale',id,scale:source?.scale||.7});}
  }
  if(feedback){
    const drops=commands.filter(c=>c.type==='entity.attach'&&c.slot==='in');
    for(const id of new Set(targets.flatMap(t=>t.ids)))if(entities[id]&&!drops.some(c=>c.id===id))commands.push({type:'entity.cue',id,cue:'mention'});
    for(const c of drops)commands.push({type:'entity.effect',id:c.id,effect:'stop'},{type:'entity.cue',id:c.id,cue:'put-in',target:c.target});
  }
  const effects=[...new Set(commands.filter(c=>c.type==='entity.effect').map(c=>c.effect))];
  return {commands,matched,effects,focusId:targets.at(-1)?.ids.at(-1)||focusId,reply:commands.length?`你的想法出现了${matched.length?'：'+matched.join(' · '):'！'}`:'这个想法还需要一点线索，试着加上一个物品名字。'};
}

// Only commands explicitly supported by the current chapter reach the shared gateway.
export function validateWordProposal(result,entities) {
  if(!Array.isArray(result?.commands))return [];
  const allowed=new Set(['entity.event','entity.spawn','entity.color','entity.scale','entity.effect','entity.attach','entity.animate','entity.move','entity.remove','feeding.start','feeding.stop','group.dance','group.gather','group.patrol','world.react','weather.set','fx.play','environment.set']);
  return result.commands.slice(0,100).filter(c=>allowed.has(c.type)&&(!c.asset||Object.hasOwn(ASSETS,c.asset)));
}

// The workshop uses this deterministic path for the documented vocabulary events.
// Other scene/camera/group instructions retain their existing server interpretation.
export function planBehaviorIntent(text,context={}) {
  const recognized=[...BEHAVIOR_ACTIONS,...BEHAVIOR_EFFECTS].some(a=>a.aliases.some(w=>hasWord(text,w)))||Object.values(effectWords).some(words=>words.some(w=>hasWord(text,w)))||/变大|变长|长高|变蓝|变红/.test(text);
  if(!recognized)return null;
  // Preserve richer existing group interaction parsing.
  if(/去.*(?:果园|月球|星球)|追|抱|握手|牵手|叠罗汉|一起跳舞|手拉手|包围|巡逻|镜头|运镜/.test(text))return null;
  const plan=planWordIntent(text,context);
  if(!plan.commands.length)return null;
  return {commands:plan.commands,reply:'按词语事件演出，自动道具结束后收起。',source:'behavior-events',matches:plan.matched};
}

export function replaceableWordRanges(text) {
  const ranges=findWordObjects(text).map(({index,end})=>({start:index,end}));
  const adjectives=new Set('big huge giant small tiny little long tall happy sad angry funny sleepy wet dry fast slow high hot yummy new red blue yellow green pink purple orange white black brown rainbow'.split(' '));
  for(const hit of String(text).matchAll(/[a-z]+/gi))if(adjectives.has(hit[0].toLowerCase()))ranges.push({start:hit.index,end:hit.index+hit[0].length});
  return ranges;
}
