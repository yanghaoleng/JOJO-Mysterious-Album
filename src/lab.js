import * as THREE from 'three';
import { PAPER } from './sketch.js';
import { addPaper } from './paper.js';
import { setRender, U } from './part.js';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';
import { LAB_SCENES, SCENE_GROUPS, sceneById, createSceneBackdrop, paintSceneThumbnail } from './lab-scenes.js';
import {
  createEmptyChildProfile,
  firstUnansweredProfileIndex,
  loadChildProfile,
  profileCompletion,
  saveChildProfile,
  summarizeProfileGroups,
} from './child-profile.js';
import { trackAnalytics } from './analytics.js';
import { playUISFX } from './ui-sfx.js';
import {
  CHARACTER_CARD_FIELDS,
  baseCharacterCard,
  sanitizeCharacterCard,
} from './character-cards.js';

setRender({ u: 176, frames: 2 });

const $ = id => document.getElementById(id);
const RECIPE_KEY = 'mengmeng-lab-recipe-v1';
const SCENE_KEY = 'mengmeng-lab-scene-v1';
const CHARACTER_CARD_KEY = 'mengmeng-character-cards-v1';
const CHARACTER_LIBRARY_KEY = 'mengmeng-character-library-v1';
const EDITOR_WIDTH_KEY = 'mengmeng-character-editor-width-v1';
const VOICE_CATALOG_VERSION = 2;
const FACE_DEFAULT_SEED = 20260825;
const DEFAULT_VOICE = 'star';
const DEFAULT_SCENE = 'paper-ground';
const offlineAudioPath = key => key ? `assets/voice/star/${key}.mp3` : '';
const TEMPLATE_GROUPS = ['全部', '小动物', '人物'];
const VOICE_IDS = ['sprout', 'bubble', 'moss', 'star', 'clever', 'bright', 'lively', 'sweet', 'clear', 'neighbor', 'youth', 'gentle', 'soft', 'smart', 'caring'];
const CHARACTER_APPEARANCE_OPTIONS = {
  species: ['human', 'cat', 'dog'],
  base: ['biped', 'sit', 'quad'],
  eyes: ['sparkle', 'dot', 'saucer', 'sleepy', 'wide', 'happy', 'void'],
  crest: ['none', 'floppy', 'cat', 'bear', 'bunny', 'sprout', 'flower', 'antlers', 'spikes'],
  mouth: ['tiny', 'cat', 'smirk', 'buckteeth', 'wobble'],
  skull: ['round', 'wide', 'pear', 'square', 'wonky'],
  torso: ['bean', 'round', 'tiny', 'pear', 'barrel'],
  arms: ['stub', 'noodle', 'clasped', 'hips', 'wing'],
  tail: ['none', 'wag', 'curl', 'puff'],
  voice: VOICE_IDS,
};

const CHARACTER_TEMPLATES = [
  {
    id: 'bean-dog', group: '小动物', name: '豆豆小狗', hint: '软耳朵、豆豆眼，跑起来尾巴会摇。', voice: 'bright', seed: 21081, species: 'dog', base: 'quad',
    parts: { eyes: { type: 'dot', scale: 1.15, sx: .52 }, crest: { style: 'floppy', tone: 'skin', len: 2.05, spread: .94 }, mouth: { style: 'cat' }, nose: { style: 'button', size: 1.75 }, torso: { shape: 'round', wF: .56, hF: .56 }, tail: { style: 'wag', len: 1.22 }, extras: { spots: true } },
  },
  {
    id: 'moon-cat', group: '小动物', name: '月牙小猫', hint: '三根小胡须，卷尾巴像一个问号。', voice: 'moss', seed: 31242, species: 'cat', base: 'quad',
    parts: { eyes: { type: 'sleepy', scale: 1.45, sx: .62 }, crest: { style: 'cat', tone: 'skin', len: 1.05, spread: .72 }, mouth: { style: 'cat' }, nose: { style: 'triangle', size: 1.05 }, torso: { shape: 'tiny', wF: .43, hF: .5 }, tail: { style: 'curl', len: 1.4 }, extras: { whiskers: true, spots: false } },
  },
  {
    id: 'snow-rabbit', group: '小动物', name: '雪团小兔', hint: '长耳朵、小门牙，还有一颗绒球尾巴。', voice: 'bubble', seed: 42303, species: 'human', base: 'sit',
    parts: { eyes: { type: 'sparkle', scale: 1.58, sx: .53 }, crest: { style: 'bunny', tone: 'skin', len: 1.7, spread: .62 }, mouth: { style: 'buckteeth' }, nose: { style: 'button', size: .9 }, torso: { shape: 'round', wF: .55, hF: .59 }, tail: { style: 'puff', len: 1.35 } },
  },
  {
    id: 'honey-bear', group: '小动物', name: '蜜糖小熊', hint: '圆耳朵配圆肚子，坐着也很神气。', voice: 'gentle', seed: 53464, species: 'dog', base: 'sit',
    parts: { eyes: { type: 'dot', scale: 1.25, sx: .49 }, crest: { style: 'bear', tone: 'skin', len: 1.48, spread: .7 }, mouth: { style: 'tiny' }, nose: { style: 'button', size: 1.6 }, torso: { shape: 'barrel', wF: .69, hF: .65 }, tail: { style: 'puff', len: .95 }, extras: { spots: false } },
  },
  {
    id: 'curl-fox', group: '小动物', name: '卷尾小狐狸', hint: '尖耳朵、亮眼睛，尾巴总是翘着。', voice: 'smart', seed: 64525, species: 'cat', base: 'quad',
    parts: { eyes: { type: 'wide', scale: 1.34, sx: .61 }, crest: { style: 'cat', tone: 'skin', len: 1.25, spread: .75 }, mouth: { style: 'smirk' }, nose: { style: 'triangle', size: 1.2 }, skull: { shape: 'pear' }, torso: { shape: 'bean', wF: .48, hF: .52 }, tail: { style: 'puff', len: 1.85 }, extras: { whiskers: true, spots: true } },
  },
  {
    id: 'bamboo-panda', group: '小动物', name: '竹叶熊猫', hint: '圆耳朵和大眼圈，喜欢抱着东西想问题。', voice: 'clever', seed: 75686, species: 'dog', base: 'sit',
    parts: { eyes: { type: 'void', scale: 1.42, sx: .54, glint: true }, crest: { style: 'bear', tone: 'skin', len: 1.38, spread: .68 }, mouth: { style: 'tiny' }, nose: { style: 'button', size: 1.35 }, torso: { shape: 'pear', wF: .62, hF: .62, tone: 'hatch' }, tail: { style: 'puff', len: .7 }, extras: { spots: false } },
  },
  {
    id: 'pond-frog', group: '小动物', name: '池塘小蛙', hint: '眼睛圆圆的，蹲下来像一颗小豆子。', voice: 'lively', seed: 86747, species: 'human', base: 'sit',
    parts: { eyes: { type: 'wide', scale: 2.05, sx: .63 }, crest: { style: 'none' }, mouth: { style: 'wobble' }, nose: { style: 'none' }, skull: { shape: 'wide' }, torso: { shape: 'round', wF: .64, hF: .5 }, tail: { style: 'none' }, extras: { blush: true } },
  },
  {
    id: 'book-owl', group: '小动物', name: '书桌小鸮', hint: '两只大圆眼，翅膀习惯收在身体旁边。', voice: 'clear', seed: 97808, species: 'human', base: 'biped',
    parts: { eyes: { type: 'saucer', scale: 1.86, sx: .5 }, crest: { style: 'bear', tone: 'skin', len: 1.15, spread: .7 }, mouth: { style: 'tiny' }, nose: { style: 'triangle', size: .8 }, torso: { shape: 'round', wF: .62, hF: .62, pattern: 'belly' }, arms: { style: 'wing', len: .85 }, legs: { style: 'stub', len: .42 }, tail: { style: 'none' } },
  },
  {
    id: 'forest-deer', group: '小动物', name: '林间小鹿', hint: '头顶长着小鹿角，走路轻轻的。', voice: 'sprout', seed: 108969, species: 'human', base: 'quad',
    parts: { eyes: { type: 'dot', scale: 1.22, sx: .57 }, crest: { style: 'antlers', tone: 'bone', len: .9, spread: .61, branches: 2 }, mouth: { style: 'tiny' }, nose: { style: 'button', size: 1.05 }, skull: { shape: 'pear' }, torso: { shape: 'tiny', wF: .4, hF: .48 }, tail: { style: 'puff', len: .75 }, extras: { spots: true } },
  },
  {
    id: 'leaf-hedgehog', group: '小动物', name: '落叶小刺猬', hint: '背着一圈短刺，鼻子总在找新味道。', voice: 'caring', seed: 120030, species: 'human', base: 'sit',
    parts: { eyes: { type: 'dot', scale: 1.08, sx: .48 }, crest: { style: 'spikes', tone: 'ringed', len: 1.08, nSpikes: 7 }, mouth: { style: 'tiny' }, nose: { style: 'triangle', size: 1.25 }, skull: { shape: 'pear' }, torso: { shape: 'round', wF: .62, hF: .6 }, tail: { style: 'none' }, extras: { freckles: true } },
  },
  {
    id: 'river-otter', group: '小动物', name: '河湾小水獭', hint: '小圆耳、长尾巴，最喜欢把手抱在胸前。', voice: 'neighbor', seed: 131191, species: 'dog', base: 'biped',
    parts: { eyes: { type: 'sparkle', scale: 1.3, sx: .5 }, crest: { style: 'bear', tone: 'skin', len: .95, spread: .67 }, mouth: { style: 'cat' }, nose: { style: 'button', size: 1.25 }, torso: { shape: 'bean', wF: .48, hF: .72, pattern: 'belly' }, arms: { style: 'clasped', len: .82 }, legs: { style: 'stub', len: .43 }, tail: { style: 'wag', len: 1.68 }, extras: { whiskers: true, spots: false } },
  },
  {
    id: 'cloud-alpaca', group: '小动物', name: '云朵羊驼', hint: '软耳朵、长脖子，像一小团会走的云。', voice: 'sweet', seed: 142252, species: 'dog', base: 'biped',
    parts: { eyes: { type: 'happy', scale: 1.38, sx: .52 }, crest: { style: 'floppy', tone: 'skin', len: 1.12, spread: .73 }, mouth: { style: 'wobble' }, nose: { style: 'button', size: 1.1 }, skull: { shape: 'tall' }, torso: { shape: 'tiny', wF: .37, hF: .9 }, arms: { style: 'stub', len: .72 }, legs: { style: 'noodle', len: .9 }, tail: { style: 'puff', len: .8 }, extras: { spots: false } },
  },
  {
    id: 'trail-explorer', group: '人物', name: '星路探险家', hint: '乱蓬蓬的头发，准备第一个冲出去看看。', voice: 'star', seed: 153313, species: 'human', base: 'biped',
    parts: { eyes: { type: 'sparkle', scale: 1.55, sx: .52 }, crest: { style: 'none' }, hair: { style: 'messy', tone: 'scribble', colOn: true }, mouth: { style: 'smirk' }, skull: { shape: 'round' }, torso: { shape: 'tiny', wF: .43, hF: .69, pattern: 'pocket' }, arms: { style: 'hips', len: .92 }, legs: { style: 'noodle', len: 1.05 }, tail: { style: 'none' }, extras: { freckles: true, blush: true } },
  },
  {
    id: 'quiet-painter', group: '人物', name: '安静小画家', hint: '先观察再动笔，眼镜后面藏着很多细节。', voice: 'soft', seed: 164474, species: 'human', base: 'biped',
    parts: { eyes: { type: 'sleepy', scale: 1.42, sx: .5 }, crest: { style: 'none' }, hair: { style: 'bob', tone: 'hatch', colOn: true }, mouth: { style: 'tiny' }, skull: { shape: 'pear' }, torso: { shape: 'pear', wF: .51, hF: .72, pattern: 'buttons' }, arms: { style: 'clasped', len: .78 }, legs: { style: 'stub', len: .5 }, tail: { style: 'none' }, extras: { glasses: true, blush: true } },
  },
  {
    id: 'cloud-inventor', group: '人物', name: '云顶发明家', hint: '两只眼睛不太一样，脑袋里总有新办法。', voice: 'youth', seed: 175535, species: 'human', base: 'biped',
    parts: { eyes: { type: 'wide', type2: 'sparkle', scale: 1.45, scaleR: .88, sx: .54 }, crest: { style: 'none' }, hair: { style: 'spiky', tone: 'light', colOn: true }, mouth: { style: 'buckteeth' }, skull: { shape: 'wonky' }, torso: { shape: 'barrel', wF: .52, hF: .63, pattern: 'pocket' }, arms: { style: 'hips', len: .86 }, legs: { style: 'wide', len: .56 }, tail: { style: 'none' }, extras: { antenna: true, blush: true } },
  },
];

const VOICE_PRESETS = {
  sprout: { label: '小芽', hint: '轻柔绘本声', rate: .94, sample: '你好呀，我会慢慢听，也会把每个问题说清楚。' },
  bubble: { label: '泡泡', hint: '俏皮明亮声', rate: 1.08, sample: '我准备好了。我们来想一个从来没有见过的新朋友吧！' },
  moss: { label: '阿绒', hint: '慵懒小动物声', rate: .86, sample: '不用着急，我们可以一小步，一小步地往前走。' },
  star: { label: '星仔', hint: '爽朗少年声', rate: 1, sample: '我有一个问题。你觉得云朵会不会也有自己的秘密？' },
  clever: { label: '聪聪', hint: '机敏同桌声', rate: 1.04, sample: '等等，我好像发现了一个很有意思的新办法。' },
  bright: { label: '亮仔', hint: '亮嗓萌宠声', rate: 1.05, sample: '嗨！我一听见你的声音，尾巴就忍不住摇起来啦。' },
  lively: { label: '跳跳', hint: '活泼女孩声', rate: 1.08, sample: '我们出发吧，我已经等不及看看前面有什么了！' },
  sweet: { label: '小源', hint: '甜甜陪伴声', rate: .98, sample: '你可以慢慢告诉我，我会把每一句都听清楚。' },
  clear: { label: '梓梓', hint: '清澈讲述声', rate: .96, sample: '我来把这件事讲得清清楚楚，再一起想答案。' },
  neighbor: { label: '小邻', hint: '亲切男孩声', rate: 1.02, sample: '要不要一起去看看？我可以走在你旁边。' },
  youth: { label: '小辛', hint: '自信少年声', rate: 1.04, sample: '这个点子很大胆，我想马上做个小实验。' },
  gentle: { label: '小雅', hint: '温柔安定声', rate: .9, sample: '别担心，我们先坐一会儿，再想下一小步。' },
  soft: { label: '小林', hint: '安静邻家声', rate: .92, sample: '我先仔细看看，也许细节里藏着答案。' },
  smart: { label: '阿机', hint: '机灵小伙声', rate: 1.06, sample: '嘿，我已经想到一条更好玩的路了。' },
  caring: { label: '依依', hint: '贴心妹妹声', rate: .95, sample: '我会陪着你，你准备好了我们再继续。' },
};

const ACTION_PRESETS = {
  play: { duration: 1400 },
  walk: { duration: 2400, speed: .82 },
  run: { duration: 1900, speed: 1.05 },
  sit: { duration: 2900 },
  sleep: { duration: 3700 },
  attack: { duration: 1250 },
};

