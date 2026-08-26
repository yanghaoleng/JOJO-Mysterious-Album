import { storyCharacterTemplateById } from './story-character-templates.js';

export const STORY_ID = 'lost-echo';
export const STORY_GUIDE_TEMPLATE = storyCharacterTemplateById('curl-fox');

export const GUIDES = [
  {
    id: 'curl-fox', name: '小卷', mark: '狐', voice: 'sprout',
    manner: '会等你说完，再把听到的特征画进宠物身上',
    hello: '你好，我是小卷。故事开始前，我会随机给你分配一只小宠物。你回答三个问题，我就按你的描述把它画出来。',
  },
];

export const INTERVIEW_QUESTIONS = [
  { id: 'appearance', question: '你希望小宠物最特别的地方是什么？', hint: '可以说大耳朵、亮眼睛、软尾巴，或者你想到的样子。' },
  { id: 'color', question: '你希望小宠物身上有什么颜色？', hint: '说一种或几种颜色都可以。' },
  { id: 'companion', question: '你希望它怎样陪着你？', hint: '比如活泼一点、安静听你说，或者勇敢地一起行动。' },
];

export const ITEMS = {
  listeningShell: { id: 'listeningShell', name: '听风贝', image: './assets/story/items/listening-shell.webp', short: '能听见很小的声音。', description: '河湾小水獭送来的贝壳。', use: '先听清别人需要什么。' },
  starThread: { id: 'starThread', name: '星线团', image: './assets/story/items/star-thread.webp', short: '能把分开的声音连起来。', description: '林间小鹿找到的发光线团。', use: '把两段没有说完的话连起来。' },
  unsentGreeting: { id: 'unsentGreeting', name: '问候小信', image: './assets/story/items/unsent-greeting.webp', short: '上面写着“我来陪你了”。', description: '竹叶熊猫保管的小信。', use: '送给正在等朋友的人。' },
  lighthouseSeed: { id: 'lighthouseSeed', name: '灯塔种子', image: './assets/story/items/lighthouse-seed.webp', short: '种下去就能点亮灯塔。', description: '书桌小鸮送来的发光种子。', use: '让散开的回声找到回家的路。' },
};

export const CHAPTERS = [
  { id: 'hear-the-sound', number: 1, title: '先听清声音', promise: '找到是谁在发出很小的声音。' },
  { id: 'deliver-the-message', number: 2, title: '把问候送到', promise: '把小信交给正在等待的朋友。' },
  { id: 'light-the-tower', number: 3, title: '点亮回声灯塔', promise: '让每一段声音都能被听见。' },
];

