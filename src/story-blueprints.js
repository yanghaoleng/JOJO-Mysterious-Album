import { storyCharacterTemplateById } from './story-character-templates.js';

export const STORY_ID = 'lost-echo';
export const STORY_GUIDE_TEMPLATE = storyCharacterTemplateById('curl-fox');

export const GUIDES = [
  {
    id: 'curl-fox', name: '小卷', mark: '狐', voice: 'sprout',
    manner: '会等你说完，再把你说的样子画到小伙伴身上',
    hello: '你好，我是小卷。先回答三个小问题，我就能画出今天陪你冒险的小伙伴。',
  },
];

export const INTERVIEW_QUESTIONS = [
  { id: 'appearance', question: '你想让小伙伴长什么样？', hint: '可以说大耳朵、亮眼睛、软尾巴，或者别的样子。' },
  { id: 'color', question: '你想给它穿上什么颜色？', hint: '说一种颜色，或者几种颜色都可以。' },
  { id: 'companion', question: '你想让它怎样陪你玩？', hint: '可以一起跑、安静听你说，或者勇敢地一起出发。' },
];

export const ITEMS = {
  listeningShell: { id: 'listeningShell', name: '听听贝', image: './assets/story/items/listening-shell.webp?v=20260828-picturebook-alpha', short: '能把很小的声音变清楚。', description: '河湾小水獭送给你的贝壳。', use: '听清远处传来的小声音。' },
  starThread: { id: 'starThread', name: '发光小绳', image: './assets/story/items/star-thread.webp?v=20260828-picturebook-alpha', short: '会朝着声音来的方向发亮。', description: '林间小鹿在草地里找到的小绳。', use: '跟着亮光寻找回声。' },
  unsentGreeting: { id: 'unsentGreeting', name: '灯塔小信', image: './assets/story/items/unsent-greeting.webp?v=20260828-picturebook-alpha', short: '上面画着一座黑黑的灯塔。', description: '竹叶熊猫在木箱里找到的小信。', use: '请屋顶的小鸮帮忙认路。' },
  lighthouseSeed: { id: 'lighthouseSeed', name: '发光种子', image: './assets/story/items/lighthouse-seed.webp?v=20260828-picturebook-alpha', short: '种下去就能让灯塔亮起来。', description: '书桌小鸮送给你的种子。', use: '和月牙小猫一起点亮灯塔。' },
};

export const CHAPTERS = [
  { id: 'meet-the-echo', number: 1, title: '认识回声', promise: '喊一声，听听远处会不会把声音送回来。' },
  { id: 'follow-the-sound', number: 2, title: '跟着声音走', promise: '沿着亮光找到是谁在灯塔里等我们。' },
  { id: 'light-the-tower', number: 3, title: '让灯塔亮起来', promise: '一起说一句话，把回声叫回来。' },
];