const INTERACTION_SCRIPTS = [
  {
    id: 'forest', title: '森林里的两条小路', hint: '观察探索方式、求助习惯和交朋友的方式。',
    intro: '森林里出现了两条小路。我们一起选一条，看看会遇见什么。', audio: 'script-forest-intro',
    complete: '小路走完了。我记住了你寻找线索和靠近新朋友的方式。', completeAudio: 'script-forest-complete',
    summary: answers => `森林故事里，你会${answers[0].value}，需要线索时会${answers[1].value}，遇见新朋友时会${answers[2].value}。`,
    steps: [
      {
        short: '第一条线索', prompt: '一条路有彩色脚印，另一条路传来风铃声。你想先跟着什么走？', audio: 'script-forest-q1',
        options: [
          { label: '跟着脚印', detail: '先看看颜色和形状留下的线索。', value: '先看清脚印', feedback: '你先用眼睛找线索。彩色脚印带我们绕过了一片高高的草。', audio: 'script-forest-q1-see', pose: 'walk' },
          { label: '听着风铃', detail: '闭上眼睛，听声音从哪里传来。', value: '先听声音的方向', feedback: '你先用耳朵找方向。风铃声把我们带到了一棵会唱歌的树旁。', audio: 'script-forest-q1-hear', pose: 'sit' },
        ],
      },
      {
        short: '遇到难题', prompt: '前面的小桥少了一块木板。你会先自己试试，还是叫伙伴一起来看？', audio: 'script-forest-q2',
        options: [
          { label: '我先试试看', detail: '找找附近有没有能垫在桥上的东西。', value: '先自己找办法', feedback: '你愿意先动手试试。角色找到一片树皮，稳稳放在了桥的缺口上。', audio: 'script-forest-q2-try', pose: 'attack' },
          { label: '叫伙伴一起', detail: '多一双眼睛，也许会发现别的办法。', value: '先找伙伴商量', feedback: '你喜欢一起想办法。两个人抬来一根树枝，小桥很快就修好了。', audio: 'script-forest-q2-together', pose: 'play' },
        ],
      },
      {
        short: '新朋友', prompt: '桥对面有一只害羞的小刺猬。你想先打招呼，还是安静坐在旁边？', audio: 'script-forest-q3',
        options: [
          { label: '先打个招呼', detail: '轻轻挥手，告诉它我们没有恶意。', value: '主动轻轻打招呼', feedback: '你愿意先表达友好。小刺猬慢慢抬起头，也向我们挥了挥爪子。', audio: 'script-forest-q3-wave', pose: 'play' },
          { label: '先陪它坐着', detail: '不催它，等它准备好再说话。', value: '先安静陪伴', feedback: '你愿意给朋友一点时间。坐了一会儿，小刺猬自己靠近了我们。', audio: 'script-forest-q3-stay', pose: 'sit' },
        ],
      },
    ],
  },
  {
    id: 'rain', title: '下雨天的窗边', hint: '观察感官偏好、安静活动和面对突发声音的方式。',
    intro: '窗外开始下雨了。我们不急着出门，先听听屋子里和雨里的声音。', audio: 'script-rain-intro',
    complete: '雨慢慢变小了。我记住了你安静下来和照顾自己的方式。', completeAudio: 'script-rain-complete',
    summary: answers => `雨天故事里，你会先${answers[0].value}，安静时喜欢${answers[1].value}，突然紧张时会${answers[2].value}。`,
    steps: [
      {
        short: '发现雨点', prompt: '窗上有一串雨珠，屋檐也有滴答声。你想先看雨珠，还是先听声音？', audio: 'script-rain-q1',
        options: [
          { label: '看雨珠赛跑', detail: '猜猜哪一颗会先滑到窗框。', value: '看雨珠的变化', feedback: '你注意到了细小的变化。两颗雨珠碰在一起，变成一颗更大的雨珠。', audio: 'script-rain-q1-see', pose: 'sit' },
          { label: '听滴答节奏', detail: '找找快一点和慢一点的声音。', value: '听雨点的节奏', feedback: '你听出了声音里的节奏。角色也跟着滴答声轻轻点起了头。', audio: 'script-rain-q1-hear', pose: 'play' },
        ],
      },
      {
        short: '屋里玩什么', prompt: '还要等一会儿才能出门。你想画一幅画，还是搭一座小屋？', audio: 'script-rain-q2',
        options: [
          { label: '画雨里的世界', detail: '把窗外的颜色和想象画下来。', value: '用画画记录想法', feedback: '你喜欢把看到的东西变成画。纸上很快长出了一片蓝绿色的雨林。', audio: 'script-rain-q2-draw', pose: 'sit' },
          { label: '搭一座小屋', detail: '用积木给怕雨的小动物做屋顶。', value: '用搭建解决问题', feedback: '你喜欢动手搭建。积木小屋有了斜屋顶，雨水会顺着两边流走。', audio: 'script-rain-q2-build', pose: 'attack' },
        ],
      },
      {
        short: '一声雷响', prompt: '突然响了一声雷，心里有点紧。你想数三下，还是请旁边的人陪你？', audio: 'script-rain-q3',
        options: [
          { label: '慢慢数三下', detail: '一边数，一边把呼吸放慢。', value: '自己数数让身体慢下来', feedback: '你找到了一种让自己慢下来的办法。数到三时，肩膀已经没有那么紧了。', audio: 'script-rain-q3-count', pose: 'sleep' },
          { label: '请你陪着我', detail: '把感觉说出来，一起等雷声过去。', value: '把需要说出来', feedback: '你愿意说出自己的需要。有人陪在旁边，雷声听起来也没有那么大了。', audio: 'script-rain-q3-company', pose: 'sit' },
        ],
      },
    ],
  },
  {
    id: 'star', title: '迷路的小星星', hint: '观察同理心、表达方式和喜欢的故事目的地。',
    intro: '一颗小星星落在草地上，忘记了回家的路。我们陪它找一找。', audio: 'script-star-intro',
    complete: '小星星找到方向了。我记住了你帮助别人和讲故事的方式。', completeAudio: 'script-star-complete',
    summary: answers => `星星故事里，你会${answers[0].value}，带路时会${answers[1].value}，最想去${answers[2].value}。`,
    steps: [
      {
        short: '先靠近它', prompt: '小星星缩成一团。你想先问它怎么了，还是先递给它一片暖暖的叶子？', audio: 'script-star-q1',
        options: [
          { label: '轻轻问一问', detail: '让它知道，我们愿意听它说。', value: '先问对方需要什么', feedback: '你先听对方怎么想。小星星说，它记得回家路上有一座会发光的塔。', audio: 'script-star-q1-ask', pose: 'sit' },
          { label: '先给一片叶子', detail: '不用马上说话，先让它暖和一点。', value: '先用行动让对方安心', feedback: '你先用行动表达关心。小星星暖和起来，慢慢想起了一点回家的线索。', audio: 'script-star-q1-leaf', pose: 'play' },
        ],
      },
      {
        short: '怎么带路', prompt: '远处有好几盏灯。你想画一张路线图，还是一路唱歌留下声音？', audio: 'script-star-q2',
        options: [
          { label: '画一张路线图', detail: '把看到的塔、树和河都标出来。', value: '用图画整理路线', feedback: '你把线索画成了清楚的路线。小星星一眼就认出了那座发光的塔。', audio: 'script-star-q2-map', pose: 'walk' },
          { label: '一路唱着歌', detail: '用声音记住走过的方向。', value: '用声音记住路线', feedback: '你把方向编进了歌里。每到一个路口，小星星都会跟着唱一句。', audio: 'script-star-q2-song', pose: 'play' },
        ],
      },
      {
        short: '故事的终点', prompt: '找到塔以后，你希望门后面是云朵游乐园，还是安静的星空家园？', audio: 'script-star-q3',
        options: [
          { label: '云朵游乐园', detail: '有会弹跳的云和长翅膀的滑梯。', value: '热闹奇妙的云朵乐园', feedback: '你喜欢热闹又奇妙的结尾。门一打开，云朵滑梯就从天空伸了下来。', audio: 'script-star-q3-cloud', pose: 'run' },
          { label: '星空里的家', detail: '有熟悉的灯，也有等它回来的朋友。', value: '温暖安静的星空家园', feedback: '你喜欢温暖安静的结尾。门后亮起一排小灯，朋友们都在等它回家。', audio: 'script-star-q3-home', pose: 'sit' },
        ],
      },
    ],
  },
  {
    id: 'gift', title: '给朋友的秘密礼物', hint: '观察创造兴趣、合作偏好和面对不同反应的方式。',
    intro: '朋友的特别日子快到了。我们准备一份不需要花钱的秘密礼物。', audio: 'script-gift-intro',
    complete: '礼物送到了。我记住了你创造东西和理解朋友感受的方式。', completeAudio: 'script-gift-complete',
    summary: answers => `礼物故事里，你想${answers[0].value}，准备时会${answers[1].value}，朋友反应不同时会${answers[2].value}。`,
    steps: [
      {
        short: '做什么礼物', prompt: '你想画一本小图册，还是做一个会转动的小机关？', audio: 'script-gift-q1',
        options: [
          { label: '画一本小图册', detail: '把一起做过的有趣事情画进去。', value: '画一本回忆图册', feedback: '你喜欢用图画保存回忆。第一页很快出现了两个人一起追纸飞机的样子。', audio: 'script-gift-q1-book', pose: 'sit' },
          { label: '做一个小机关', detail: '打开盒子时，会有一颗纸星星弹出来。', value: '做一个会动的小机关', feedback: '你喜欢让想法真的动起来。盒盖一开，纸星星就轻轻跳了出来。', audio: 'script-gift-q1-machine', pose: 'attack' },
        ],
      },
      {
        short: '怎么准备', prompt: '时间还够。你想自己安静做完，还是请伙伴一起帮忙？', audio: 'script-gift-q2',
        options: [
          { label: '我想自己做', detail: '慢慢做，把每个细节照顾好。', value: '自己专心完成', feedback: '你喜欢专心完成自己的想法。每个小细节都被认真放到了合适的位置。', audio: 'script-gift-q2-alone', pose: 'sit' },
          { label: '一起做更有趣', detail: '每个人负责一小部分，再拼在一起。', value: '和伙伴分工合作', feedback: '你喜欢让不同的点子碰在一起。礼物里多出了一段谁也没想到的小惊喜。', audio: 'script-gift-q2-together', pose: 'play' },
        ],
      },
      {
        short: '朋友的反应', prompt: '朋友收到礼物后没有马上笑。你想先问问感受，还是再解释一次自己的想法？', audio: 'script-gift-q3',
        options: [
          { label: '先问问感受', detail: '也许它正在想别的事情。', value: '先听朋友的真实感受', feedback: '你愿意先听一听。原来朋友太感动了，一时不知道该说什么。', audio: 'script-gift-q3-listen', pose: 'sit' },
          { label: '说说我的想法', detail: '告诉它，每个小部分是怎么做出来的。', value: '把自己的心意讲清楚', feedback: '你愿意把心意说明白。朋友听懂每个细节以后，小心地把礼物抱在怀里。', audio: 'script-gift-q3-explain', pose: 'play' },
        ],
      },
    ],
  },
  {
    id: 'bedtime', title: '睡前的小口袋', hint: '收集喜欢的故事类型、回忆方式和恢复心情的小办法。',
    intro: '睡觉前，我们有一个只能装三样东西的小口袋。来挑今晚要放进去的记忆。', audio: 'script-bedtime-intro',
    complete: '小口袋装好了。我记住了你喜欢的故事，还有让心情慢慢变好的办法。', completeAudio: 'script-bedtime-complete',
    summary: answers => `睡前故事里，你想留下${answers[0].value}，喜欢${answers[1].value}，不顺利时会${answers[2].value}。`,
    steps: [
      {
        short: '留下什么', prompt: '第一样东西，你想放进今天最好笑的声音，还是最好看的画面？', audio: 'script-bedtime-q1',
        options: [
          { label: '最好笑的声音', detail: '一句话、一段歌，或者奇怪的笑声。', value: '一个有趣的声音', feedback: '你喜欢用声音记住一天。口袋里传来一声小小的笑，角色也忍不住摇了摇尾巴。', audio: 'script-bedtime-q1-sound', pose: 'play' },
          { label: '最好看的画面', detail: '一种颜色、一个形状，或者一张熟悉的脸。', value: '一个清楚的画面', feedback: '你喜欢用画面保存记忆。口袋里亮起了一小块今天最喜欢的颜色。', audio: 'script-bedtime-q1-picture', pose: 'sit' },
        ],
      },
      {
        short: '今晚的故事', prompt: '第二样东西，你想装一个热闹冒险，还是一个安静的小故事？', audio: 'script-bedtime-q2',
        options: [
          { label: '热闹的冒险', detail: '会跑、会跳，还会遇见没见过的东西。', value: '会跑会跳的冒险故事', feedback: '你喜欢充满变化的故事。口袋里立刻跑过一队戴帽子的小动物。', audio: 'script-bedtime-q2-adventure', pose: 'run' },
          { label: '安静的小故事', detail: '慢慢讲，听完心里软软的。', value: '温柔安静的陪伴故事', feedback: '你喜欢慢慢展开的故事。口袋里亮起一盏不会刺眼的小灯。', audio: 'script-bedtime-q2-calm', pose: 'sleep' },
        ],
      },
      {
        short: '今天不顺利的事', prompt: '最后一样东西，放进一个没做好的小事情。你想明天再试，还是先请别人教一教？', audio: 'script-bedtime-q3',
        options: [
          { label: '明天再试一次', detail: '先休息，醒来以后换个办法。', value: '休息后再尝试', feedback: '你知道休息也是准备的一部分。小事情被放进明天的口袋，没有继续压在心上。', audio: 'script-bedtime-q3-retry', pose: 'sleep' },
          { label: '请别人教一教', detail: '找到会的人，一起看看卡在哪里。', value: '主动请别人帮忙', feedback: '你愿意让别人一起想办法。问题变成了一张可以共同查看的小地图。', audio: 'script-bedtime-q3-help', pose: 'sit' },
        ],
      },
    ],
  },
];

function readSceneId() {
  try {
    const saved = localStorage.getItem(SCENE_KEY) || DEFAULT_SCENE;
    return sceneById(saved).id;
  } catch {
    return DEFAULT_SCENE;
  }
}

function readRecipe() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECIPE_KEY) || 'null');
    if (!saved || typeof saved !== 'object' || !saved.parts) return null;
    ensureParams(saved);
    return saved;
  } catch {
    return null;
  }
}

function readCharacterCardOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHARACTER_CARD_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function characterCardFor(templateId) {
  const base = baseCharacterCard(templateId);
  return sanitizeCharacterCard(characterCardOverrides[templateId], base);
}

function storeCharacterCard(templateId, card) {
  const base = baseCharacterCard(templateId);
  const safe = sanitizeCharacterCard(card, base);
  characterCardOverrides = { ...characterCardOverrides, [templateId]: safe };
  try { localStorage.setItem(CHARACTER_CARD_KEY, JSON.stringify(characterCardOverrides)); } catch { /* keep this call's edits in memory */ }
  return safe;
}

function clearStoredCharacterCard(templateId) {
  const { [templateId]: removed, ...rest } = characterCardOverrides;
  characterCardOverrides = rest;
  try { localStorage.setItem(CHARACTER_CARD_KEY, JSON.stringify(characterCardOverrides)); } catch { /* keep reset in memory */ }
  return baseCharacterCard(templateId);
}

function cardValue(card, field) {
  const value = card?.[field.key];
  return field.list && Array.isArray(value) ? value.join('、') : String(value || '');
}

function cloneRecipe(source) {
  if (!source || typeof source !== 'object') return null;
  const copy = JSON.parse(JSON.stringify(source));
  ensureParams(copy);
  return copy;
}

function readCharacterLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHARACTER_LIBRARY_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

let profile = loadChildProfile();
let questionIndex = firstUnansweredProfileIndex(profile);
let initialized = false;
let active = false;
let scene;
let camera;
let renderer;
let face;
let recipe;
let animator;
let environment;
let sceneId = readSceneId();
let characterBase = { x: 0, y: -1.02, scale: 1.08 };
let resizeObserver;
let bubbleResizeObserver;
let bubbleMetrics = { width: 420, height: 82 };
let rebuildQueued = false;
let sceneFilter = '全部';
let templateFilter = '全部';
let activeTemplateId = '';
let templateCardsReady = false;
let editorCreating = false;
let editorTemplate = null;
let editorCardDraft = null;
let templateThumbnailRenderer;
let gazeReleaseTimer = 0;
let characterTapIndex = 0;
let characterTapAt = 0;
let actionResetTimer = 0;
let scriptAdvanceTimer = 0;
let activeScript = null;
let scriptStepIndex = 0;
let scriptAnswers = [];
let scriptBusy = false;
let characterCardOverrides = readCharacterCardOverrides();
let characterLibrary = readCharacterLibrary();
let customCharacterTemplates = Array.isArray(characterLibrary.custom) ? characterLibrary.custom : [];
let savedCharacterRecipes = characterLibrary.recipes && typeof characterLibrary.recipes === 'object' ? characterLibrary.recipes : {};
let characterNames = characterLibrary.names && typeof characterLibrary.names === 'object' ? characterLibrary.names : {};
if (Number(characterLibrary.voiceCatalogVersion || 0) < VOICE_CATALOG_VERSION) {
  for (const config of CHARACTER_TEMPLATES) {
    if (savedCharacterRecipes[config.id]) savedCharacterRecipes[config.id].voiceId = config.voice;
  }
  characterLibrary.voiceCatalogVersion = VOICE_CATALOG_VERSION;
  try {
    localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify({
      custom: customCharacterTemplates,
      recipes: savedCharacterRecipes,
      names: characterNames,
      voiceCatalogVersion: VOICE_CATALOG_VERSION,
    }));
  } catch { /* the migrated mapping remains active in memory */ }
}
const callState = {
  active: false,
  mode: 'normal',
  topic: 'free',
  template: null,
  card: null,
  messages: [],
  busy: false,
  micEnabled: false,
  micPaused: false,
  mediaStream: null,
  controller: null,
  recognition: null,
  recognitionRestartTimer: 0,
  growthIndex: 0,
  returnFocus: null,
};
const pointerRaycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const pointerHeadWorld = new THREE.Vector3();
const bubbleAnchorLocal = new THREE.Vector3(0, .8, 0);
const bubbleAnchorWorld = new THREE.Vector3();
const characterBounds = new THREE.Box3();
const reduceMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