export const SCENES = [
  {
    id: 'paper-harbor', chapter: 1, name: '纸船小溪', place: 'harbor', sceneId: 'paper-creek', objective: '找出小溪里很轻的声音。',
    npc: { name: '河湾小水獭', templateId: 'river-otter', entrance: 'door', voice: 'moss' },
    cast: [
      { name: '池塘小蛙', templateId: 'pond-frog', line: '我也听见水下面有声音。' },
      { name: '雪团小兔', templateId: 'snow-rabbit', line: '我们可以一起仔细听。' },
    ],
    entranceLine: '河湾小水獭抱着一只贝壳走过来。', dialogue: '水下面有个很小的声音。你想怎么找到它？',
    choices: [
      { id: 'water', label: '仔细听水下面', voiceHints: ['听水下', '水里', '仔细听', '用耳朵'], result: '你安静听了一会儿，发现是一只纸船在敲石头。', trait: 'listen' },
      { id: 'pet', label: '请宠物一起找', voiceHints: ['宠物', '一起找', '伙伴', '帮忙'], result: '你和小宠物一起靠近水边，很快找到了纸船。', trait: 'together' },
      { id: 'call', label: '问是谁在那里', voiceHints: ['问一问', '谁在那里', '大声问', '叫它'], result: '你问了一声，纸船马上轻轻敲了两下石头。', trait: 'bold' },
    ],
    reward: 'listeningShell', petLine: '我们找到声音了。听风贝也送给我们啦。',
  },
  {
    id: 'whisper-slope', chapter: 1, name: '萤火草地', place: 'meadow', sceneId: 'meadow', objective: '帮小鹿把一句话送过草地。',
    npc: { name: '林间小鹿', templateId: 'forest-deer', entrance: 'grass', voice: 'sprout' },
    cast: [
      { name: '落叶小刺猬', templateId: 'leaf-hedgehog', line: '风一吹，声音就会散开。' },
      { name: '云朵羊驼', templateId: 'cloud-alpaca', line: '我可以帮忙挡一挡风。' },
    ],
    entranceLine: '林间小鹿从草叶后面走出来。', dialogue: '风会把我的话吹散。你想怎么帮我把话送过去？',
    choices: [
      { id: 'tie', label: '用线把话连起来', voiceHints: ['用线', '连起来', '打结', '系起来'], result: '你把每句话连在线上，风再也吹不散它们了。', trait: 'make' },
      { id: 'repeat', label: '一起慢慢重复', voiceHints: ['重复', '再说一遍', '一起说', '慢慢说'], result: '大家一起慢慢说，整句话顺利传到了草地另一边。', trait: 'together' },
      { id: 'draw', label: '把话画下来', voiceHints: ['画下来', '画画', '变成图', '写下来'], result: '你把听到的话画成图，小鹿一看就明白了。', trait: 'make' },
    ],
    reward: 'starThread', petLine: '原来声音也可以用线和图画保存下来。',
  },
  {
    id: 'backward-market', chapter: 2, name: '玩具阁楼', place: 'market', sceneId: 'attic', objective: '找到问候小信的收件人。',
    npc: { name: '竹叶熊猫', templateId: 'bamboo-panda', entrance: 'box', voice: 'bubble' },
    cast: [
      { name: '豆豆小狗', templateId: 'bean-dog', line: '我可以闻一闻信从哪里来。' },
      { name: '月牙小猫', templateId: 'moon-cat', line: '信里也许有一条线索。' },
    ],
    entranceLine: '竹叶熊猫打开旧木箱，拿出一封小信。', dialogue: '这封信没有写名字。你想怎么找收件人？',
    choices: [
      { id: 'carry', label: '带着信去问', voiceHints: ['去问', '找人', '带着信', '问路'], result: '你带着信问了几位朋友，大家都指向屋顶。', trait: 'care' },
      { id: 'open', label: '先问能不能看', voiceHints: ['先问', '打开看看', '看信', '读一读'], result: '熊猫同意后，你看到信上写着“我来陪你了”。', trait: 'listen' },
      { id: 'wait', label: '先在这里等', voiceHints: ['等一下', '在这里等', '等人回来', '等等看'], result: '你等了一会儿，听见屋顶传来慢慢的脚步声。', trait: 'patient' },
    ],
    reward: 'unsentGreeting', petLine: '线索很清楚，等信的人就在屋顶。',
  },
  {
    id: 'moon-post', chapter: 2, name: '屋顶晚风', place: 'post', sceneId: 'rooftop', objective: '把问候小信送给小鸮。',
    npc: { name: '书桌小鸮', templateId: 'book-owl', entrance: 'reflection', voice: 'moss' },
    cast: [
      { name: '卷尾小狐狸', templateId: 'curl-fox', line: '我们终于找到收件人了。' },
      { name: '蜜糖小熊', templateId: 'honey-bear', line: '把信交给它吧。' },
    ],
    entranceLine: '书桌小鸮站在屋顶边，正在等一个朋友。', dialogue: '我一直在等这封信。你想怎么把它交给我？',
    choices: [
      { id: 'hand', label: '亲手交给它', voiceHints: ['交给它', '递给它', '亲手', '送信'], result: '你把信交给小鸮，它高兴地把信抱在胸前。', trait: 'care' },
      { id: 'pet-deliver', label: '请宠物递信', voiceHints: ['宠物递', '伙伴送', '让它交', '请小宠物'], result: '小宠物稳稳地递出信，还清楚地说出了问候。', trait: 'together' },
      { id: 'say', label: '再说一句我们来了', voiceHints: ['我们来了', '说一句', '打招呼', '告诉它'], result: '你说“我们来了”，小鸮马上露出了笑脸。', trait: 'bold' },
    ],
    consume: 'unsentGreeting', reward: 'lighthouseSeed', petLine: '问候送到了，小鸮送给我们一颗灯塔种子。',
  },
  {
    id: 'silent-lighthouse', chapter: 3, name: '城堡窗台', place: 'lighthouse', sceneId: 'castle-window', objective: '问清楚灯塔为什么没有亮。',
    npc: { name: '月牙小猫', templateId: 'moon-cat', entrance: 'curtain', voice: 'star' },
    cast: [
      { name: '书桌小鸮', templateId: 'book-owl', line: '我们会等你把话说完。' },
      { name: '林间小鹿', templateId: 'forest-deer', line: '不用着急，慢慢说就好。' },
    ],
    entranceLine: '月牙小猫从窗帘后面走出来。', dialogue: '我怕大家不听完，所以没有点灯。你想先怎么做？',
    choices: [
      { id: 'listen', label: '先听它说完', voiceHints: ['听它说完', '先听', '不打断', '听风贝'], result: '你没有打断。小猫把担心全部说完，轻松了很多。', trait: 'listen' },
      { id: 'connect', label: '请大家一起听', voiceHints: ['一起听', '叫大家', '连起来', '星线'], result: '大家围成一圈，每个人都安静听小猫把话说完。', trait: 'together' },
      { id: 'invite', label: '邀请它一起点灯', voiceHints: ['一起点灯', '邀请它', '一起帮忙', '让它来'], result: '你邀请小猫一起点灯，它勇敢地走到了最前面。', trait: 'care' },
    ],
    reward: null, petLine: '只要认真听完，安静就不会让人害怕。',
  },
  {
    id: 'page-sea', chapter: 3, name: '贝壳海边', place: 'sea', sceneId: 'seaside', objective: '种下种子，点亮回声灯塔。',
    npc: { name: '云朵羊驼', templateId: 'cloud-alpaca', entrance: 'lantern', voice: 'bubble' },
    cast: [
      { name: '池塘小蛙', templateId: 'pond-frog', line: '回声已经在等灯亮了。' },
      { name: '河湾小水獭', templateId: 'river-otter', line: '最后一步交给你来决定。' },
    ],
    entranceLine: '云朵羊驼带大家来到海边的灯塔下。', dialogue: '灯塔可以开始转了。你想让光先照向哪里？',
    choices: [
      { id: 'home', label: '先照回家的声音', voiceHints: ['回家的声音', '照回家', '旧回声', '回到原来'], result: '灯光照向远处，旧回声一个接一个找到了家。', trait: 'care' },
      { id: 'new', label: '先照还没说的话', voiceHints: ['没说出口', '新的声音', '还没说', '等它们'], result: '灯光停在海面上，安静等待新的声音准备好。', trait: 'patient' },
      { id: 'both', label: '慢慢转一整圈', voiceHints: ['转一圈', '两边都照', '全部照亮', '都要'], result: '灯塔慢慢转了一圈，旧回声和新声音都被照亮了。', trait: 'together' },
    ],
    consume: 'lighthouseSeed', reward: null, petLine: '回声都回家了。谢谢你一直认真听，也认真回答。', final: true,
  },
];
