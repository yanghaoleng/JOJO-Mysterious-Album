import { storyCharacterTemplateById } from './story-character-templates.js';

export const STORY_ID = 'lost-echo';
export const STORY_GUIDE_TEMPLATE = storyCharacterTemplateById('river-otter');

export const GUIDES = [{
  id: 'river-otter', name: '河湾小水獭', mark: '獭', voice: 'moss',
  manner: '会等你说完，再把你说的样子画到小伙伴身上',
  hello: '你好，我是河湾小水獭。先回答三个小问题，我就能画出今天陪你冒险的小伙伴。',
}];

export const INTERVIEW_QUESTIONS = [
  { id: 'appearance', question: '你想让小伙伴长什么样？', hint: '可以说大耳朵、亮眼睛、软尾巴，或者别的样子。' },
  { id: 'color', question: '你想给它穿上什么颜色？', hint: '说一种颜色，或者几种颜色都可以。' },
  { id: 'companion', question: '你想让它怎样陪你玩？', hint: '可以一起跑、安静听你说，或者勇敢地一起出发。' },
];

export const ITEMS = {
  listeningShell: { id: 'listeningShell', name: '听听贝', image: './assets/story/items/listening-shell.webp?v=20260828-picturebook-alpha', short: '能把很小的声音变清楚。', description: '河湾小水獭在纸上地面送给你的贝壳。', use: '听清小回声从哪里传来。' },
  starThread: { id: 'starThread', name: '萤火线团', image: './assets/story/items/star-thread.webp?v=20260828-picturebook-alpha', short: '会朝着小回声去过的方向发亮。', description: '林间小鹿在萤火草地找到的线团。', use: '跟着亮光走过陌生的地方。' },
  unsentGreeting: { id: 'unsentGreeting', name: '远方小信', image: './assets/story/items/unsent-greeting.webp?v=20260828-picturebook-alpha', short: '上面画着海浪、灯塔和一串气泡。', description: '月牙小猫在月坑边捡到的小信。', use: '提醒大家去海底气泡继续寻找。' },
  lighthouseSeed: { id: 'lighthouseSeed', name: '发光种子', image: './assets/story/items/lighthouse-seed.webp?v=20260828-picturebook-alpha', short: '会给黑暗里的小声音照路。', description: '竹叶熊猫在巨人口袋里找到的种子。', use: '在云朵里面照亮回家的路。' },
};

export const CHAPTERS = [
  { id: 'hear-the-echo', number: 1, title: '听见小回声', promise: '先发出声音，再听听它从哪里回来。' },
  { id: 'follow-the-echo', number: 2, title: '跟着回声走', promise: '沿着月坑和气泡，找到小回声留下的声音。' },
  { id: 'bring-echo-home', number: 3, title: '陪回声回家', promise: '在口袋里找到它，再陪它走进云朵。' },
];