const anim = {
  blink: true,
  gaze: true,
  talk: false,
  sway: true,
  breath: true,
  boil: true,
  boilSpeed: .62,
};

function put(part, key, value) {
  recipe.parts[part].params[key] = value;
}

function applySafeDefaults(target = recipe) {
  target.species = 'human';
  target.base ||= 'biped';
  target.media = 'watercolor';
  target.color = 'color';
  ensureParams(target);
  const P = target.parts;
  P.eyes.params.type = 'sparkle';
  P.eyes.params.type2 = 'none';
  P.eyes.params.scale = 1.45;
  P.eyes.params.scaleR = 1;
  P.eyes.params.sx = .5;
  P.eyes.params.glint = true;
  P.crest.params.style = 'sprout';
  P.crest.params.tone = 'skin';
  P.crest.params.len = 1.15;
  P.hair.params.style = 'bald';
  P.mouth.params.style = 'tiny';
  P.skull.params.shape = 'round';
  P.skull.params.shroud = false;
  P.skull.params.hollows = false;
  P.torso.params.shape = 'round';
  P.torso.params.wF = .52;
  P.torso.params.hF = .58;
  P.arms.params.style = 'stub';
  P.legs.params.style = 'stub';
  P.tail.params.style = 'none';
  Object.assign(P.extras.params, {
    tears: false,
    mark: 'none',
    mod: 'none',
    accidents: false,
    smudge: false,
    eraser: false,
    bandage: false,
    studs: false,
    blush: true,
  });
}

function makeInitialRecipe(seed = FACE_DEFAULT_SEED) {
  const next = newRecipe(seed);
  applySafeDefaults(next);
  return next;
}

function makeTemplateRecipe(config) {
  const stored = savedCharacterRecipes[config.id] || config.recipe;
  if (stored) {
    const saved = cloneRecipe(stored);
    saved.templateId = config.id;
    if (!VOICE_PRESETS[saved.voiceId]) saved.voiceId = VOICE_PRESETS[config.voice] ? config.voice : DEFAULT_VOICE;
    return saved;
  }
  const next = newRecipe(config.seed);
  next.species = config.species;
  next.base = config.base;
  next.media = 'watercolor';
  next.color = 'color';
  ensureParams(next);
  Object.assign(next.parts.extras.params, {
    mark: 'none', mod: 'none', tears: false, freckles: false, spots: false,
    whiskers: false, studs: false, bandage: false, blush: false, glasses: false,
    antenna: false, accidents: false, smudge: false, eraser: false,
  });
  Object.assign(next.parts.brows.params, { on: config.group === '人物' });
  Object.assign(next.parts.hair.params, { style: config.group === '人物' ? next.parts.hair.params.style : 'bald' });
  for (const slot of ['held', 'offhand', 'worn']) {
    if (next.parts[slot]?.params) next.parts[slot].params.family = 'none';
  }
  for (const [part, values] of Object.entries(config.parts || {})) {
    if (next.parts[part]?.params) Object.assign(next.parts[part].params, values);
  }
  next.voiceId = VOICE_PRESETS[config.voice] ? config.voice : DEFAULT_VOICE;
  next.templateId = config.id;
  return next;
}

function allCharacterTemplates() {
  return [...CHARACTER_TEMPLATES, ...customCharacterTemplates].map(config => ({
    ...config,
    name: characterNames[config.id] || config.name,
  }));
}

function characterTemplateById(id) {
  return allCharacterTemplates().find(item => item.id === id) || null;
}

function saveCharacterLibrary() {
  characterLibrary = { custom: customCharacterTemplates, recipes: savedCharacterRecipes, names: characterNames, voiceCatalogVersion: VOICE_CATALOG_VERSION };
  try { localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(characterLibrary)); } catch { /* library remains in memory */ }
}

class LabSpeaker {
  constructor() {
    this.activeId = VOICE_PRESETS[profile.voice] ? profile.voice : DEFAULT_VOICE;
    this.timer = 0;
    this.audio = null;
    this.controller = null;
    this.objectUrl = '';
    this.sequence = 0;
    this.finishCurrent = null;
  }

  choose(id) {
    if (!VOICE_PRESETS[id]) return;
    this.activeId = id;
    profile.voice = id;
    saveProfile();
    refreshControls();
  }

  cancel() {
    this.sequence += 1;
    clearTimeout(this.timer);
    this.controller?.abort();
    this.controller = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.finishCurrent?.();
    this.finishCurrent = null;
    this.audio = null;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    }
    anim.talk = false;
  }

  async playAudio(url, token, { revoke = false } = {}) {
    if (token !== this.sequence) throw new Error('audio_cancelled');
    const audio = new Audio(url);
    this.audio = audio;
    return new Promise((resolve, reject) => {
      let settled = false;
      const clean = () => {
        if (this.audio === audio) this.audio = null;
        if (revoke && this.objectUrl === url) {
          URL.revokeObjectURL(url);
          this.objectUrl = '';
        }
      };
      const finish = error => {
        if (settled) return;
        settled = true;
        clean();
        if (this.finishCurrent === finish) this.finishCurrent = null;
        clearTimeout(this.timer);
        anim.talk = false;
        if (error) reject(error);
        else resolve();
      };
      this.finishCurrent = finish;
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('audio_failed'));
      audio.play().catch(error => finish(error));
    });
  }

  async onlineWithCache(clean, preset, offlineKey, token) {
    let cachedTried = false;
    if (offlineKey && this.activeId === DEFAULT_VOICE) {
      cachedTried = true;
      try {
        document.documentElement.dataset.labAudioSource = 'cached-voice';
        await this.playAudio(offlineAudioPath(offlineKey), token);
        return;
      } catch {
        if (token !== this.sequence) return;
      }
    }

    try {
      this.controller = new AbortController();
      const timeout = window.setTimeout(() => this.controller?.abort(), 9000);
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice: this.activeId }),
        signal: this.controller.signal,
      });
      window.clearTimeout(timeout);
      this.controller = null;
      if (!response.ok) throw new Error(`tts_${response.status}`);
      const blob = await response.blob();
      if (blob.size < 1000) throw new Error('tts_empty');
      if (token !== this.sequence) return;
      this.objectUrl = URL.createObjectURL(blob);
      document.documentElement.dataset.labAudioSource = response.headers.get('X-TTS-Provider') || 'online';
      await this.playAudio(this.objectUrl, token, { revoke: true });
      return;
    } catch {
      this.controller = null;
      if (token !== this.sequence) return;
    }

    if (offlineKey && !cachedTried) {
      try {
        document.documentElement.dataset.labAudioSource = 'cached-voice';
        showStatus('在线角色声音暂时不可用，正在播放星仔离线缓存。');
        await this.playAudio(offlineAudioPath(offlineKey), token);
        return;
      } catch {
        if (token !== this.sequence) return;
      }
    }
    document.documentElement.dataset.labAudioSource = 'visual';
    clearTimeout(this.timer);
    anim.talk = false;
    showStatus('在线角色声音暂时不可用，文字气泡仍可继续使用。');
  }

  speak(text, { preview = false, offlineKey = '' } = {}) {
    const clean = String(text || '').trim().slice(0, 120);
    if (!clean) return;
    this.cancel();
    const token = this.sequence;
    setBubble(clean);
    const preset = VOICE_PRESETS[this.activeId] || VOICE_PRESETS.star;
    anim.talk = true;
    animator?.setFace('idle');
    const fallbackMs = Math.max(2400, clean.length * 260 / preset.rate);
    this.timer = window.setTimeout(() => { anim.talk = false; }, fallbackMs);

    if (preview && preset.preview) {
      document.documentElement.dataset.labAudioSource = 'preview';
      return this.playAudio(preset.preview, token).catch(() => {
        anim.talk = false;
        showStatus('内置试听暂时无法播放，可以继续调整其他选项。');
      });
    }
    return this.onlineWithCache(clean, preset, offlineKey, token);
  }
}

let speaker;

const APPEARANCE_QUESTIONS = [
  {
    field: 'learning',
    audio: 'question-learning',
    text: '你更容易用眼睛记住，还是用耳朵记住？',
    help: '没有标准答案，选更像你的那一个。',
    options: [
      {
        label: '我更会看',
        detail: '图画、颜色和形状最容易留在脑袋里。',
        value: '更擅长看',
        audio: 'feedback-learning-see',
        reason: '因为你更擅长看，它长出了一双亮亮的大眼睛。',
        apply() {
          put('eyes', 'type', 'sparkle'); put('eyes', 'type2', 'none'); put('eyes', 'scale', 2.08);
          put('eyes', 'scaleR', 1.04); put('crest', 'style', 'none');
        },
      },
      {
        label: '我更会听',
        detail: '声音、语气和别人说的话更容易记住。',
        value: '更擅长听',
        audio: 'feedback-learning-hear',
        reason: '因为你更擅长听，它有了豆豆眼和两只很大的软耳朵。',
        apply() {
          put('eyes', 'type', 'dot'); put('eyes', 'type2', 'none'); put('eyes', 'scale', .92);
          put('crest', 'style', 'floppy'); put('crest', 'tone', 'skin'); put('crest', 'len', 2.15); put('crest', 'spread', .78);
        },
      },
      {
        label: '看和听都喜欢',
        detail: '一边看一边听，两个线索放在一起。',
        value: '喜欢看和听一起出现',
        audio: 'feedback-learning-both',
        reason: '因为你喜欢看和听一起出现，它保留了圆眼睛，也长出一对圆耳朵。',
        apply() {
          put('eyes', 'type', 'saucer'); put('eyes', 'scale', 1.45);
          put('crest', 'style', 'bear'); put('crest', 'tone', 'skin'); put('crest', 'len', 1.3);
        },
      },
    ],
  },
  {
    field: 'explore',
    audio: 'question-explore',
    text: '到了一个没去过的地方，你通常会先做什么？',
    help: '这个回答会改变它走路和行动的样子。',
    options: [
      {
        label: '先试试看', detail: '边走边想，碰到问题再想办法。', value: '喜欢先尝试',
        audio: 'feedback-explore-try',
        reason: '你喜欢先试试看，所以它有了轻快的长腿。',
        apply() { put('legs', 'style', 'noodle'); put('legs', 'len', 1.25); put('torso', 'lean', -.09); },
      },
      {
        label: '先安静观察', detail: '看看周围，找到线索以后再行动。', value: '喜欢先观察',
        audio: 'feedback-explore-watch',
        reason: '你喜欢先观察，所以它会微微侧着头，把线索看清楚。',
        apply() { put('skull', 'turn', .28); put('torso', 'shape', 'tiny'); put('brows', 'on', true); },
      },
      {
        label: '找个伙伴一起', detail: '有人一起商量，会更安心也更有趣。', value: '喜欢结伴探索',
        audio: 'feedback-explore-together',
        reason: '你喜欢和伙伴一起，所以它长出可以牵住朋友的长长手臂。',
        apply() { put('arms', 'style', 'noodle'); put('arms', 'len', 1.45); put('torso', 'shape', 'round'); },
      },
    ],
  },
  {
    field: 'theme',
    audio: 'question-theme',
    text: '如果故事里多出一种东西，你最想要哪一种？',
    help: '它会把这个兴趣变成一个看得见的小记号。',
    options: [
      {
        label: '小动物', detail: '会说话的小猫、飞鸟和没见过的怪兽。', value: '动物和奇妙生物',
        audio: 'feedback-theme-animals',
        reason: '你喜欢小动物，所以它长出了胡须和一条会摇的尾巴。',
        apply() { put('tail', 'style', 'wag'); put('extras', 'whiskers', true); },
      },
      {
        label: '花草和森林', detail: '会发光的树、长脚的蘑菇和秘密花园。', value: '花草和自然',
        audio: 'feedback-theme-nature',
        reason: '你喜欢花草和森林，所以它的脸上多出了像小种子一样的雀斑。',
        apply() { put('extras', 'freckles', true); put('extras', 'blush', true); put('torso', 'pattern', 'belly'); },
      },
      {
        label: '音乐和声音', detail: '会唱歌的门、节奏小路和声音魔法。', value: '音乐和声音',
        audio: 'feedback-theme-music',
        reason: '你喜欢音乐，所以它身上的条纹像节拍一样一格一格排开。',
        apply() { put('torso', 'pattern', 'stripes'); put('mouth', 'style', 'open'); },
      },
      {
        label: '搭建和机关', detail: '积木城、转动的齿轮和可以自己设计的机器。', value: '搭建和机关',
        audio: 'feedback-theme-building',
        reason: '你喜欢搭建和机关，所以它有了方方的身体和装着点子的口袋。',
        apply() { put('torso', 'shape', 'square'); put('torso', 'pattern', 'pocket'); },
      },
    ],
  },
  {
    field: 'tone',
    audio: 'question-tone',
    text: '你希望它用什么感觉和你说话？',
    help: '选择以后会立刻试听一句。',
    options: [
      {
        label: '温柔一点', detail: '慢慢说，像有人在旁边陪着。', value: '温柔陪伴', voice: 'sprout',
        reason: '你喜欢温柔的语气，所以它会慢一点，把话说得轻轻的。',
        apply() { put('mouth', 'style', 'tiny'); },
      },
      {
        label: '活泼一点', detail: '语速快一些，听起来总有新点子。', value: '活泼有趣', voice: 'bubble',
        reason: '你喜欢活泼的语气，所以它有了一张歪歪笑的嘴。',
        apply() { put('mouth', 'style', 'smirk'); },
      },
      {
        label: '慢慢讲清楚', detail: '每句话都留一点时间，可以跟得上。', value: '缓慢清楚', voice: 'moss',
        reason: '你喜欢慢慢听清楚，所以它会把每句话讲得稳稳的。',
        apply() { put('mouth', 'style', 'wobble'); },
      },
      {
        label: '多问我问题', detail: '像好奇的朋友，一起把答案找出来。', value: '好奇提问', voice: 'star',
        reason: '你喜欢一起找答案，所以它会带着好奇的小门牙不断提问。',
        apply() { put('mouth', 'style', 'buckteeth'); },
      },
    ],
  },
  {
    field: 'interest',
    audio: 'question-interest',
    text: '最后告诉我，最近最喜欢做的一件事是什么？',
    help: '可以说一种游戏、一本书、一个爱好，或者最近一直在想的东西。',
    freeText: true,
  },
];

const [LEARNING_QUESTION, EXPLORE_QUESTION, THEME_QUESTION, TONE_QUESTION, INTEREST_QUESTION] = APPEARANCE_QUESTIONS;
const withStage = (question, stage, feedback) => ({ ...question, stage, feedback });
const memoryOption = (label, detail, value, audio, feedback) => ({ label, detail, value, audio, feedback });