export const SCENES = [
  {
    id: 'paper-harbor', chapter: 1, name: '纸船小溪', place: 'harbor', sceneId: 'paper-creek', objective: '对着远山说一句，听听声音会不会回来。',
    npc: { name: '河湾小水獭', templateId: 'river-otter', entrance: 'door', voice: 'moss' },
    cast: [
      { name: '池塘小蛙', templateId: 'pond-frog', voice: 'bubble', line: '小水獭正在对着远山喊“你好”。' },
    ],
    conversation: [
      { speaker: 'cast', text: '小水獭，你刚才在喊谁呀？' },
      { speaker: 'npc', text: '我对着远山喊“你好”。平常远山也会回我“你好”，今天却没有。' },
      { speaker: 'cast', text: '远山送回来的声音，就叫回声。我们再试一次吧！' },
      { speaker: 'npc', text: '轮到你啦。你想先对着远山说什么？' },
    ],
    dialogue: '你想先对着远山说什么？',
    choices: [
      { id: 'hello', label: '说“你好”', voiceHints: ['你好', '说你好', '喊你好', '山你好'], result: '你喊了一声“你好”。过了一会儿，远山也传来一声“你好”。这就是回声！', trait: 'bold' },
      { id: 'here', label: '说“我来啦”', voiceHints: ['我来啦', '我来了', '说我来啦', '喊我来了'], result: '你喊“我来啦”。远处也轻轻回答“我来啦”。回声真的回来了！', trait: 'bold' },
      { id: 'clap', label: '拍拍手', voiceHints: ['拍手', '拍拍手', '拍两下', '鼓掌'], result: '你拍了两下手。远处也传来两下轻轻的拍手声。回声会学声音！', trait: 'make' },
    ],
    reward: 'listeningShell', petLine: '我听懂了。我们发出声音，远处再送回来，这就是回声！',
  },
  {
    id: 'whisper-slope', chapter: 1, name: '萤火草地', place: 'meadow', sceneId: 'meadow', objective: '让风里的小回声听清一句短短的话。',
    npc: { name: '林间小鹿', templateId: 'forest-deer', entrance: 'grass', voice: 'sprout' },
    cast: [
      { name: '落叶小刺猬', templateId: 'leaf-hedgehog', voice: 'bubble', line: '风里有一个只说了一半的小回声。' },
    ],
    conversation: [
      { speaker: 'cast', text: '听！草地那边有个小声音在说：“来……啦……”' },
      { speaker: 'npc', text: '它只说回来一半，可能是大风让它没有听清。' },
      { speaker: 'cast', text: '我们说短一点、慢一点，小回声就能听明白。' },
      { speaker: 'npc', text: '你想用什么办法，让小回声听清楚？' },
    ],
    dialogue: '你想用什么办法，让小回声听清楚？',
    choices: [
      { id: 'slow', label: '慢慢说“你好”', voiceHints: ['慢慢说', '说你好', '慢一点', '你好'], result: '你慢慢说“你、好”。草地那边清楚地回答：“你、好！”', trait: 'patient' },
      { id: 'together', label: '大家一起说', voiceHints: ['一起说', '大家说', '一块说', '一起喊'], result: '大家一起说“我来啦”。风里马上送回一声清楚的“我来啦”。', trait: 'together' },
      { id: 'clap', label: '先拍两下手', voiceHints: ['拍手', '拍两下', '先拍手', '鼓掌'], result: '你先拍两下手。小回声跟着拍了两下，终于找到了我们。', trait: 'make' },
    ],
    reward: 'starThread', petLine: '发光小绳亮起来了。它在告诉我们，小回声往玩具阁楼去了！',
  },
  {
    id: 'backward-market', chapter: 2, name: '玩具阁楼', place: 'market', sceneId: 'attic', objective: '看懂灯塔小信，找到下一段路。',
    npc: { name: '竹叶熊猫', templateId: 'bamboo-panda', entrance: 'box', voice: 'bubble' },
    cast: [
      { name: '豆豆小狗', templateId: 'bean-dog', voice: 'sprout', line: '发光小绳在木箱旁边亮起来了。' },
    ],
    conversation: [
      { speaker: 'cast', text: '汪！发光小绳在这个木箱旁边亮起来了。' },
      { speaker: 'npc', text: '箱子里有一封小信。信上写着：“请来灯塔找我。”' },
      { speaker: 'cast', text: '信上还画着一座黑黑的灯塔，可是没有写名字。' },
      { speaker: 'npc', text: '你想先用什么办法，找到写信的朋友？' },
    ],
    dialogue: '你想先用什么办法，找到写信的朋友？',
    choices: [
      { id: 'ask-owl', label: '去问屋顶的小鸮', voiceHints: ['问小鸮', '找小鸮', '去屋顶', '问猫头鹰'], result: '你拿着信去问小鸮。小鸮一眼就认出了信上的灯塔。', trait: 'care' },
      { id: 'look-picture', label: '仔细看信上的图', voiceHints: ['看图', '看看画', '仔细看', '看灯塔'], result: '你仔细看了看，发现灯塔旁边画着小鸮家的屋顶。', trait: 'listen' },
      { id: 'call-friend', label: '大声问“是谁呀”', voiceHints: ['是谁', '问一问', '大声问', '谁写的'], result: '你问“是谁写的信呀？”屋顶上传来小鸮的回答：“我知道！”', trait: 'bold' },
    ],
    reward: 'unsentGreeting', petLine: '信上画着灯塔。屋顶的小鸮一定知道该往哪里走。',
  },
  {
    id: 'moon-post', chapter: 2, name: '屋顶晚风', place: 'post', sceneId: 'rooftop', objective: '告诉灯塔里的朋友，我们马上就到。',
    npc: { name: '书桌小鸮', templateId: 'book-owl', entrance: 'reflection', voice: 'moss' },
    cast: [
      { name: '卷尾小狐狸', templateId: 'curl-fox', voice: 'sprout', line: '我们找到写信的朋友了吗？' },
    ],
    conversation: [
      { speaker: 'cast', text: '小鸮，我们找到一封画着灯塔的小信。' },
      { speaker: 'npc', text: '这是月牙小猫写的！她在黑黑的灯塔里等我们。' },
      { speaker: 'cast', text: '我们快去找她吧。别让她一个人等太久。' },
      { speaker: 'npc', text: '出发前，你想怎样告诉小猫，我们马上就到？' },
    ],
    dialogue: '你想怎样告诉小猫，我们马上就到？',
    choices: [
      { id: 'call', label: '大声说“我们来啦”', voiceHints: ['我们来啦', '我们来了', '大声说', '喊她'], result: '你对着灯塔喊“我们来啦”。远处传回一声小小的“来啦”。', trait: 'bold' },
      { id: 'wave', label: '请小伙伴挥挥手', voiceHints: ['挥手', '招手', '伙伴挥手', '让它挥手'], result: '小伙伴站到高处用力挥手。灯塔的窗边也出现一只挥动的小爪子。', trait: 'together' },
      { id: 'lamp', label: '带一盏小灯过去', voiceHints: ['小灯', '带灯', '点灯', '拿一盏灯'], result: '你点亮一盏小灯。灯塔的窗户也闪了一下，像是在回答你。', trait: 'care' },
    ],
    consume: 'unsentGreeting', reward: 'lighthouseSeed', petLine: '小鸮送给我们一颗发光种子。灯塔就在前面，我们出发吧！',
  },
  {
    id: 'silent-lighthouse', chapter: 3, name: '灯塔窗台', place: 'lighthouse', sceneId: 'castle-window', objective: '陪月牙小猫走到开灯的按钮旁。',
    npc: { name: '月牙小猫', templateId: 'moon-cat', entrance: 'curtain', voice: 'star' },
    cast: [
      { name: '书桌小鸮', templateId: 'book-owl', voice: 'moss', line: '小猫，我们来陪你开灯了。' },
    ],
    conversation: [
      { speaker: 'cast', text: '小猫，我们来了。灯塔怎么还是黑黑的？' },
      { speaker: 'npc', text: '外面的风太大了。我有点害怕，不敢一个人去按开灯的按钮。' },
      { speaker: 'cast', text: '没关系，我们会陪着你。你不用一个人去。' },
      { speaker: 'npc', text: '你想先怎样帮我走到按钮旁边？' },
    ],
    dialogue: '你想先怎样帮小猫走到按钮旁边？',
    choices: [
      { id: 'hold-hands', label: '拉着手一起走', voiceHints: ['拉手', '牵手', '一起走', '陪她走'], result: '你拉着小猫的手，一步一步走到按钮旁边。小猫不再发抖了。', trait: 'care' },
      { id: 'small-light', label: '先开一盏小灯', voiceHints: ['开小灯', '先点灯', '小灯', '照亮'], result: '你先打开一盏小灯。房间亮了一点，小猫看清了前面的路。', trait: 'patient' },
      { id: 'count', label: '一起数“一二三”', voiceHints: ['一二三', '数数', '一起数', '数到三'], result: '大家一起数“一、二、三！”小猫鼓起勇气，按下了开灯按钮。', trait: 'together' },
    ],
    reward: null, petLine: '小猫不害怕了。现在只要把发光种子种到海边，灯塔就能亮起来！',
  },
  {
    id: 'page-sea', chapter: 3, name: '贝壳海边', place: 'sea', sceneId: 'seaside', objective: '说一句话，让灯塔把声音送远再送回来。',
    npc: { name: '云朵羊驼', templateId: 'cloud-alpaca', entrance: 'lantern', voice: 'bubble' },
    cast: [
      { name: '月牙小猫', templateId: 'moon-cat', voice: 'star', line: '发光种子已经种好啦。' },
    ],
    conversation: [
      { speaker: 'cast', text: '发光种子已经种好啦！还差一句声音，灯塔才会亮。' },
      { speaker: 'npc', text: '你说一句，灯塔会把它送到远处，再送回到我们耳边。' },
      { speaker: 'cast', text: '送回来的声音，就叫回声。我终于明白啦！' },
      { speaker: 'npc', text: '最后一句交给你。你想让大家一起喊什么？' },
    ],
    dialogue: '你想让大家一起喊什么？',
    choices: [
      { id: 'hello', label: '一起喊“你好”', voiceHints: ['你好', '喊你好', '说你好', '大家好'], result: '大家一起喊“你好！”灯塔亮了，远山也清楚地回答：“你好！”', trait: 'together' },
      { id: 'here', label: '一起喊“我们来啦”', voiceHints: ['我们来啦', '我们来了', '喊我们来了', '来啦'], result: '大家一起喊“我们来啦！”海面和远山都送回一声“我们来啦！”', trait: 'bold' },
      { id: 'thanks', label: '一起喊“谢谢你”', voiceHints: ['谢谢', '谢谢你', '说谢谢', '感谢'], result: '大家一起喊“谢谢你！”灯塔转了一圈，远处也回答：“谢谢你！”', trait: 'care' },
    ],
    consume: 'lighthouseSeed', reward: null, petLine: '你听，远处也在学我们说话。回声回来啦！', final: true,
  },
];