export const SCENES = [
  {
    id: 'paper-ground', chapter: 1, name: '纸上地面', place: 'paper-ground', sceneId: 'paper-ground', objective: '先发出一个声音，帮听听贝找方向。',
    npc: { name: '河湾小水獭', templateId: 'river-otter', entrance: 'door', voice: 'moss' },
    cast: [{ name: '池塘小蛙', templateId: 'pond-frog', voice: 'bubble', line: '小水獭一直在听纸外面的声音。' }],
    conversation: [
      { speaker: 'cast', text: '小水獭，你一直在听什么？' },
      { speaker: 'npc', text: '我在找小回声。平时我对山洞说“你好”，它也会说“你好”。' },
      { speaker: 'cast', text: '声音碰到远处的墙，又跑回耳朵里，就叫回声。' },
      { speaker: 'npc', text: '今天它没有回来。你愿意发出一个声音，帮我找找吗？' },
    ],
    dialogue: '你想先发出什么声音？',
    choices: [
      { id: 'hello', label: '说“你好”', voiceHints: ['你好', '说你好', '喊你好'], result: '你说了一声“你好”。听听贝里传来很轻的“你……”，声音在草地那边。', trait: 'bold' },
      { id: 'here', label: '说“我在这里”', voiceHints: ['我在这里', '我在这', '说我在这里'], result: '你说“我在这里”。听听贝亮了一下，草地那边也有一个小声音。', trait: 'care' },
      { id: 'clap', label: '拍两下手', voiceHints: ['拍手', '拍拍手', '拍两下', '鼓掌'], result: '你拍了两下手。听听贝也响了两下，它指向萤火草地。', trait: 'make' },
    ],
    reward: 'listeningShell', petLine: '听听贝找到方向了。小回声一定去过萤火草地！',
  },
  {
    id: 'firefly-meadow', chapter: 1, name: '萤火草地', place: 'meadow', sceneId: 'meadow', objective: '说一句短短的话，让萤火虫帮忙传过去。',
    npc: { name: '林间小鹿', templateId: 'forest-deer', entrance: 'grass', voice: 'sprout' },
    cast: [{ name: '落叶小刺猬', templateId: 'leaf-hedgehog', voice: 'bubble', line: '萤火虫听见声音就会闪一下。' }],
    conversation: [
      { speaker: 'cast', text: '听！草叶里有个小声音在说：“你……”' },
      { speaker: 'npc', text: '小回声只留下一个字。萤火虫正在帮它指路。' },
      { speaker: 'cast', text: '我们说短一点、慢一点，亮光就会接着往前跑。' },
      { speaker: 'npc', text: '你想说什么，让萤火虫听清楚？' },
    ],
    dialogue: '你想对萤火虫说什么？',
    choices: [
      { id: 'slow', label: '慢慢说“你好”', voiceHints: ['慢慢说', '说你好', '慢一点', '你好'], result: '你慢慢说“你、好”。萤火虫一盏一盏亮起来，飞向月球。', trait: 'patient' },
      { id: 'together', label: '大家一起说', voiceHints: ['一起说', '大家说', '一块说', '一起喊'], result: '大家一起说“我们来啦”。一条亮光越过草地，飞向月球。', trait: 'together' },
      { id: 'clap', label: '按节奏拍手', voiceHints: ['拍手', '拍两下', '按节奏', '鼓掌'], result: '你一下一下地拍手。萤火虫跟着闪光，排成一条去月球的路。', trait: 'make' },
    ],
    reward: 'starThread', petLine: '萤火线团也亮了。下一站是月球表面！',
  },
  {
    id: 'moon-surface', chapter: 2, name: '月球表面', place: 'moon', sceneId: 'moon', objective: '对着月坑说一句，听听声音从哪里回来。',
    npc: { name: '月牙小猫', templateId: 'moon-cat', entrance: 'reflection', voice: 'star' },
    cast: [{ name: '书桌小鸮', templateId: 'book-owl', voice: 'moss', line: '这个故事里的月坑边，像一圈远远的墙。' }],
    conversation: [
      { speaker: 'cast', text: '这个故事里的月坑边，像一圈硬硬的墙。' },
      { speaker: 'npc', text: '我刚才说“你好”，月坑里也传回了一声“好”。' },
      { speaker: 'cast', text: '声音碰到月坑边，又跑回来了。小回声一定来过这里！' },
      { speaker: 'npc', text: '你愿意再说一句，把它叫出来吗？' },
    ],
    dialogue: '你想对着月坑说什么？',
    choices: [
      { id: 'hello', label: '说“你好”', voiceHints: ['你好', '说你好', '喊你好'], result: '你说“你好”。月坑那边送回一声“你好”，还飘起一个蓝色泡泡。', trait: 'bold' },
      { id: 'found-you', label: '说“我找到你啦”', voiceHints: ['找到你', '我找到你啦', '找到啦'], result: '你说“我找到你啦”。月坑也回答“找到你啦”，蓝色泡泡飞向海底。', trait: 'care' },
      { id: 'clap', label: '拍三下手', voiceHints: ['拍手', '拍三下', '三下', '鼓掌'], result: '你拍了三下手。月坑送回三下轻响，一个蓝色泡泡从石头后面飘出来。', trait: 'make' },
    ],
    reward: 'unsentGreeting', petLine: '远方小信上也画着一串气泡。我们去海底看看！',
  },
  {
    id: 'underwater-bubbles', chapter: 2, name: '海底气泡', place: 'underwater', sceneId: 'underwater', objective: '打开装着声音的泡泡，听清里面的话。',
    npc: { name: '池塘小蛙', templateId: 'pond-frog', entrance: 'grass', voice: 'bubble' },
    cast: [{ name: '豆豆小狗', templateId: 'bean-dog', voice: 'sprout', line: '这个故事里的大泡泡能装住一小段声音。' }],
    conversation: [
      { speaker: 'cast', text: '看！这个故事里的大泡泡，能装住一小段声音。' },
      { speaker: 'npc', text: '最大的泡泡里一直在说：“好……好……”' },
      { speaker: 'cast', text: '这一定是小回声留下的“你好”。我们帮它出来吧。' },
      { speaker: 'npc', text: '你想用什么办法打开声音泡泡？' },
    ],
    dialogue: '你想怎样打开声音泡泡？',
    choices: [
      { id: 'tap', label: '轻轻碰一下', voiceHints: ['碰一下', '轻轻碰', '摸泡泡', '点一下'], result: '你轻轻一碰，泡泡“啵”地打开了，里面跑出一声完整的“你好”。', trait: 'patient' },
      { id: 'answer', label: '对泡泡说“你好”', voiceHints: ['对泡泡说', '说你好', '你好'], result: '你对泡泡说“你好”。泡泡也回答“你好”，然后慢慢升向水面。', trait: 'care' },
      { id: 'shell', label: '用听听贝听一听', voiceHints: ['听听贝', '用贝壳', '听一听', '贝壳'], result: '听听贝把声音变清楚了：“我在一个软软的大口袋里。”', trait: 'listen' },
    ],
    consume: 'unsentGreeting', reward: null, petLine: '水面上有一个大大的影子。小回声可能进了巨人口袋！',
  },
  {
    id: 'giant-pocket', chapter: 3, name: '巨人口袋', place: 'giant-pocket', sceneId: 'giant-pocket', objective: '在厚厚的布里，叫小回声放心出来。',
    npc: { name: '竹叶熊猫', templateId: 'bamboo-panda', entrance: 'box', voice: 'bubble' },
    cast: [{ name: '卷尾小狐狸', templateId: 'curl-fox', voice: 'sprout', line: '口袋的布很厚，声音到这里就变小了。' }],
    conversation: [
      { speaker: 'cast', text: '口袋的布很厚，声音到了这里就变得小小的。' },
      { speaker: 'npc', text: '萤火线团在纽扣旁边亮了。小回声就躲在毛线后面。' },
      { speaker: 'cast', text: '它不是不想回来。它只是怕自己的声音太小，我们听不见。' },
      { speaker: 'npc', text: '你想对小回声说什么，让它放心出来？' },
    ],
    dialogue: '你想对小回声说什么？',
    choices: [
      { id: 'not-afraid', label: '说“别怕”', voiceHints: ['别怕', '不要怕', '不用怕'], result: '你轻轻说“别怕”。小回声从毛线后面探出头，认真听着你。', trait: 'care' },
      { id: 'listening', label: '说“我在听”', voiceHints: ['我在听', '听得到', '我听见了'], result: '你说“我在听”。小回声马上回答：“听……”，它终于愿意出来了。', trait: 'listen' },
      { id: 'home', label: '说“一起回家”', voiceHints: ['一起回家', '回家吧', '带你回家'], result: '你说“一起回家”。大家拉住萤火线团，把小回声从软布里接了出来。', trait: 'together' },
    ],
    consume: 'starThread', reward: 'lighthouseSeed', petLine: '小回声找到啦！发光种子会照亮云朵里面的回家路。',
  },
  {
    id: 'inside-clouds', chapter: 3, name: '云朵里面', place: 'clouds', sceneId: 'clouds', objective: '一起说一句，让小回声跟着声音回家。',
    npc: { name: '云朵羊驼', templateId: 'cloud-alpaca', entrance: 'lantern', voice: 'bubble' },
    cast: [{ name: '河湾小水獭', templateId: 'river-otter', voice: 'moss', line: '小回声已经跟我们走到云朵里面了。' }],
    conversation: [
      { speaker: 'cast', text: '小回声已经跟我们走到云朵里面了。' },
      { speaker: 'npc', text: '这里有一条圆圆的云洞。尽头像一面软软的墙。' },
      { speaker: 'cast', text: '我们说一句，声音碰到远处，再跑回来，小回声就知道怎样回家。' },
      { speaker: 'npc', text: '最后一句交给你。你想和大家一起说什么？' },
    ],
    dialogue: '你想和大家一起说什么？',
    choices: [
      { id: 'hello', label: '一起说“你好”', voiceHints: ['你好', '喊你好', '说你好', '大家好'], result: '大家一起说“你好！”云洞那边也传回“你好！”小回声开心地跟了回来。', trait: 'together' },
      { id: 'found-you', label: '一起说“找到你啦”', voiceHints: ['找到你啦', '找到你', '找到了'], result: '大家一起说“找到你啦！”远处也回答“找到你啦！”小回声回家了。', trait: 'bold' },
      { id: 'welcome', label: '一起说“欢迎回来”', voiceHints: ['欢迎回来', '回来啦', '欢迎你'], result: '大家一起说“欢迎回来！”云洞送回同一句话，小回声亮得像一颗星。', trait: 'care' },
    ],
    consume: 'lighthouseSeed', reward: null, petLine: '你听，声音碰到远处又回来，这就是回声。小回声回家啦！', final: true,
  },
];