const QUESTIONS = [
  {
    field: 'ageBand', stage: '基本认识', audio: 'question-age-band',
    text: '先告诉我，哪一段年龄更像你现在？',
    help: '只选年龄段，不需要姓名、生日、学校或住址。',
    feedback: '好，我会把后面的任务调到更合适的长度。',
    options: [
      memoryOption('5 到 6 岁', '问题短一点，一次只做一小步。', '5 到 6 岁', 'feedback-age-band', '好，我会把后面的任务调到更合适的长度。'),
      memoryOption('7 到 8 岁', '可以多给一点线索，也留出自己想办法的空间。', '7 到 8 岁', 'feedback-age-band', '好，我会把后面的任务调到更合适的长度。'),
      memoryOption('9 岁或更大', '可以试试更长的故事和更深一点的谜题。', '9 岁或更大', 'feedback-age-band', '好，我会把后面的任务调到更合适的长度。'),
    ],
  },
  withStage({
    ...LEARNING_QUESTION,
    options: [
      ...LEARNING_QUESTION.options,
      {
        label: '我更会动手', detail: '摸一摸、摆一摆、自己做过以后最容易记住。', value: '更擅长动手做',
        audio: 'feedback-learning-do',
        feedback: '我记住了。以后会多给你能动手试一试的任务。',
        reason: '因为你更擅长动手做，它有了灵活的手和装工具的小口袋。',
        apply() { put('arms', 'style', 'noodle'); put('arms', 'len', 1.16); put('torso', 'pattern', 'pocket'); },
      },
    ],
  }, '基本认识', '我记住了。以后会用你更容易理解的方式给出线索。'),
  {
    field: 'attention', stage: '基本认识', audio: 'question-attention',
    text: '做一件喜欢的事时，哪一种节奏更像你？',
    help: '这会决定关卡是一小段一小段，还是可以连续探索。',
    feedback: '我记住你的专注节奏了，关卡不会故意催你。',
    options: [
      memoryOption('一小段一小段', '做完一小步就看看新的变化。', '喜欢短回合和及时变化', 'feedback-attention', '我记住你的专注节奏了，关卡不会故意催你。'),
      memoryOption('可以专心很久', '遇到喜欢的东西，会一直研究下去。', '能长时间专注研究', 'feedback-attention', '我记住你的专注节奏了，关卡不会故意催你。'),
      memoryOption('动一动再回来', '坐一会儿、动一动，然后继续会更舒服。', '喜欢动静交替', 'feedback-attention', '我记住你的专注节奏了，关卡不会故意催你。'),
    ],
  },
  withStage(EXPLORE_QUESTION, '探索习惯', '我记住了。新世界打开时，会给你喜欢的起步方式。'),
  {
    field: 'challenge', stage: '探索习惯', audio: 'question-challenge',
    text: '如果第一次没有成功，你最希望接下来怎样？',
    help: '这会决定游戏怎样给提示、休息和第二次机会。',
    feedback: '好，碰到难题时，我会用你更舒服的方式陪你继续。',
    options: [
      memoryOption('换个办法再试', '保留目标，自己换一条路。', '愿意换个办法再尝试', 'feedback-challenge', '好，碰到难题时，我会用你更舒服的方式陪你继续。'),
      memoryOption('给我一个小提示', '先告诉我一条线索，答案还由我发现。', '需要时喜欢得到小提示', 'feedback-challenge', '好，碰到难题时，我会用你更舒服的方式陪你继续。'),
      memoryOption('先停一下', '休息一会儿，准备好再回来。', '需要时会休息后继续', 'feedback-challenge', '好，碰到难题时，我会用你更舒服的方式陪你继续。'),
    ],
  },
  {
    field: 'pace', stage: '探索习惯', audio: 'question-pace',
    text: '你喜欢故事用什么速度往前走？',
    help: '速度没有快慢好坏，选最舒服的。',
    feedback: '收到。以后每一页故事都会尽量跟着你的速度走。',
    options: [
      memoryOption('快点看到新变化', '选完以后，很快出现新的东西。', '喜欢快速变化', 'feedback-pace', '收到。以后每一页故事都会尽量跟着你的速度走。'),
      memoryOption('慢慢看清细节', '多留一点时间观察和想象。', '喜欢慢慢研究细节', 'feedback-pace', '收到。以后每一页故事都会尽量跟着你的速度走。'),
      memoryOption('让我自己决定', '有时快、有时慢，按当时的感觉。', '喜欢自己选择节奏', 'feedback-pace', '收到。以后每一页故事都会尽量跟着你的速度走。'),
    ],
  },
  {
    field: 'expression', stage: '表达与伙伴', audio: 'question-expression',
    text: '脑袋里有一个新想法时，你最喜欢怎样把它变出来？',
    help: '后面的任务会给你不同的表达出口。',
    feedback: '我记住你的表达方式了，不会只用一种办法问你答案。',
    options: [
      memoryOption('说给别人听', '一边说，一边把想法理清楚。', '喜欢用说话表达', 'feedback-expression', '我记住你的表达方式了，不会只用一种办法问你答案。'),
      memoryOption('画出来', '用颜色、形状和图画表达。', '喜欢用画画表达', 'feedback-expression', '我记住你的表达方式了，不会只用一种办法问你答案。'),
      memoryOption('演一演、动一动', '用表情、动作和声音演出来。', '喜欢用动作表演表达', 'feedback-expression', '我记住你的表达方式了，不会只用一种办法问你答案。'),
      memoryOption('搭出来', '用积木、纸片或小机关做出来。', '喜欢用搭建表达', 'feedback-expression', '我记住你的表达方式了，不会只用一种办法问你答案。'),
    ],
  },
  {
    field: 'social', stage: '表达与伙伴', audio: 'question-social',
    text: '玩一个新游戏时，哪一种伙伴数量最舒服？',
    help: '以后可以据此安排独立任务、双人伙伴或小队故事。',
    feedback: '我记住了，伙伴不会一下子变得太多或太少。',
    options: [
      memoryOption('我自己先玩', '可以自己决定，不用马上和别人配合。', '喜欢独立探索', 'feedback-social', '我记住了，伙伴不会一下子变得太多或太少。'),
      memoryOption('和一个伙伴', '两个人容易商量，也能互相帮助。', '喜欢一个固定伙伴', 'feedback-social', '我记住了，伙伴不会一下子变得太多或太少。'),
      memoryOption('和一个小队', '几个人分工，每个人都有自己的本领。', '喜欢小队合作', 'feedback-social', '我记住了，伙伴不会一下子变得太多或太少。'),
    ],
  },
  {
    field: 'role', stage: '表达与伙伴', audio: 'question-role',
    text: '如果你走进故事里，最想成为哪一种角色？',
    help: '它会成为以后任务里经常叫你的角色称号。',
    feedback: '这个称号很好。以后世界遇到问题，会想起你的这项本领。',
    options: [
      memoryOption('小小探险家', '先去没走过的地方寻找线索。', '小小探险家', 'feedback-role', '这个称号很好。以后世界遇到问题，会想起你的这项本领。'),
      memoryOption('点子发明家', '把普通东西变成新工具。', '点子发明家', 'feedback-role', '这个称号很好。以后世界遇到问题，会想起你的这项本领。'),
      memoryOption('暖心帮助者', '发现谁需要陪伴和帮助。', '暖心帮助者', 'feedback-role', '这个称号很好。以后世界遇到问题，会想起你的这项本领。'),
      memoryOption('奇妙故事家', '把发现变成让人想听下去的故事。', '奇妙故事家', 'feedback-role', '这个称号很好。以后世界遇到问题，会想起你的这项本领。'),
    ],
  },
  withStage({
    ...THEME_QUESTION,
    options: [
      ...THEME_QUESTION.options,
      {
        label: '宇宙和科学', detail: '行星、机器人、实验和没有答案的新问题。', value: '宇宙和科学',
        audio: 'feedback-theme-space', feedback: '星空和实验已经被记进兴趣地图里了。',
        reason: '你喜欢宇宙和科学，所以它头顶多出了一根寻找星星的天线。',
        apply() { put('extras', 'antenna', true); put('eyes', 'glint', true); },
      },
      {
        label: '神秘和幻想', detail: '藏宝图、魔法门和需要推理的秘密。', value: '神秘幻想和推理',
        audio: 'feedback-theme-mystery', feedback: '神秘线索已经被记进兴趣地图里了。',
        reason: '你喜欢神秘和幻想，所以它的眼睛变得不一样，像在同时看两个世界。',
        apply() { put('eyes', 'type2', 'sparkle'); put('eyes', 'scaleR', .82); put('skull', 'shape', 'wonky'); },
      },
    ],
  }, '兴趣地图', '我记住了。后面的世界会优先长出你喜欢的主题。'),
  {
    field: 'playStyle', stage: '兴趣地图', audio: 'question-play-style',
    text: '一个世界打开以后，你最想在里面做什么？',
    help: '这会决定以后更常出现哪一种核心任务。',
    feedback: '好，下一次世界长出来时，会多放一些你喜欢的玩法。',
    options: [
      memoryOption('收集和完成图鉴', '找到散落的东西，把它们排进收藏页。', '喜欢收集和完成图鉴', 'feedback-play-style', '好，下一次世界长出来时，会多放一些你喜欢的玩法。'),
      memoryOption('到处自由探索', '没有固定路线，先去好奇的地方。', '喜欢自由探索', 'feedback-play-style', '好，下一次世界长出来时，会多放一些你喜欢的玩法。'),
      memoryOption('创造新东西', '画、搭、组合，让世界发生变化。', '喜欢创造和搭建', 'feedback-play-style', '好，下一次世界长出来时，会多放一些你喜欢的玩法。'),
      memoryOption('解谜和讲故事', '把线索连起来，发现事情为什么发生。', '喜欢解谜和故事', 'feedback-play-style', '好，下一次世界长出来时，会多放一些你喜欢的玩法。'),
    ],
  },
  {
    field: 'storyTone', stage: '兴趣地图', audio: 'question-story-tone',
    text: '你最想走进哪一种感觉的故事？',
    help: '主题可以一样，但故事的感觉可以完全不同。',
    feedback: '故事的颜色也记住了，结尾会更像你喜欢的感觉。',
    options: [
      memoryOption('热闹冒险', '变化快、有任务，也会遇见惊喜。', '喜欢热闹冒险', 'feedback-story-tone', '故事的颜色也记住了，结尾会更像你喜欢的感觉。'),
      memoryOption('安静温暖', '慢一点，有陪伴，也有舒服的结尾。', '喜欢安静温暖', 'feedback-story-tone', '故事的颜色也记住了，结尾会更像你喜欢的感觉。'),
      memoryOption('奇怪好笑', '角色有点笨拙，常常冒出怪点子。', '喜欢奇怪好笑', 'feedback-story-tone', '故事的颜色也记住了，结尾会更像你喜欢的感觉。'),
      memoryOption('神秘推理', '先不知道答案，要沿着线索慢慢猜。', '喜欢神秘推理', 'feedback-story-tone', '故事的颜色也记住了，结尾会更像你喜欢的感觉。'),
    ],
  },
  withStage(TONE_QUESTION, '陪伴方式', '我听见了。以后会尽量用你舒服的感觉和你说话。'),
  {
    field: 'emotion', stage: '陪伴方式', audio: 'question-emotion',
    text: '如果心里有点不舒服，哪一种方式最可能帮到你？',
    help: '可以选最常用的一种，以后也可以随时改变。',
    feedback: '我记住了。需要的时候，会先给你喜欢的缓冲方式。',
    options: [
      memoryOption('让我安静一会儿', '先不追问，等我准备好。', '需要安静独处一下', 'feedback-emotion', '我记住了。需要的时候，会先给你喜欢的缓冲方式。'),
      memoryOption('有人陪着我', '不用马上解决，先在旁边陪着。', '需要熟悉的陪伴', 'feedback-emotion', '我记住了。需要的时候，会先给你喜欢的缓冲方式。'),
      memoryOption('动一动身体', '走走、跳跳，让身体先松下来。', '喜欢通过活动调节心情', 'feedback-emotion', '我记住了。需要的时候，会先给你喜欢的缓冲方式。'),
      memoryOption('笑一笑、想象一下', '用一个怪故事把心情轻轻挪开。', '喜欢用幽默和想象调节心情', 'feedback-emotion', '我记住了。需要的时候，会先给你喜欢的缓冲方式。'),
    ],
  },
  {
    field: 'encouragement', stage: '陪伴方式', audio: 'question-encouragement',
    text: '完成一个难任务以后，你最想听见哪一种鼓励？',
    help: '我们会表扬过程，也不会把你和别的孩子比较。',
    feedback: '好，我会记得用这种方式看到你的努力。',
    options: [
      memoryOption('看见我的努力', '告诉我哪一步认真尝试过。', '喜欢被看见努力的过程', 'feedback-encouragement', '好，我会记得用这种方式看到你的努力。'),
      memoryOption('给我下一条线索', '不用说太多，让我继续发现。', '喜欢得到下一条小提示', 'feedback-encouragement', '好，我会记得用这种方式看到你的努力。'),
      memoryOption('让我选下一步', '把方向交给我，我来决定。', '喜欢继续拥有选择权', 'feedback-encouragement', '好，我会记得用这种方式看到你的努力。'),
    ],
  },
  {
    field: 'sensitivities', stage: '陪伴方式', audio: 'question-sensitivities',
    text: '游戏里有没有哪一种东西，你更希望少一点？',
    help: '这是为了让体验更舒服，不代表害怕或做得不够好。',
    feedback: '谢谢你告诉我。后面的世界会尽量避开让你不舒服的方式。',
    options: [
      memoryOption('很响的声音', '声音柔和一点，不突然变得很大。', '希望避开突然的大声音', 'feedback-sensitivities', '谢谢你告诉我。后面的世界会尽量避开让你不舒服的方式。'),
      memoryOption('吓人的画面', '少一点黑暗、追赶或突然出现的东西。', '希望避开吓人的画面', 'feedback-sensitivities', '谢谢你告诉我。后面的世界会尽量避开让你不舒服的方式。'),
      memoryOption('倒计时和比赛', '不催着完成，也不和别人比较快慢。', '希望避开倒计时和竞争', 'feedback-sensitivities', '谢谢你告诉我。后面的世界会尽量避开让你不舒服的方式。'),
      memoryOption('目前没有', '现在没有特别想避开的，也可以以后再改。', '目前没有特别需要避开的内容', 'feedback-sensitivities', '谢谢你告诉我。以后想改变，也可以随时重新选择。'),
    ],
  },
  withStage(INTEREST_QUESTION, '最近着迷', '我会把这件最近喜欢的事，变成以后世界里的灵感种子。'),
];

function initScene() {
  const stage = $('lab-stage');
  const displayPixelRatio = Math.min(2.5, Math.max(1.5, devicePixelRatio || 1));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  camera = new THREE.OrthographicCamera(-1, 1, 1.45, -1.45, .1, 100);
  camera.position.set(0, -.18, 10);
  camera.lookAt(0, -.18, 0);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(displayPixelRatio);
  renderer.domElement.style.imageRendering = 'auto';
  document.documentElement.dataset.labTextureScale = String(U);
  document.documentElement.dataset.labPixelRatio = String(displayPixelRatio);
  stage.appendChild(renderer.domElement);
  addPaper(scene, 1.5);
  environment = createSceneBackdrop(sceneId);
  scene.add(environment);

  recipe = readRecipe() || makeInitialRecipe();
  activeTemplateId = allCharacterTemplates().some(item => item.id === recipe.templateId) ? recipe.templateId : '';
  animator = createAnimator(() => face, anim);
  buildNow();

  const resize = () => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    const aspect = width / height;
    const halfH = Math.max(1.45, 1.12 / aspect);
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const bubble = $('lab-bubble');
  bubbleResizeObserver = new ResizeObserver(() => {
    bubbleMetrics = { width: bubble.offsetWidth || 420, height: bubble.offsetHeight || 82 };
    positionBubble();
  });
  bubbleResizeObserver.observe(bubble);
  resize();
}

function applyCharacterPlacement(t = 0) {
  if (!face) return;
  const config = sceneById(sceneId);
  let x = 0;
  let y = 0;
  let rotation = 0;
  if (!reduceMotionQuery?.matches) {
    if (config.motion === 'zero-g') {
      x = Math.sin(t * .52) * .09;
      y = Math.sin(t * .78) * .13;
      rotation = Math.sin(t * .42) * .055;
    } else if (config.motion === 'float') {
      x = Math.sin(t * .38) * .035;
      y = Math.sin(t * .68) * .075;
      rotation = Math.sin(t * .46) * .018;
    } else if (config.motion === 'moon-hop') {
      y = Math.max(0, Math.sin(t * 1.15)) * .055;
    } else if (config.motion === 'snow') {
      y = Math.sin(t * .5) * .025;
    } else if (config.motion === 'train') {
      y = Math.sin(t * 4.8) * .007;
    } else if (config.motion === 'pocket') {
      x = Math.sin(t * .7) * .025;
      rotation = Math.sin(t * .7) * .025;
    } else if (config.motion === 'breeze') {
      rotation = Math.sin(t * .52) * .009;
    } else if (config.motion === 'stage') {
      y = Math.abs(Math.sin(t * 1.25)) * .014;
    }
  }
  face.group.position.set(characterBase.x + x, characterBase.y + y, 0);
  face.group.rotation.z = rotation;
  face.group.scale.setScalar(characterBase.scale);
}

function updateBubbleAnchor() {
  if (!face) return;
  face.group.updateMatrixWorld(true);
  characterBounds.setFromObject(face.group);
  bubbleAnchorWorld.set(
    (characterBounds.min.x + characterBounds.max.x) * .5,
    characterBounds.max.y,
    0,
  );
  face.group.worldToLocal(bubbleAnchorWorld);
  bubbleAnchorLocal.copy(bubbleAnchorWorld);
  bubbleAnchorLocal.y += .035;
}

function positionBubble() {
  if (!face || !camera) return;
  const bubble = $('lab-bubble');
  const preview = document.querySelector('.lab-preview');
  const rect = preview?.getBoundingClientRect();
  if (!bubble || !rect?.width || !rect?.height) return;
  face.group.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  bubbleAnchorWorld.copy(bubbleAnchorLocal);
  face.group.localToWorld(bubbleAnchorWorld);
  bubbleAnchorWorld.project(camera);
  const rawX = (bubbleAnchorWorld.x * .5 + .5) * rect.width;
  const rawY = (-bubbleAnchorWorld.y * .5 + .5) * rect.height;
  const halfWidth = Math.max(56, Math.min(bubbleMetrics.width * .5, rect.width * .5 - 11));
  const x = Math.max(halfWidth, Math.min(rect.width - halfWidth, rawX));
  const minY = Math.min(rect.height - 8, bubbleMetrics.height + 22);
  const y = Math.max(minY, Math.min(rect.height - 8, rawY));
  bubble.style.setProperty('--bubble-x', `${x.toFixed(1)}px`);
  bubble.style.setProperty('--bubble-y', `${y.toFixed(1)}px`);
}

function setEnvironment(id, { speak = true } = {}) {
  const config = sceneById(id);
  sceneId = config.id;
  try { localStorage.setItem(SCENE_KEY, sceneId); } catch { /* scene remains in memory */ }
  if (scene) {
    if (environment) {
      scene.remove(environment);
      environment.userData.dispose?.();
    }
    environment = createSceneBackdrop(sceneId);
    scene.add(environment);
  }
  if (face) {
    characterBase = {
      x: 0,
      y: config.floorY + face.F.B.floorY / U,
      scale: config.scale,
    };
    applyCharacterPlacement(0);
  }
  refreshSceneControls();
  refreshCharacterEditorAppearance();
  if (speak && speaker) speaker.speak(config.line, { offlineKey: `scene-${config.id}` });
}

function buildNow() {
  if (face) { scene.remove(face.group); face.dispose(); }
  face = buildCharacter(recipe);
  scene.add(face.group);
  const config = sceneById(sceneId);
  characterBase = { x: 0, y: config.floorY + face.F.B.floorY / U, scale: config.scale };
  applyCharacterPlacement(0);
  updateBubbleAnchor();
  positionBubble();
  try { localStorage.setItem(RECIPE_KEY, JSON.stringify(recipe)); } catch { /* recipe remains in memory */ }
  refreshControls();
}

function rebuild() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    buildNow();
  });
}

function animationLoop(now) {
  if (!active) return;
  const t = now / 1000;
  const dt = Math.min(.05, animationLoop.last ? (now - animationLoop.last) / 1000 : .016);
  animationLoop.last = now;
  animator.update(t, dt);
  applyCharacterPlacement(t);
  positionBubble();
  renderer.render(scene, camera);
}

function setBubble(text) {
  const bubble = $('lab-bubble');
  if (!bubble) return;
  const clean = String(text || '我在认真听。').trim();
  const now = performance.now();
  if (bubble.dataset.text === clean && now - (setBubble.lastAt || 0) < 220) return;
  setBubble.lastAt = now;
  bubble.dataset.text = clean;
  const accessible = $('lab-bubble-a11y');
  if (accessible) accessible.textContent = clean;
  window.dispatchEvent(new CustomEvent('mengmeng:bubble-text', { detail: { key: 'lab', text: clean } }));
}

function showStatus(text) {
  const status = $('lab-status');
  if (!status) return;
  status.textContent = text;
  clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { status.textContent = ''; }, 3200);
}

function saveProfile() {
  try { profile = saveChildProfile(profile); } catch { /* profile remains in memory */ }
  refreshProfile();
}

function refreshProfile() {
  const groups = summarizeProfileGroups(profile);
  for (const [key, value] of Object.entries(groups)) {
    const target = document.querySelector(`[data-profile-group="${key}"]`);
    if (target) target.textContent = value;
  }
  const scriptSummary = document.querySelector('[data-profile="scriptSummary"]');
  if (scriptSummary) scriptSummary.textContent = profile.scriptSummary || '还没有互动记录';
  const completion = profileCompletion(profile);
  if ($('profile-count')) $('profile-count').textContent = `${completion.answered} / ${completion.total}`;
}

function refreshControls() {
  if (!recipe) return;
  document.querySelectorAll('.option-row[data-part]').forEach(row => {
    const current = recipe.parts[row.dataset.part]?.params?.[row.dataset.key];
    row.querySelectorAll('[data-value]').forEach(button => {
      const selected = String(current) === button.dataset.value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  });
  document.querySelectorAll('[data-base]').forEach(button => {
    const selected = button.dataset.base === recipe.base;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('[data-range-part]').forEach(input => {
    const value = recipe.parts[input.dataset.rangePart]?.params?.[input.dataset.rangeKey];
    if (Number.isFinite(value)) {
      input.value = value;
      const output = document.getElementById(`${input.id}-value`);
      if (output) output.textContent = Number(value).toFixed(2);
    }
  });
  document.querySelectorAll('[data-voice]').forEach(button => {
    const selected = button.dataset.voice === speaker?.activeId;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  refreshSceneControls();
  refreshTemplateControls();
}

function refreshSceneControls() {
  document.querySelectorAll('[data-scene-id]').forEach(button => {
    const selected = button.dataset.sceneId === sceneId;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  refreshCharacterEditorAppearance();
}

function renderSceneCards() {
  const grid = $('scene-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const items = sceneFilter === '全部'
    ? LAB_SCENES
    : LAB_SCENES.filter(item => item.group === sceneFilter);
  for (const config of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scene-card';
    button.dataset.sceneId = config.id;
    const canvas = document.createElement('canvas');
    canvas.width = 260;
    canvas.height = 160;
    canvas.setAttribute('aria-hidden', 'true');
    const title = document.createElement('b');
    title.textContent = config.name;
    const hint = document.createElement('span');
    hint.textContent = config.hint;
    button.append(canvas, title, hint);
    button.addEventListener('click', () => setEnvironment(config.id));
    grid.appendChild(button);
    paintSceneThumbnail(canvas, config.id);
  }
  refreshSceneControls();
}

function initScenePicker() {
  const groups = $('scene-groups');
  for (const name of SCENE_GROUPS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name === '全部' ? `全部 ${LAB_SCENES.length}` : name;
    button.classList.toggle('selected', name === sceneFilter);
    button.setAttribute('aria-pressed', String(name === sceneFilter));
    button.addEventListener('click', () => {
      sceneFilter = name;
      groups.querySelectorAll('button').forEach(item => {
        const selected = item === button;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      renderSceneCards();
    });
    groups.appendChild(button);
  }
  renderSceneCards();
}

function paintTemplateThumbnail(canvas, config) {
  templateThumbnailRenderer ||= new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  templateThumbnailRenderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  templateThumbnailRenderer.setPixelRatio(1);
  templateThumbnailRenderer.setSize(canvas.width, canvas.height, false);
  templateThumbnailRenderer.setClearColor(PAPER, 1);

  const previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(PAPER);
  const aspect = canvas.width / canvas.height;
  const previewCamera = new THREE.OrthographicCamera(-.8 * aspect, .8 * aspect, .8, -.8, .1, 100);
  previewCamera.position.set(0, -.05, 10);
  previewCamera.lookAt(0, -.05, 0);
  const previewFace = buildCharacter(makeTemplateRecipe(config));
  previewFace.group.position.set(0, -.59 + previewFace.F.B.floorY / U, 0);
  previewFace.group.scale.setScalar(config.base === 'quad' ? 1.02 : .95);
  previewScene.add(previewFace.group);
  templateThumbnailRenderer.render(previewScene, previewCamera);

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(templateThumbnailRenderer.domElement, 0, 0, canvas.width, canvas.height);
  previewFace.dispose();
}

function refreshTemplateControls() {
  document.querySelectorAll('.template-card[data-template-id]').forEach(card => {
    const selected = card.dataset.templateId === activeTemplateId;
    card.classList.toggle('selected', selected);
    card.querySelector('.template-card-main')?.setAttribute('aria-pressed', String(selected));
  });
}

function applyTemplate(config, { speak = true } = {}) {
  recipe = makeTemplateRecipe(config);
  activeTemplateId = config.id;
  editorCreating = false;
  editorTemplate = characterTemplateById(config.id) || config;
  speaker.choose(VOICE_PRESETS[recipe.voiceId] ? recipe.voiceId : DEFAULT_VOICE);
  if (recipe.sceneId) setEnvironment(recipe.sceneId, { speak: false });
  rebuild();
  refreshTemplateControls();
  renderCharacterEditor(editorTemplate);
  refreshEditorGate();
  $('recipe-summary').textContent = `正在编辑“${editorTemplate.name}”。修改后请保存。`;
  if (speak) speaker.speak(characterCardFor(config.id).greeting, { offlineKey: `template-${config.id}` });
  animator?.setPose('play');
  window.setTimeout(() => animator?.setPose('idle'), 1050);
  showStatus(`已经选中${editorTemplate.name}。`);
  void playUISFX('complete', { volume: 0.14 });
}

function pointGazeAt(clientX, clientY, { releaseAfter = 0 } = {}) {
  if (!animator || !face || reduceMotionQuery?.matches) return;
  const preview = document.querySelector('.lab-preview');
  const rect = preview?.getBoundingClientRect();
  if (!rect?.width || !rect?.height) return;
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  face.headGroup.getWorldPosition(pointerHeadWorld);
  pointerHeadWorld.project(camera);
  const headX = rect.left + (pointerHeadWorld.x * .5 + .5) * rect.width;
  const headY = rect.top + (-pointerHeadWorld.y * .5 + .5) * rect.height;
  const x = (clientX - headX) / (rect.width * .34);
  const y = (headY - clientY) / (rect.height * .3);
  animator.setGaze(x, y);
  document.documentElement.dataset.labGaze = `${Math.max(-1, Math.min(1, x)).toFixed(2)},${Math.max(-1, Math.min(1, y)).toFixed(2)}`;
  clearTimeout(gazeReleaseTimer);
  if (releaseAfter > 0) {
    gazeReleaseTimer = window.setTimeout(() => {
      animator?.clearGaze();
      delete document.documentElement.dataset.labGaze;
    }, releaseAfter);
  }
}

function clearPointerGaze() {
  clearTimeout(gazeReleaseTimer);
  animator?.clearGaze();
  delete document.documentElement.dataset.labGaze;
}

function hitsCharacter(event) {
  if (!face || !renderer) return false;
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  pointerRaycaster.setFromCamera(pointerNdc, camera);
  return pointerRaycaster.intersectObjects(face.group.children, true).length > 0;
}

function respondToCharacterTap(event) {
  const now = performance.now();
  if (now - characterTapAt < 850) return;
  characterTapAt = now;
  trackAnalytics('lab_character_tap', { depth: 2 });
  const feedback = [
    '你碰到我啦，我正在看着你。',
    '我在这里。你想先帮我改哪里？',
    '嘿，我听见你的点击啦。',
    '我又看见你啦。',
  ];
  const index = characterTapIndex % feedback.length;
  characterTapIndex += 1;
  pointGazeAt(event.clientX, event.clientY, { releaseAfter: 1300 });
  animator.setFace('idle');
  animator.setPose('play');
  speaker.speak(feedback[index], { offlineKey: `action-tap-${index}` });
  void playUISFX('reaction', { volume: 0.13 });
  window.setTimeout(() => animator?.setPose('idle'), 1150);
}

function skipLabSpeech() {
  speaker?.cancel();
  window.dispatchEvent(new CustomEvent('mengmeng:bubble-skip', { detail: { key: 'lab' } }));
  anim.talk = false;
  animator?.setFace('idle');
  animator?.setPose('idle');
  if (callState.active && !callState.busy) {
    if (callState.micEnabled && !callState.micPaused) {
      setCharacterCallStatus('listening', `${callState.template.name}正在听`);
      scheduleCharacterCallRecognition(120);
    } else {
      setCharacterCallStatus(callState.micPaused ? 'paused' : 'permission', callState.micPaused ? '持续聆听已暂停' : '点麦克风开启持续聆听');
    }
  }
  void playUISFX('skip-next', { volume: 0.12 });
}

function initCharacterInteraction() {
  const preview = document.querySelector('.lab-preview');
  const canvas = renderer.domElement;
  preview.addEventListener('pointermove', event => {
    pointGazeAt(event.clientX, event.clientY);
    if (event.target === canvas) canvas.classList.toggle('over-character', hitsCharacter(event));
  }, { passive: true });
  preview.addEventListener('pointerdown', event => {
    pointGazeAt(event.clientX, event.clientY, { releaseAfter: event.pointerType === 'mouse' ? 0 : 1200 });
  }, { passive: true });
  preview.addEventListener('pointerleave', clearPointerGaze, { passive: true });
  canvas.addEventListener('click', event => {
    if (hitsCharacter(event)) respondToCharacterTap(event);
  });
  const bubble = $('lab-bubble');
  bubble.addEventListener('click', event => {
    event.stopPropagation();
    skipLabSpeech();
  });
  bubble.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    skipLabSpeech();
  });
}

function renderTemplateCards() {
  const grid = $('template-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const templates = allCharacterTemplates();
  const items = templateFilter === '全部'
    ? templates
    : templates.filter(item => item.group === templateFilter);
  for (const config of items) {
    const article = document.createElement('article');
    article.className = 'template-card';
    article.dataset.templateId = config.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-card-main';
    button.setAttribute('aria-label', `查看并套用${config.name}：${config.hint}`);
    const canvas = document.createElement('canvas');
    canvas.width = 260;
    canvas.height = 176;
    canvas.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = config.name;
    const hint = document.createElement('small');
    hint.textContent = config.hint;
    copy.append(title, hint);
    button.append(canvas, copy);
    const callButton = document.createElement('button');
    callButton.type = 'button';
    callButton.className = 'template-card-call';
    callButton.textContent = `呼叫${config.name}`;
    callButton.setAttribute('aria-label', `呼叫${config.name}开始视频通话`);
    button.addEventListener('click', () => {
      applyTemplate(config);
      scrollEditorForMobile();
    });
    callButton.addEventListener('click', () => startCharacterCall(config));
    article.append(button, callButton);
    grid.appendChild(article);
    paintTemplateThumbnail(canvas, config);
  }
  templateCardsReady = true;
  refreshTemplateControls();
  const selectedTemplate = characterTemplateById(activeTemplateId);
  if (selectedTemplate) renderCharacterEditor(selectedTemplate);
}

function scrollEditorForMobile() {
  if (!matchMedia('(max-width: 860px)').matches) return;
  requestAnimationFrame(() => {
    const layout = document.querySelector('.lab-layout');
    const preview = document.querySelector('.lab-preview');
    document.querySelector('.character-editor-pane')?.scrollIntoView?.({ block: 'start' });
    requestAnimationFrame(() => layout?.scrollBy({ top: -(preview?.offsetHeight || 0), behavior: 'instant' }));
  });
}

function initTemplatePicker() {
  const groups = $('template-groups');
  for (const name of TEMPLATE_GROUPS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.templateGroup = name;
    button.textContent = name === '全部' ? `全部 ${allCharacterTemplates().length}` : name;
    button.classList.toggle('selected', name === templateFilter);
    button.setAttribute('aria-pressed', String(name === templateFilter));
    button.addEventListener('click', () => {
      templateFilter = name;
      groups.querySelectorAll('button').forEach(item => {
        const selected = item === button;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      renderTemplateCards();
    });
    groups.appendChild(button);
  }
}

function renderTemplateDetail(config) {
  if (!config || (activeTemplateId && config.id !== activeTemplateId)) return;
  renderCharacterEditor(config);
}

function refreshEditorGate() {
  const ready = editorCreating || Boolean(activeTemplateId);
  document.querySelectorAll('[data-lab-tab]').forEach(button => {
    if (button.dataset.labTab !== 'templates') button.disabled = !ready;
  });
  if ($('copy-recipe')) $('copy-recipe').disabled = !ready;
}

function setEditorSelect(id, value) {
  const select = $(id);
  if (!select) return;
  const next = String(value || '');
  if ([...select.options].some(option => option.value === next)) select.value = next;
}

function refreshCharacterEditorAppearance() {
  if (!recipe || $('character-editor-form')?.hidden) return;
  setEditorSelect('character-editor-species', recipe.species);
  setEditorSelect('character-editor-base', recipe.base);
  setEditorSelect('character-editor-eyes', recipe.parts.eyes.params.type);
  setEditorSelect('character-editor-crest', recipe.parts.crest.params.style);
  setEditorSelect('character-editor-mouth', recipe.parts.mouth.params.style);
  setEditorSelect('character-editor-skull', recipe.parts.skull.params.shape);
  setEditorSelect('character-editor-torso', recipe.parts.torso.params.shape);
  setEditorSelect('character-editor-arms', recipe.parts.arms.params.style);
  setEditorSelect('character-editor-tail', recipe.parts.tail.params.style);
  setEditorSelect('character-editor-voice', speaker?.activeId || DEFAULT_VOICE);
  setEditorSelect('character-editor-scene', sceneId);
}

function renderCharacterEditor(config, { creating = editorCreating } = {}) {
  const form = $('character-editor-form');
  if (!form) return;
  editorCreating = creating;
  editorTemplate = config || null;
  $('character-editor-empty').hidden = true;
  form.hidden = false;
  $('character-editor-title').textContent = creating ? '创建新角色' : config.name;
  $('character-editor-name').value = creating ? '我的新角色' : config.name;
  editorCardDraft = creating ? baseCharacterCard('bean-dog') : characterCardFor(config.id);
  const fields = $('character-card-fields');
  fields.innerHTML = '';
  for (const field of CHARACTER_CARD_FIELDS) {
    const label = document.createElement('label');
    label.textContent = field.label;
    const input = document.createElement(field.max > 48 ? 'textarea' : 'input');
    if (input instanceof HTMLTextAreaElement) input.rows = field.max > 100 ? 3 : 2;
    input.maxLength = field.list ? field.max * 5 + 4 : field.max;
    input.dataset.cardField = field.key;
    input.dataset.cardList = String(Boolean(field.list));
    input.value = cardValue(editorCardDraft, field);
    label.appendChild(input);
    fields.appendChild(label);
  }
  $('character-editor-call').disabled = creating;
  $('character-editor-reset').hidden = creating || Boolean(config?.id?.startsWith('custom-'));
  refreshCharacterEditorAppearance();
}

function renderVoiceOptions() {
  const grid = $('voice-options');
  if (!grid) return;
  grid.innerHTML = '';
  for (const [id, preset] of Object.entries(VOICE_PRESETS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.voice = id;
    const name = document.createElement('b');
    name.textContent = preset.label;
    const hint = document.createElement('span');
    hint.textContent = preset.hint;
    const action = document.createElement('i');
    action.textContent = 'Seed 试听';
    button.append(name, hint, action);
    grid.appendChild(button);
  }
}

function populateEditorVoiceSelect() {
  const select = $('character-editor-voice');
  if (!select) return;
  select.innerHTML = '';
  for (const [id, preset] of Object.entries(VOICE_PRESETS)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${preset.label} · ${preset.hint}`;
    select.appendChild(option);
  }
}

function readEditorCard() {
  const draft = { ...(editorCardDraft || {}) };
  document.querySelectorAll('[data-card-field]').forEach(input => {
    draft[input.dataset.cardField] = input.dataset.cardList === 'true'
      ? input.value.split(/[、，,]/).map(value => value.trim()).filter(Boolean)
      : input.value.trim();
  });
  return draft;
}

function createCharacter() {
  editorCreating = true;
  editorTemplate = null;
  activeTemplateId = '';
  recipe = makeInitialRecipe((Math.random() * 1e9) | 0);
  editorCardDraft = baseCharacterCard('bean-dog');
  speaker.choose(DEFAULT_VOICE);
  setEnvironment(DEFAULT_SCENE, { speak: false });
  buildNow();
  refreshTemplateControls();
  refreshEditorGate();
  renderCharacterEditor(null, { creating: true });
  setBubble('这是一个新角色。选好外观和角色设定，再保存它。');
  $('recipe-summary').textContent = '正在创建新角色，完成后请保存。';
  showStatus('已经打开新角色编辑器。');
  scrollEditorForMobile();
}

function saveCharacterEditor(event) {
  event?.preventDefault();
  const name = $('character-editor-name').value.trim().replace(/[<>]/g, '').slice(0, 16);
  if (name.length < 2) {
    showStatus('请给角色起一个至少两个字的名字。');
    void playUISFX('error');
    return;
  }
  let id = activeTemplateId;
  if (editorCreating) {
    id = `custom-${Date.now().toString(36)}`;
    customCharacterTemplates.push({
      id,
      group: recipe.species === 'human' ? '人物' : '小动物',
      name,
      hint: '自己创建并保存在当前设备的角色。',
      seed: recipe.seed || FACE_DEFAULT_SEED,
      species: recipe.species,
      base: recipe.base,
      parts: {},
    });
  }
  recipe.templateId = id;
  recipe.voiceId = speaker.activeId;
  recipe.sceneId = sceneId;
  activeTemplateId = id;
  characterNames[id] = name;
  savedCharacterRecipes[id] = cloneRecipe(recipe);
  editorCardDraft = storeCharacterCard(id, readEditorCard());
  if (id.startsWith('custom-')) {
    const custom = customCharacterTemplates.find(item => item.id === id);
    if (custom) Object.assign(custom, { name, species: recipe.species, base: recipe.base, group: recipe.species === 'human' ? '人物' : '小动物' });
  }
  saveCharacterLibrary();
  templateFilter = '全部';
  document.querySelectorAll('[data-template-group]').forEach(button => {
    const selected = button.dataset.templateGroup === '全部';
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    if (selected) button.textContent = `全部 ${allCharacterTemplates().length}`;
  });
  editorCreating = false;
  editorTemplate = characterTemplateById(id);
  buildNow();
  refreshEditorGate();
  renderTemplateCards();
  renderCharacterEditor(editorTemplate);
  $('recipe-summary').textContent = `“${name}”的外观和角色卡已保存在当前设备。`;
  setBubble(`${name}已经保存好了。`);
  showStatus(`${name}已经保存。`);
  void playUISFX('complete', { volume: 0.14 });
}

function resetCharacterEditor() {
  const original = CHARACTER_TEMPLATES.find(item => item.id === activeTemplateId);
  if (!original) return;
  delete savedCharacterRecipes[activeTemplateId];
  delete characterNames[activeTemplateId];
  clearStoredCharacterCard(activeTemplateId);
  saveCharacterLibrary();
  templateCardsReady = false;
  applyTemplate(original, { speak: false });
  renderTemplateCards();
  $('recipe-summary').textContent = `“${original.name}”已经恢复为原始模板。`;
  showStatus('已经恢复原始模板。');
  void playUISFX('back');
}

function editorWidthLimits() {
  const min = window.innerWidth <= 1080 ? 220 : 245;
  const max = Math.max(min, Math.min(480, window.innerWidth - (window.innerWidth <= 1080 ? 590 : 730)));
  return { min, max };
}

function setEditorWidth(value, { persist = false } = {}) {
  const layout = document.querySelector('.lab-layout');
  const handle = $('editor-resize-handle');
  if (!layout || !handle) return 0;
  const { min, max } = editorWidthLimits();
  const width = Math.round(Math.max(min, Math.min(max, Number(value) || 285)));
  layout.style.setProperty('--editor-width', `${width}px`);
  handle.setAttribute('aria-valuemin', String(min));
  handle.setAttribute('aria-valuemax', String(max));
  handle.setAttribute('aria-valuenow', String(width));
  if (persist) {
    try { localStorage.setItem(EDITOR_WIDTH_KEY, String(width)); } catch { /* keep the current width in memory */ }
  }
  return width;
}

function initEditorResize() {
  const handle = $('editor-resize-handle');
  if (!handle) return;
  let saved = 285;
  try { saved = Number(localStorage.getItem(EDITOR_WIDTH_KEY)) || saved; } catch { /* use the default width */ }
  setEditorWidth(saved);

  handle.addEventListener('pointerdown', event => {
    if (matchMedia('(max-width: 860px)').matches) return;
    const startX = event.clientX;
    const startWidth = Number(handle.getAttribute('aria-valuenow')) || 285;
    handle.classList.add('is-dragging');
    handle.setPointerCapture?.(event.pointerId);
    const move = moveEvent => setEditorWidth(startWidth + startX - moveEvent.clientX);
    const finish = finishEvent => {
      handle.classList.remove('is-dragging');
      handle.releasePointerCapture?.(finishEvent.pointerId);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      setEditorWidth(Number(handle.getAttribute('aria-valuenow')), { persist: true });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    event.preventDefault();
  });
  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const width = Number(handle.getAttribute('aria-valuenow')) || 285;
    setEditorWidth(width + (event.key === 'ArrowLeft' ? 20 : -20), { persist: true });
    event.preventDefault();
  });
  window.addEventListener('resize', () => setEditorWidth(Number(handle.getAttribute('aria-valuenow')) || saved), { passive: true });
}

function initCharacterEditor() {
  populateEditorVoiceSelect();
  const sceneSelect = $('character-editor-scene');
  for (const config of LAB_SCENES) {
    const option = document.createElement('option');
    option.value = config.id;
    option.textContent = config.name;
    sceneSelect.appendChild(option);
  }
  const appearance = [
    ['character-editor-species', 'root', 'species'], ['character-editor-base', 'root', 'base'],
    ['character-editor-eyes', 'eyes', 'type'], ['character-editor-crest', 'crest', 'style'],
    ['character-editor-mouth', 'mouth', 'style'], ['character-editor-skull', 'skull', 'shape'],
    ['character-editor-torso', 'torso', 'shape'], ['character-editor-arms', 'arms', 'style'],
    ['character-editor-tail', 'tail', 'style'],
  ];
  for (const [id, part, key] of appearance) {
    $(id).addEventListener('change', event => {
      if (part === 'root') recipe[key] = event.target.value;
      else recipe.parts[part].params[key] = event.target.value;
      if (activeTemplateId) recipe.templateId = activeTemplateId;
      rebuild();
      refreshControls();
      $('recipe-summary').textContent = '外观已改变，保存后会更新角色模板。';
    });
  }
  $('character-editor-voice').addEventListener('change', event => {
    speaker.choose(event.target.value);
    recipe.voiceId = speaker.activeId;
    $('recipe-summary').textContent = '声音已改变，保存后会更新角色模板。';
  });
  $('character-editor-scene').addEventListener('change', event => {
    setEnvironment(event.target.value, { speak: false });
    recipe.sceneId = sceneId;
    $('recipe-summary').textContent = '场景已改变，保存后会更新角色模板。';
  });
  $('character-editor-form').addEventListener('submit', saveCharacterEditor);
  $('character-editor-call').addEventListener('click', () => {
    const config = characterTemplateById(activeTemplateId);
    if (config) startCharacterCall(config);
  });
  $('character-editor-reset').addEventListener('click', resetCharacterEditor);
  $('create-character').addEventListener('click', createCharacter);
}

function setCharacterCallStatus(state, text) {
  const overlay = $('character-call');
  if (!overlay) return;
  overlay.dataset.state = state;
  $('character-call-status').textContent = text;
}

function renderCharacterCallCard() {
  const host = $('character-call-card');
  if (!host || !callState.card) return;
  host.innerHTML = '';
  for (const field of CHARACTER_CARD_FIELDS) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    term.textContent = field.label;
    value.textContent = cardValue(callState.card, field);
    row.append(term, value);
    host.appendChild(row);
  }
}

function appendCharacterCallMessage(role, text, { pending = false } = {}) {
  const message = { role, content: String(text || '').trim().slice(0, 220) };
  callState.messages.push(message);
  callState.messages = callState.messages.slice(-12);
  const node = document.createElement('p');
  node.className = `character-call-message ${role}${pending ? ' pending' : ''}`;
  node.textContent = message.content;
  $('character-call-transcript').replaceChildren(node);
  return { message, node };
}

function characterCallAppearance() {
  if (!recipe) return {};
  return {
    species: recipe.species,
    base: recipe.base,
    eyes: recipe.parts.eyes.params.type,
    crest: recipe.parts.crest.params.style,
    mouth: recipe.parts.mouth.params.style,
    skull: recipe.parts.skull.params.shape,
    torso: recipe.parts.torso.params.shape,
    arms: recipe.parts.arms.params.style,
    tail: recipe.parts.tail.params.style,
    voice: speaker?.activeId || recipe.voiceId || DEFAULT_VOICE,
  };
}

function applyCharacterCallTool(payload) {
  if (!recipe || !callState.template) return;
  const source = payload?.appearancePatch && typeof payload.appearancePatch === 'object' ? payload.appearancePatch : {};
  const patch = {};
  for (const [key, allowed] of Object.entries(CHARACTER_APPEARANCE_OPTIONS)) {
    const value = String(source[key] || '');
    if (allowed.includes(value)) patch[key] = value;
  }
  let appearanceChanged = false;
  if (patch.species && patch.species !== recipe.species) { recipe.species = patch.species; appearanceChanged = true; }
  if (patch.base && patch.base !== recipe.base) { recipe.base = patch.base; appearanceChanged = true; }
  const partBindings = {
    eyes: ['eyes', 'type'], crest: ['crest', 'style'], mouth: ['mouth', 'style'],
    skull: ['skull', 'shape'], torso: ['torso', 'shape'], arms: ['arms', 'style'], tail: ['tail', 'style'],
  };
  for (const [key, [part, param]] of Object.entries(partBindings)) {
    if (patch[key] && patch[key] !== recipe.parts[part].params[param]) {
      recipe.parts[part].params[param] = patch[key];
      appearanceChanged = true;
    }
  }
  if (patch.voice && patch.voice !== speaker.activeId) {
    speaker.choose(patch.voice);
    recipe.voiceId = patch.voice;
    appearanceChanged = true;
  }

  const requestedScene = String(payload?.sceneId || '');
  const nextScene = LAB_SCENES.some(item => item.id === requestedScene) ? requestedScene : '';
  const sceneChanged = Boolean(nextScene && nextScene !== sceneId);
  if (sceneChanged) setEnvironment(nextScene, { speak: false });
  recipe.sceneId = sceneId;
  if (!appearanceChanged && !sceneChanged) return;

  recipe.templateId = callState.template.id;
  savedCharacterRecipes[callState.template.id] = cloneRecipe(recipe);
  if (callState.template.id.startsWith('custom-')) {
    const custom = customCharacterTemplates.find(item => item.id === callState.template.id);
    if (custom) Object.assign(custom, { species: recipe.species, base: recipe.base, group: recipe.species === 'human' ? '人物' : '小动物' });
  }
  saveCharacterLibrary();
  templateCardsReady = false;
  if (appearanceChanged) rebuild();
  refreshControls();
  refreshCharacterEditorAppearance();
  renderTemplateDetail(characterTemplateById(callState.template.id) || callState.template);
  const summary = String(payload?.summary || '角色外观或场景已经更新。').slice(0, 80);
  $('character-card-change').textContent = summary;
  $('recipe-summary').textContent = summary;
  trackAnalytics('lab_character_tool_apply', { depth: 5 });
  void playUISFX('complete', { volume: 0.12 });
}

function setCharacterCallMic(state, label) {
  const button = $('character-call-mic');
  if (!button) return;
  button.dataset.state = state;
  button.setAttribute('aria-label', label);
}

function setCharacterCallLive(text = '') {
  const live = $('character-call-live');
  if (live) live.textContent = String(text || '').trim().slice(0, 180);
}

function stopCharacterCallRecognition({ releaseMedia = false } = {}) {
  clearTimeout(callState.recognitionRestartTimer);
  callState.recognitionRestartTimer = 0;
  const recognition = callState.recognition;
  callState.recognition = null;
  if (recognition) {
    try { recognition.abort(); } catch { /* already stopped */ }
  }
  if (releaseMedia) {
    callState.mediaStream?.getTracks?.().forEach(track => track.stop());
    callState.mediaStream = null;
    callState.micEnabled = false;
    callState.micPaused = false;
    setCharacterCallMic('idle', '开启麦克风并持续聆听');
  }
}

function scheduleCharacterCallRecognition(delay = 260) {
  clearTimeout(callState.recognitionRestartTimer);
  if (!callState.active || !callState.micEnabled || callState.micPaused || callState.busy || callState.recognition) return;
  callState.recognitionRestartTimer = window.setTimeout(() => {
    callState.recognitionRestartTimer = 0;
    startCharacterCallRecognition();
  }, delay);
}

function growthTopicContext() {
  const currentIndex = Math.max(0, Math.min(callState.growthIndex, QUESTIONS.length - 1));
  const current = QUESTIONS[currentIndex];
  const next = QUESTIONS[Math.min(currentIndex + 1, QUESTIONS.length - 1)];
  return {
    index: currentIndex,
    total: QUESTIONS.length,
    currentQuestion: current?.text || '',
    currentHelp: current?.help || '',
    nextQuestion: currentIndex + 1 < QUESTIONS.length ? next?.text || '' : '',
  };
}

function setCharacterCallTopic(topic, { announce = true } = {}) {
  const allowed = ['growth', 'free', 'character'];
  callState.topic = allowed.includes(topic) ? topic : 'free';
  $('character-call')?.querySelectorAll('[data-call-topic]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.callTopic === callState.topic));
  });
  const descriptions = {
    growth: '成长问答会沿用原来的问题，但现在全程用语音自然聊。',
    free: '自由对话会从角色卡里的兴趣、世界和使命自然展开。',
    character: '人物设定会直接修改角色的外观、性格和所在场景，并同步保存。',
  };
  $('character-card-change').textContent = descriptions[callState.topic];
  if (!announce || !callState.active) return;
  speaker?.cancel();
  stopCharacterCallRecognition();
  setCharacterCallLive('');
  if (callState.topic === 'growth') {
    const question = growthTopicContext().currentQuestion;
    appendCharacterCallMessage('assistant', question);
    setCharacterCallStatus('speaking', `${callState.template.name}正在提问`);
    setCharacterCallMic('speaking', '角色正在提问');
    Promise.resolve(speaker.speak(question)).finally(() => {
      if (!callState.active) return;
      if (callState.micEnabled && !callState.micPaused) scheduleCharacterCallRecognition(320);
      else {
        setCharacterCallStatus('permission', '点麦克风开启持续聆听');
        setCharacterCallMic('idle', '开启麦克风并持续聆听');
      }
    });
  } else {
    setCharacterCallStatus(callState.micEnabled && !callState.micPaused ? 'connected' : 'permission', callState.micEnabled && !callState.micPaused ? '会继续听你说' : '点麦克风开启持续聆听');
    if (callState.micEnabled && !callState.micPaused) scheduleCharacterCallRecognition(120);
  }
  trackAnalytics(`lab_character_call_topic_${callState.topic}`, { depth: 4 });
}

function setCharacterCallMode(mode) {
  callState.mode = mode === 'debug' ? 'debug' : 'normal';
  const overlay = $('character-call');
  overlay.classList.toggle('is-debug', callState.mode === 'debug');
  overlay.querySelectorAll('[data-call-mode]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.callMode === callState.mode));
  });
  $('character-call-debug').hidden = callState.mode !== 'debug';
  $('character-call-kicker').textContent = callState.mode === 'debug' ? '调试通话' : '视频通话';
  setCharacterCallTopic('free', { announce: false });
  renderCharacterCallCard();
  const listening = callState.micEnabled && !callState.micPaused;
  setCharacterCallStatus(listening ? 'listening' : 'permission', listening ? `${callState.template?.name || '角色'}正在听` : '点麦克风开启持续聆听');
  trackAnalytics('lab_character_call_mode', { depth: callState.mode === 'debug' ? 3 : 2 });
}

function startCharacterCall(config) {
  if (!config) return;
  callState.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  speaker?.cancel();
  stopCharacterCallRecognition({ releaseMedia: true });
  callState.controller?.abort();
  callState.active = true;
  callState.busy = false;
  callState.template = config;
  callState.card = characterCardFor(config.id);
  callState.messages = [];
  const firstGrowthQuestion = firstUnansweredProfileIndex(profile);
  callState.growthIndex = firstGrowthQuestion >= QUESTIONS.length ? 0 : firstGrowthQuestion;
  applyTemplate(config, { speak: false });

  const preview = document.querySelector('.lab-preview');
  const overlay = $('character-call');
  document.body.classList.add('character-call-active');
  preview.classList.add('is-calling');
  for (const element of document.querySelectorAll('.lab-header, .lab-workbench, .lab-notebook, .editor-resize-handle')) element.inert = true;
  overlay.hidden = false;
  $('character-call-name').textContent = config.name;
  $('character-call-transcript').innerHTML = '';
  setCharacterCallLive('');
  setCharacterCallMic('idle', '开启麦克风并持续聆听');
  setCharacterCallMode('normal');
  appendCharacterCallMessage('assistant', callState.card.greeting);
  animator?.setPose('play');
  const greetingSpeech = speaker.speak(callState.card.greeting);
  setCharacterCallStatus('speaking', `${config.name}正在打招呼`);
  setCharacterCallMic('speaking', '角色正在打招呼');
  Promise.resolve(greetingSpeech).finally(() => {
    if (callState.active && !callState.busy) {
      setCharacterCallStatus('permission', '点麦克风开启持续聆听');
      setCharacterCallMic('idle', '开启麦克风并持续聆听');
    }
  });
  window.setTimeout(() => animator?.setPose('idle'), 1050);
  trackAnalytics('lab_character_call_start', { depth: 3 });
  void playUISFX('forward', { volume: 0.14 });
  $('character-call-end').focus({ preventScroll: true });
}

function endCharacterCall() {
  if (!callState.active) return;
  callState.controller?.abort();
  callState.controller = null;
  stopCharacterCallRecognition({ releaseMedia: true });
  speaker?.cancel();
  callState.active = false;
  callState.busy = false;
  document.body.classList.remove('character-call-active');
  document.querySelector('.lab-preview')?.classList.remove('is-calling');
  for (const element of document.querySelectorAll('.lab-header, .lab-workbench, .lab-notebook, .editor-resize-handle')) element.inert = false;
  $('character-call').hidden = true;
  $('character-call-transcript').innerHTML = '';
  setCharacterCallLive('');
  setBubble(`${callState.template?.name || '角色'}已经挂断通话，角色卡还保存在这里。`);
  trackAnalytics('lab_character_call_end', { depth: 3 });
  void playUISFX('back', { volume: 0.12 });
  const focusTarget = callState.returnFocus;
  callState.returnFocus = null;
  requestAnimationFrame(() => focusTarget?.isConnected && focusTarget.focus({ preventScroll: true }));
}

function handleCharacterCallEvent(eventName, payload, target) {
  if (eventName === 'token') {
    const text = String(payload?.text || '');
    if (!text) return;
    target.message.content = `${target.message.content}${text}`.slice(0, 220);
    target.node.textContent = target.message.content;
    target.node.classList.remove('pending');
    anim.talk = true;
    setCharacterCallStatus('streaming', `${callState.template.name}正在回答`);
    return;
  }
  if (eventName === 'card' && payload?.card) {
    callState.card = storeCharacterCard(callState.template.id, payload.card);
    const summary = String(payload.summary || '角色设定已经更新。').slice(0, 80);
    $('character-card-change').textContent = summary;
    renderCharacterCallCard();
    renderTemplateDetail(callState.template);
    trackAnalytics('lab_character_card_edit', { depth: 4 });
    void playUISFX('complete', { volume: 0.12 });
    return;
  }
  if (eventName === 'tool') {
    applyCharacterCallTool(payload);
    return;
  }
  if (eventName === 'error') throw new Error(String(payload?.error || 'character_call_failed'));
}

async function readCharacterCallStream(response, target) {
  if (!response.ok || !response.body) throw new Error(`character_call_${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      let eventName = 'message';
      const dataLines = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      let payload = {};
      try { payload = JSON.parse(dataLines.join('\n')); } catch { payload = { text: dataLines.join('\n') }; }
      handleCharacterCallEvent(eventName, payload, target);
    }
    if (done) break;
  }
}

async function sendCharacterCall(messageText) {
  const message = String(messageText || '').trim().slice(0, 180);
  if (!callState.active || callState.busy || !message) return;
  const turnTopic = callState.mode === 'debug' ? callState.topic : 'free';
  const topicContext = turnTopic === 'growth' ? growthTopicContext() : {};
  speaker?.cancel();
  stopCharacterCallRecognition();
  callState.busy = true;
  setCharacterCallLive('');
  setCharacterCallMic('thinking', '角色正在思考');
  appendCharacterCallMessage('user', message);
  const history = callState.messages.slice(0, -1);
  const target = appendCharacterCallMessage('assistant', '', { pending: true });
  setCharacterCallStatus('thinking', `${callState.template.name}正在想`);
  animator?.setFace('idle');
  animator?.setPose('sit');
  callState.controller = new AbortController();
  try {
    const response = await fetch('/api/character-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: callState.template.id,
        characterName: callState.template.name,
        mode: callState.mode,
        topic: turnTopic,
        topicContext,
        message,
        history,
        card: callState.card,
        appearance: characterCallAppearance(),
        sceneId,
      }),
      signal: callState.controller.signal,
    });
    await readCharacterCallStream(response, target);
    if (!target.message.content) throw new Error('character_call_empty');
    target.node.classList.remove('pending');
    anim.talk = false;
    animator?.setPose('idle');
    setCharacterCallStatus('speaking', `${callState.template.name}正在说话`);
    setCharacterCallMic('speaking', '角色正在说话');
    if (turnTopic === 'growth') callState.growthIndex = Math.min(callState.growthIndex + 1, QUESTIONS.length - 1);
    try { await speaker.speak(target.message.content); } catch { /* speech may be skipped while the call continues */ }
    trackAnalytics('lab_character_call_turn', { depth: 4 });
  } catch (error) {
    if (error?.name === 'AbortError') return;
    console.error('Character call failed', error);
    target.message.content = '刚才的声音断了一下。你可以再说一次，我会继续听。';
    target.node.textContent = target.message.content;
    target.node.classList.remove('pending');
    anim.talk = false;
    animator?.setPose('idle');
    setCharacterCallStatus('error', '连接刚才停了一下');
    setCharacterCallMic('error', '连接中断，仍会继续聆听');
    void playUISFX('error', { volume: 0.12 });
  } finally {
    callState.controller = null;
    callState.busy = false;
    if (callState.active && callState.micEnabled && !callState.micPaused) {
      setCharacterCallStatus('listening', `${callState.template.name}正在听`);
      setCharacterCallMic('listening', '暂停持续聆听');
      scheduleCharacterCallRecognition(280);
    } else if (callState.active) {
      setCharacterCallStatus(callState.micPaused ? 'paused' : 'permission', callState.micPaused ? '持续聆听已暂停' : '点麦克风开启持续聆听');
      setCharacterCallMic(callState.micPaused ? 'paused' : 'idle', callState.micPaused ? '继续持续聆听' : '开启麦克风并持续聆听');
    }
  }
}

function startCharacterCallRecognition() {
  if (!callState.active || callState.busy || !callState.micEnabled || callState.micPaused || callState.recognition) return;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setCharacterCallStatus('error', '当前浏览器不支持持续语音输入');
    setCharacterCallMic('error', '当前浏览器不支持语音输入');
    void playUISFX('error', { volume: 0.1 });
    return;
  }
  const recognition = new Recognition();
  callState.recognition = recognition;
  recognition.lang = 'zh-CN';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onstart = () => {
    if (callState.recognition !== recognition) return;
    setCharacterCallMic('listening', '暂停持续聆听');
    setCharacterCallStatus('listening', `${callState.template.name}正在听`);
    animator?.setPose('sit');
  };
  recognition.onresult = event => {
    let interim = '';
    let complete = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const text = event.results[index][0]?.transcript || '';
      if (event.results[index].isFinal) complete += text;
      else interim += text;
    }
    setCharacterCallLive((complete || interim).trim());
    if (complete.trim()) {
      const message = complete.trim();
      stopCharacterCallRecognition();
      setCharacterCallLive('');
      void sendCharacterCall(message);
    }
  };
  recognition.onerror = event => {
    if (callState.recognition !== recognition) return;
    callState.recognition = null;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      stopCharacterCallRecognition({ releaseMedia: true });
      setCharacterCallStatus('error', '请允许麦克风权限后再试');
      setCharacterCallMic('error', '重新请求麦克风权限');
      return;
    }
    if (!['aborted', 'no-speech'].includes(event.error)) {
      setCharacterCallStatus('error', '没有听清，我会继续听');
    }
    scheduleCharacterCallRecognition(420);
  };
  recognition.onend = () => {
    if (callState.recognition !== recognition) return;
    callState.recognition = null;
    setCharacterCallLive('');
    scheduleCharacterCallRecognition(260);
  };
  try { recognition.start(); } catch {
    if (callState.recognition === recognition) callState.recognition = null;
    scheduleCharacterCallRecognition(520);
  }
}

async function beginCharacterCallRecognition() {
  if (!callState.active || callState.busy) return;
  if (callState.micEnabled) {
    if (callState.micPaused) {
      callState.micPaused = false;
      setCharacterCallStatus('listening', `${callState.template.name}正在听`);
      setCharacterCallMic('listening', '暂停持续聆听');
      scheduleCharacterCallRecognition(80);
    } else {
      callState.micPaused = true;
      stopCharacterCallRecognition();
      setCharacterCallLive('');
      animator?.setPose('idle');
      setCharacterCallStatus('paused', '持续聆听已暂停');
      setCharacterCallMic('paused', '继续持续聆听');
    }
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition || !navigator.mediaDevices?.getUserMedia) {
    setCharacterCallStatus('error', '当前浏览器不支持持续语音输入');
    setCharacterCallMic('error', '当前浏览器不支持语音输入');
    void playUISFX('error', { volume: 0.1 });
    return;
  }
  setCharacterCallStatus('permission', '正在请求麦克风权限');
  setCharacterCallMic('thinking', '正在请求麦克风权限');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!callState.active) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    speaker?.cancel();
    callState.mediaStream = stream;
    callState.micEnabled = true;
    callState.micPaused = false;
    setCharacterCallStatus('listening', `${callState.template.name}正在听`);
    setCharacterCallMic('listening', '暂停持续聆听');
    startCharacterCallRecognition();
    trackAnalytics('lab_character_call_mic_allowed', { depth: 4 });
  } catch (error) {
    console.warn('Microphone permission unavailable', error);
    stopCharacterCallRecognition({ releaseMedia: true });
    setCharacterCallStatus('error', '请在浏览器设置里允许麦克风');
    setCharacterCallMic('error', '重新请求麦克风权限');
    void playUISFX('error', { volume: 0.1 });
  }
}

function resetActiveCharacterCard() {
  if (!callState.template) return;
  callState.card = clearStoredCharacterCard(callState.template.id);
  renderCharacterCallCard();
  renderTemplateDetail(callState.template);
  $('character-card-change').textContent = '已经恢复这只角色最初的设定。';
  setCharacterCallStatus(callState.micEnabled && !callState.micPaused ? 'listening' : 'connected', '角色设定已恢复');
  void playUISFX('back', { volume: 0.11 });
}

function initCharacterCalling() {
  $('character-call-end').addEventListener('click', endCharacterCall);
  $('character-call').querySelectorAll('[data-call-mode]').forEach(button => {
    button.addEventListener('click', () => setCharacterCallMode(button.dataset.callMode));
  });
  $('character-call').querySelectorAll('[data-call-topic]').forEach(button => {
    button.addEventListener('click', () => setCharacterCallTopic(button.dataset.callTopic));
  });
  $('character-call-mic').addEventListener('click', beginCharacterCallRecognition);
  $('character-card-reset').addEventListener('click', resetActiveCharacterCard);
  $('character-call-transcript').addEventListener('click', event => {
    if (event.target.closest('.character-call-message.assistant')) skipLabSpeech();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && callState.active) endCharacterCall();
  });
}

function performAction(pose, { button = null, duration, speed } = {}) {
  const preset = ACTION_PRESETS[pose] || {};
  clearTimeout(actionResetTimer);
  document.querySelectorAll('#action-options button').forEach(item => item.classList.remove('is-playing'));
  button?.classList.add('is-playing');
  animator?.setFace('idle');
  animator?.setPose(pose, { speed: speed ?? preset.speed });
  actionResetTimer = window.setTimeout(() => {
    animator?.setPose('idle');
    button?.classList.remove('is-playing');
  }, duration ?? preset.duration ?? 1500);
}

function renderScriptPicker() {
  const picker = $('script-picker');
  if (!picker) return;
  picker.innerHTML = '';
  for (const script of INTERACTION_SCRIPTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'script-card';
    const title = document.createElement('b');
    title.textContent = script.title;
    const hint = document.createElement('span');
    hint.textContent = script.hint;
    button.append(title, hint);
    button.addEventListener('click', () => startScript(script));
    picker.appendChild(button);
  }
}

function scheduleAfterSpeech(speech, callback, delay = 520) {
  Promise.resolve(speech).finally(() => {
    clearTimeout(scriptAdvanceTimer);
    scriptAdvanceTimer = window.setTimeout(callback, reduceMotionQuery?.matches ? 40 : delay);
  });
}

function startScript(script) {
  clearTimeout(scriptAdvanceTimer);
  activeScript = script;
  trackAnalytics(`lab_script_start_${script.id}`, { depth: 3 });
  scriptStepIndex = 0;
  scriptAnswers = [];
  scriptBusy = true;
  void playUISFX('start');
  $('script-picker').hidden = true;
  $('script-session').hidden = false;
  $('script-complete').hidden = true;
  $('script-feedback').hidden = true;
  $('script-history').innerHTML = '';
  $('script-answers').innerHTML = '';
  $('script-progress').textContent = '故事开始';
  $('script-title').textContent = script.title;
  $('script-question').textContent = script.intro;
  performAction('play');
  const speech = speaker.speak(script.intro, { offlineKey: script.audio });
  scheduleAfterSpeech(speech, () => {
    if (activeScript !== script) return;
    scriptBusy = false;
    renderScriptStep();
  }, 420);
}

function stopScript() {
  clearTimeout(scriptAdvanceTimer);
  speaker?.cancel();
  activeScript = null;
  scriptStepIndex = 0;
  scriptAnswers = [];
  scriptBusy = false;
  $('script-session').hidden = true;
  $('script-picker').hidden = false;
  animator?.setPose('idle');
}

function renderScriptStep() {
  if (!activeScript) return;
  const step = activeScript.steps[scriptStepIndex];
  if (!step) {
    finishScript();
    return;
  }
  const left = activeScript.steps.length - scriptStepIndex;
  $('script-progress').textContent = left === 1 ? '最后一个小问题' : `还有 ${left} 个小问题`;
  $('script-title').textContent = activeScript.title;
  $('script-question').textContent = step.prompt;
  $('script-feedback').hidden = true;
  const answers = $('script-answers');
  answers.innerHTML = '';
  for (const option of step.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    const title = document.createElement('b');
    title.textContent = option.label;
    const detail = document.createElement('small');
    detail.textContent = option.detail;
    button.append(title, detail);
    button.addEventListener('click', () => answerScriptStep(step, option, button));
    answers.appendChild(button);
  }
  setBubble(step.prompt);
  speaker.speak(step.prompt, { offlineKey: step.audio });
}

function answerScriptStep(step, option, selectedButton) {
  if (!activeScript || scriptBusy) return;
  scriptBusy = true;
  trackAnalytics('lab_script_answer', { depth: 4 + scriptStepIndex });
  $('script-answers').querySelectorAll('button').forEach(button => {
    button.disabled = true;
    const selected = button === selectedButton;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  scriptAnswers.push({ short: step.short, label: option.label, value: option.value });
  const historyItem = document.createElement('li');
  const historyLabel = document.createElement('b');
  historyLabel.textContent = step.short;
  const historyValue = document.createElement('span');
  historyValue.textContent = option.label;
  historyItem.append(historyLabel, historyValue);
  $('script-history').appendChild(historyItem);
  const feedback = $('script-feedback');
  feedback.textContent = option.feedback;
  feedback.hidden = false;
  const currentScript = activeScript;
  const currentStep = scriptStepIndex;
  const speech = speaker.speak(option.feedback, { offlineKey: option.audio });
  performAction(option.pose || 'play');
  scheduleAfterSpeech(speech, () => {
    if (activeScript !== currentScript || scriptStepIndex !== currentStep) return;
    scriptStepIndex += 1;
    scriptBusy = false;
    renderScriptStep();
  }, 680);
}

function finishScript() {
  if (!activeScript) return;
  const script = activeScript;
  const summary = script.summary(scriptAnswers);
  trackAnalytics(`lab_script_complete_${script.id}`, { depth: 8 });
  scriptBusy = false;
  $('script-progress').textContent = '互动完成';
  $('script-question').textContent = script.complete;
  $('script-answers').innerHTML = '';
  $('script-feedback').hidden = true;
  $('script-summary').textContent = summary;
  $('script-complete').hidden = false;
  profile.scriptSummary = summary;
  profile.scriptNotes = [
    ...(Array.isArray(profile.scriptNotes) ? profile.scriptNotes.filter(item => item.scriptId !== script.id) : []),
    { scriptId: script.id, title: script.title, choices: scriptAnswers.map(item => item.label), summary },
  ].slice(-5);
  profile.reasons = [...profile.reasons, summary].slice(-8);
  saveProfile();
  performAction('play');
  speaker.speak(script.complete, { offlineKey: script.completeAudio });
  showStatus(`已经完成“${script.title}”。选择结果保存在当前设备。`);
  void playUISFX('complete');
}

function initActionStudio() {
  renderScriptPicker();
  $('action-options').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const pose = button.dataset.action;
    const preset = ACTION_PRESETS[pose] || {};
    speaker.speak(button.dataset.line, { offlineKey: button.dataset.audio });
    performAction(pose, { button, duration: preset.duration, speed: preset.speed });
  });
  $('expression-options').addEventListener('click', event => {
    const button = event.target.closest('[data-expression]');
    if (!button) return;
    clearTimeout(actionResetTimer);
    animator?.setPose('idle');
    $('expression-options').querySelectorAll('button').forEach(item => item.classList.toggle('selected', item === button));
    speaker.speak(button.dataset.line, { offlineKey: button.dataset.audio });
    animator?.setFace(button.dataset.expression);
  });
  $('script-exit').addEventListener('click', stopScript);
  $('script-replay').addEventListener('click', () => {
    if (activeScript) startScript(activeScript);
  });
}

function selectTab(id) {
  if (id !== 'templates' && !editorCreating && !activeTemplateId) {
    showStatus('请先选择一个角色，或创建新角色。');
    id = 'templates';
  }
  document.querySelectorAll('[data-lab-tab]').forEach(button => {
    const selected = button.dataset.labTab === id;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll('[data-lab-panel]').forEach(panel => {
    const selected = panel.dataset.labPanel === id;
    panel.hidden = !selected;
    panel.classList.toggle('active', selected);
  });
  if (id === 'templates' && !templateCardsReady) renderTemplateCards();
  document.querySelector(`[data-lab-tab="${id}"]`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

function refreshInterviewProgress() {
  const completion = profileCompletion(profile);
  $('question-memory-count').textContent = `已记住 ${completion.answered} / ${completion.total}`;
  $('interview-progress').setAttribute('aria-valuenow', String(completion.answered));
  $('interview-progress').querySelector('span').style.width = `${completion.answered / completion.total * 100}%`;
}

function renderQuestion({ speak = true } = {}) {
  const question = QUESTIONS[questionIndex];
  const answers = $('question-answers');
  const form = $('interest-form');
  const finish = $('interview-finish');
  const feedback = $('question-feedback');
  answers.innerHTML = '';
  form.hidden = true;
  finish.hidden = true;
  feedback.hidden = true;
  feedback.textContent = '';

  refreshInterviewProgress();

  if (!question || profile.completed) {
    $('question-progress').textContent = '认识完成';
    $('question-stage').textContent = '画像已准备好';
    $('question-title').textContent = '它已经从你的回答里长出来了。';
    $('question-help').textContent = '小档案和角色配方都保存在当前设备上。';
    finish.hidden = false;
    setBubble(`我记住了。你${profile.learning || '有自己的发现方式'}，最近还喜欢${profile.interest || '很多有趣的事情'}。`);
    return;
  }

  $('question-progress').textContent = `${question.stage} · ${questionIndex + 1} / ${QUESTIONS.length}`;
  $('question-stage').textContent = question.stage;
  $('question-title').textContent = question.text;
  $('question-help').textContent = question.help;
  if (question.freeText) {
    form.hidden = false;
    $('interest-input').value = profile.interest || '';
    requestAnimationFrame(() => $('interest-input').focus({ preventScroll: true }));
  } else {
    for (const option of question.options) {
      const button = document.createElement('button');
      button.type = 'button';
      const strong = document.createElement('b');
      strong.textContent = option.label;
      const detail = document.createElement('span');
      detail.textContent = option.detail;
      button.append(strong, detail);
      button.addEventListener('click', () => answerQuestion(question, option, button));
      answers.appendChild(button);
    }
  }
  setBubble(question.text);
  if (speak) speaker.speak(question.text, { offlineKey: question.audio });
}

function answerQuestion(question, option, selectedButton) {
  $('question-answers').querySelectorAll('button').forEach(button => { button.disabled = true; });
  selectedButton?.classList.add('is-selected');
  trackAnalytics(`profile_answer_${question.field}`, { depth: 2 + questionIndex });
  profile[question.field] = option.value;
  profile.answers = { ...profile.answers, [question.field]: { label: option.label, value: option.value } };
  if (option.reason) profile.reasons = [...profile.reasons.filter(item => item !== option.reason), option.reason].slice(-12);
  if (option.voice) speaker.choose(option.voice);
  option.apply?.();
  saveProfile();
  refreshInterviewProgress();
  if (option.apply) rebuild();
  const response = option.feedback || question.feedback || `我记住了：${option.value}。`;
  const feedback = $('question-feedback');
  feedback.textContent = response;
  feedback.hidden = false;
  const playback = option.voice
    ? speaker.speak(VOICE_PRESETS[option.voice].sample, { preview: true })
    : speaker.speak(response, { offlineKey: option.audio });
  animator.setPose('play');
  window.setTimeout(() => animator.setPose('idle'), 1000);
  Promise.resolve(playback).catch(() => {}).finally(() => {
    window.setTimeout(() => {
      questionIndex = firstUnansweredProfileIndex(profile);
      renderQuestion();
    }, 360);
  });
}

function finishInterest(value) {
  const clean = value.trim().replace(/[<>]/g, '').slice(0, 36);
  if (clean.length < 2) {
    $('interest-error').textContent = '再多说一点点，它才能认真记住。';
    void playUISFX('blocked');
    return;
  }
  $('interest-error').textContent = '';
  profile.interest = clean;
  trackAnalytics('profile_complete', { depth: 2 + QUESTIONS.length });
  profile.answers = { ...profile.answers, interest: { label: clean, value: clean } };
  profile.reasons = [...profile.reasons, `你最近喜欢${clean}，它会把这件事留在自己的第一张小档案里。`].slice(-8);
  saveProfile();
  questionIndex = QUESTIONS.length;
  setBubble(`我记住啦。你最近喜欢${clean}。以后遇到新的故事，我会先问问你想怎么做。`);
  speaker.speak(`我记住啦。你最近喜欢${clean}。以后遇到新的故事，我会先问问你想怎么做。`, { offlineKey: 'interview-complete' });
  animator.setPose('play');
  void playUISFX('complete');
  window.setTimeout(() => { animator.setPose('idle'); renderQuestion({ speak: false }); }, 4200);
}

function resetInterview() {
  profile = createEmptyChildProfile();
  questionIndex = 0;
  speaker.choose(DEFAULT_VOICE);
  saveProfile();
  rebuild();
  selectTab('interview');
  renderQuestion();
  showStatus('兴趣档案和问答进度已经重新开始。');
}

function setManualReason(part) {
  const names = { eyes: '眼睛', crest: '耳朵和头顶', mouth: '嘴巴', skull: '脸形', torso: '身体', arms: '手臂', tail: '尾巴' };
  $('recipe-summary').textContent = `刚刚调整了${names[part] || '角色外貌'}，保存后会更新当前角色。`;
  refreshCharacterEditorAppearance();
}

function initUI() {
  speaker = new LabSpeaker();
  if (activeTemplateId && VOICE_PRESETS[recipe.voiceId]) speaker.choose(recipe.voiceId);
  renderVoiceOptions();
  refreshProfile();
  initScenePicker();
  initTemplatePicker();
  initCharacterEditor();
  initActionStudio();
  initCharacterInteraction();
  initCharacterCalling();
  initEditorResize();

  document.querySelectorAll('[data-lab-tab]').forEach(button => {
    button.addEventListener('click', () => selectTab(button.dataset.labTab));
  });
  document.querySelectorAll('[data-open-tab]').forEach(button => {
    button.addEventListener('click', () => selectTab(button.dataset.openTab));
  });

  document.querySelectorAll('.option-row[data-part]').forEach(row => {
    row.addEventListener('click', event => {
      const button = event.target.closest('[data-value]');
      if (!button) return;
      put(row.dataset.part, row.dataset.key, button.dataset.value);
      if (row.dataset.part === 'crest' && ['floppy', 'cat', 'bear'].includes(button.dataset.value)) {
        put('crest', 'tone', 'skin');
      }
      setManualReason(row.dataset.part);
      rebuild();
    });
  });

  document.querySelectorAll('[data-range-part]').forEach(input => {
    input.addEventListener('input', () => {
      const value = Number(input.value);
      put(input.dataset.rangePart, input.dataset.rangeKey, value);
      const output = document.getElementById(`${input.id}-value`);
      if (output) output.textContent = value.toFixed(2);
      setManualReason(input.dataset.rangePart);
      rebuild();
    });
  });

  $('base-options').addEventListener('click', event => {
    const button = event.target.closest('[data-base]');
    if (!button) return;
    recipe.base = button.dataset.base;
    $('recipe-summary').textContent = '刚刚改变了角色的整体站姿，保存后会更新当前角色。';
    refreshCharacterEditorAppearance();
    rebuild();
  });

  $('voice-options').addEventListener('click', event => {
    const button = event.target.closest('[data-voice]');
    if (!button) return;
    speaker.choose(button.dataset.voice);
    const preset = VOICE_PRESETS[button.dataset.voice];
    recipe.voiceId = button.dataset.voice;
    refreshCharacterEditorAppearance();
    speaker.speak(preset.sample, { preview: true });
    showStatus(`已经切换到${preset.label}的声音。`);
  });

  $('copy-recipe').addEventListener('click', async () => {
    const payload = JSON.stringify({
      name: $('character-editor-name').value,
      templateId: activeTemplateId,
      recipe,
      characterCard: readEditorCard(),
    }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      showStatus('当前角色的外观和角色卡已经复制。');
      void playUISFX('copy');
    } catch {
      showStatus('当前浏览器不允许复制，可以稍后再试。');
      void playUISFX('error');
    }
  });

  refreshControls();
  refreshEditorGate();
  if (activeTemplateId) {
    const selected = characterTemplateById(activeTemplateId);
    if (selected) renderCharacterEditor(selected);
  }
  selectTab('templates');
}

async function initialize() {
  if (initialized) return;
  initialized = true;
  initScene();
  initUI();
  document.documentElement.dataset.labReady = 'true';
}

export async function activateLab() {
  await initialize();
  active = true;
  animationLoop.last = 0;
  renderer.setAnimationLoop(animationLoop);
  refreshProfile();
  refreshControls();
  refreshEditorGate();
  selectTab('templates');
  if (activeTemplateId) renderCharacterEditor(characterTemplateById(activeTemplateId));
  else setBubble('先选择一个角色，再开始编辑。');
}

export function deactivateLab() {
  active = false;
  if (renderer) renderer.setAnimationLoop(null);
  if (callState.active) endCharacterCall();
  speaker?.cancel();
}

export { VOICE_PRESETS, QUESTIONS, ACTION_PRESETS, INTERACTION_SCRIPTS, CHARACTER_TEMPLATES };
