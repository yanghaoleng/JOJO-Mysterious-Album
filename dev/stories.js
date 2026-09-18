// The /dev stories are independent of the published story blueprints.
// Choices are practical suggestions, never a test or a personality score.
import { GUGU_DEV_STORY } from './gugu-story.js';
import { WOW_DEV_STORY } from './wow-story.js';
import { MOON_CURIOSITY_STORY } from './moon-story.js';
import { getNpc } from '../src/story-npcs/catalog.js';

// NPC identity stays separate from the player's saved companion.
function catalogActor(id) {
  const profile = getNpc(id);
  if (!profile) throw new Error(`Missing story NPC: ${id}`);
  return { id, characterId: id, type: id, name: profile.name, voice: profile.voiceKey, speechRate: profile.speechRate };
}

const homeSketch = {
  id: 'home-sketch', name: '回家线索图',
  description: '红屋顶、骨头门牌、小木桥。到岔路口时，一样一样对照。',
};
const riverStamp = {
  id: 'river-stamp', name: '小水滴印章',
  description: '点点送的小纪念：紧张时，可以慢下来，也可以换个办法。',
};
const listeningShell = {
  id: 'listening-shell', name: '听听贝',
  description: '安静听一会儿，贝壳会朝声音回来的方向亮一下。',
};
const lightThread = {
  id: 'light-thread', name: '萤火线团',
  description: '记住萤火虫排出的路，也能照亮一小段黑暗。',
};
const glowSeed = {
  id: 'glow-seed', name: '发光种子',
  description: '小回声带来的种子，到了云洞里会照亮回家的门。',
};

const doudouScenes = [
  {
    id: 'doudou-orchard', title: '苹果树下的小狗', chapter: 1, world: 'orchard',
    objective: '先照顾豆豆，让它歇一会儿。',
    cast: [
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
      { id: 'guoguo', type: 'rabbit', name: '果果', color: '#edc2ac', voice: 'bubble' },
    ],
    dialogue: [
      { speaker: 'guoguo', text: '豆豆，你怎么躲在苹果树下面？' },
      { speaker: 'doudou', text: '我追着苹果跑远了，找不到家。' },
      { speaker: 'guoguo', text: '你先坐下，我这里有水和苹果。' },
      { speaker: 'doudou', text: '谢谢，我的肚子也咕咕叫了。' },
    ],
    question: '我们先给豆豆什么？',
    choices: [
      { id: 'apple', label: '分它半个苹果', hints: ['苹果', '吃', '一半', '半个'], result: '苹果甜甜的，我有力气了。', speaker: 'doudou', action: 'celebrate', expression: 'happy' },
      { id: 'water', label: '给它一杯水', hints: ['水', '喝', '杯子', '口渴'], result: '喝过水，我舒服多了。', speaker: 'doudou', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '我想起来了，我家有红屋顶。' },
      { speaker: 'guoguo', text: '猪小弟正在面包房画画，我们去问问。' },
    ],
  },
  {
    id: 'doudou-bakery', title: '香香的线索图', chapter: 1, world: 'bakery',
    objective: '把豆豆记得的三条线索画下来。',
    cast: [
      catalogActor('zhuxiaodi'),
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
    ],
    dialogue: [
      { speaker: 'zhuxiaodi', text: '慢慢来，我认得你家的骨头门牌。' },
      { speaker: 'doudou', text: '对！回家还要过一座小木桥。' },
      { speaker: 'zhuxiaodi', text: '红屋顶、骨头门牌、小木桥。' },
      { speaker: 'doudou', text: '我怕又忘了，可以画下来吗？' },
      { speaker: 'zhuxiaodi', text: '当然，我喜欢画画。你说，我来画。' },
    ],
    question: '我们先画哪一条线索？',
    choices: [
      { id: 'roof', label: '先画红屋顶', hints: ['屋顶', '红色', '房子', '红'], result: '红屋顶画好了，再慢慢添上门牌和小桥。', speaker: 'zhuxiaodi', action: 'glow', reward: homeSketch, expression: 'happy' },
      { id: 'sign', label: '先画骨头门牌', hints: ['骨头', '门牌', '牌子', '图'], result: '骨头门牌画好了，再慢慢添上屋顶和小桥。', speaker: 'zhuxiaodi', action: 'glow', reward: homeSketch, expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '这就是我家！线索图我拿好了。' },
      { speaker: 'zhuxiaodi', text: '叫叫在河边等你们，沿小路就能看见。' },
    ],
  },
  {
    id: 'doudou-riverbank', title: '在河边等一等', chapter: 2, world: 'bridge',
    objective: '先问豆豆需要怎样的陪伴。',
    cast: [
      catalogActor('jiaojiao'),
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
    ],
    dialogue: [
      { speaker: 'jiaojiao', text: '我是叫叫！找到桥啦，我们——' },
      { speaker: 'doudou', text: '桥找到了，可我的腿还是有点抖。' },
      { speaker: 'jiaojiao', text: '啊，我跑太快了。先听你说完。' },
      { speaker: 'doudou', text: '有人陪着，我会安心一点。' },
      { speaker: 'jiaojiao', text: '勇敢也可以等一等，我们都在这儿。' },
    ],
    question: '等一会儿的时候，怎么陪豆豆？',
    choices: [
      { id: 'sit', label: '坐在它身边', hints: ['坐', '旁边', '身边', '等', '陪'], result: '你坐在这里，我就不着急了。', speaker: 'doudou', action: 'listen', expression: 'happy' },
      { id: 'hand', label: '伸手让它握住', hints: ['手', '牵', '握', '拉'], result: '我握住你的手，准备好了再出发。', speaker: 'doudou', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '我准备好了，不过还想慢慢来。' },
      { speaker: 'jiaojiao', text: '点点在桥头。我去请它带路，你们慢慢来。' },
    ],
  },
  {
    id: 'doudou-crossing', title: '一起到对岸', chapter: 2, world: 'bridge',
    objective: '用豆豆愿意的方式一起过河。',
    cast: [
      { id: 'diandian', type: 'frog', name: '点点', color: '#91ae72', voice: 'bubble' },
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
    ],
    dialogue: [
      { speaker: 'diandian', text: '走桥可以扶栏杆，坐船要先坐稳。' },
      { speaker: 'doudou', text: '哪条路都好，我们别分开。' },
    ],
    question: '我们陪豆豆怎么过河？',
    choices: [
      { id: 'bridge', label: '牵着它慢慢过桥', hints: ['桥', '走', '慢慢', '牵'], result: '一步，再一步，我们走到对岸了！', speaker: 'doudou', action: 'bridge', reward: riverStamp, expression: 'happy' },
      { id: 'boat', label: '坐点点的小船', hints: ['船', '坐', '划', '点点'], result: '大家坐稳，小船轻轻靠到对岸了！', speaker: 'diandian', action: 'boat', reward: riverStamp, expression: 'happy' },
    ],
    closing: [
      { speaker: 'diandian', text: '这枚水滴章，送给一起过河的你们。' },
      { speaker: 'doudou', text: '看，前面有两座小房子！' },
    ],
  },
  {
    id: 'doudou-two-houses', title: '哪一扇门', chapter: 3, world: 'home',
    objective: '对照线索图，找到豆豆家的门。',
    cast: [
      catalogActor('lingdang'),
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
    ],
    dialogue: [
      { speaker: 'lingdang', text: '我是铃铛。等等，我们先对照线索图。' },
      { speaker: 'doudou', text: '我的图上画着红屋顶和骨头门牌。' },
      { speaker: 'lingdang', text: '右边是红屋顶，再找找骨头门牌。' },
    ],
    question: '你想先对照什么？',
    choices: [
      { id: 'check-roof', label: '看看红屋顶', hints: ['屋顶', '红', '右边', '房子'], result: '红屋顶对上了，门口还有骨头牌！', speaker: 'doudou', action: 'glow', expression: 'happy' },
      { id: 'check-sign', label: '看看骨头门牌', hints: ['骨头', '门牌', '牌子'], result: '骨头门牌对上了，上面正是红屋顶！', speaker: 'doudou', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '我认出来了，就是这里！' },
      { speaker: 'lingdang', text: '线索都对上了。轻轻敲门，等妈妈来开。' },
    ],
  },
  {
    id: 'doudou-home', title: '门开了', chapter: 3, world: 'home',
    objective: '把豆豆平安交给妈妈。',
    cast: [
      { id: 'mama', type: 'dog', name: '豆豆妈妈', color: '#b87950', voice: 'moss' },
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
    ],
    dialogue: [
      { speaker: 'mama', text: '豆豆，你回来了！有没有受伤？' },
      { speaker: 'doudou', text: '没有，他们一路都陪着我。' },
      { speaker: 'mama', text: '谢谢你们，可以讲讲路上的事吗？' },
    ],
    question: '先告诉豆豆妈妈哪一件事？',
    choices: [
      { id: 'care', label: '我们照顾豆豆休息', hints: ['休息', '照顾', '苹果', '水', '没有受伤'], result: '谢谢你们先照顾它，让它安心。', speaker: 'mama', action: 'celebrate', expression: 'happy' },
      { id: 'together', label: '我们一直陪着它', hints: ['一起', '陪', '过河', '桥', '船'], result: '谢谢你们一直陪着它回到这里。', speaker: 'mama', action: 'celebrate', expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '我到家啦，下次出门我会先告诉妈妈。' },
      { speaker: 'companion', text: '我们照顾它、听线索，再一起回家。' },
    ],
    final: true,
  },
];


const echoScenes = [
  {
    id: 'echo-cove', title: '一句没说完的话', chapter: 1, world: 'cove',
    objective: '发出一个轻轻的声音，再听它从哪里回来。',
    cast: [
      { id: 'hewan', type: 'otter', name: '河湾', color: '#a88060', voice: 'moss' },
      { id: 'guoguo', type: 'rabbit', name: '果果', color: '#e8c8b7', voice: 'bubble' },
    ],
    dialogue: [
      { speaker: 'guoguo', text: '河湾，小回声刚说到“你好”，就不见了。' },
      { speaker: 'hewan', text: '我们轻轻叫一声，再安静听听。' },
      { speaker: 'guoguo', text: '回来的声音，会告诉我们它往哪儿走。' },
    ],
    question: '想让听听贝先听见什么？',
    choices: [
      { id: 'hello', label: '轻轻说一声你好', hints: ['你好', '嗨', '呼唤', '说'], result: '“你好”轻轻回来了，听听贝朝草地亮了一下。', speaker: 'hewan', action: 'listen', reward: listeningShell, expression: 'curious' },
      { id: 'rhythm', label: '轻轻拍两下手', hints: ['拍', '两下', '节奏', '手'], result: '两下轻响回来了，听听贝朝草地亮了一下。', speaker: 'guoguo', action: 'listen', reward: listeningShell, expression: 'curious' },
    ],
    closing: [
      { speaker: 'hewan', text: '声音碰到远处再回来，就是回声。' },
      { speaker: 'companion', text: '我们带上听听贝，去草地找它。' },
    ],
  },
  {
    id: 'echo-meadow', title: '一盏接一盏', chapter: 1, world: 'meadow',
    objective: '让萤火虫把小回声走过的路亮出来。',
    cast: [
      { id: 'guoguo', type: 'rabbit', name: '果果', color: '#e8c8b7', voice: 'bubble' },
      { id: 'hewan', type: 'otter', name: '河湾', color: '#a88060', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'guoguo', text: '小回声经过时，萤火虫都亮过一下。' },
      { speaker: 'hewan', text: '看，它们正沿着草尖慢慢排队。' },
      { speaker: 'guoguo', text: '我们给它们一个信号，让整条路亮起来。' },
    ],
    question: '想用什么信号和萤火虫打招呼？',
    choices: [
      { id: 'greeting', label: '说一句我们来了', hints: ['来了', '你好', '打招呼', '说'], result: '一盏接一盏亮起来，光线一直伸向月亮。', speaker: 'guoguo', action: 'glow', reward: lightThread, expression: 'happy' },
      { id: 'wave', label: '慢慢挥一挥手', hints: ['挥', '手', '慢', '招手'], result: '萤火虫跟着手势亮起来，光线一直伸向月亮。', speaker: 'hewan', action: 'glow', reward: lightThread, expression: 'happy' },
    ],
    closing: [
      { speaker: 'hewan', text: '收好萤火线团，它能帮我们记住路。' },
      { speaker: 'companion', text: '这本图鉴里，发光的路能通向下一页。' },
    ],
  },
  {
    id: 'echo-moon', title: '月坑边的听听贝', chapter: 2, world: 'moon',
    objective: '听完贝壳里留下的短短一句话。',
    cast: [
      { id: 'yueya', type: 'cat', name: '月牙', color: '#b9c4d4', voice: 'star' },
      { id: 'hewan', type: 'otter', name: '河湾', color: '#a88060', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'yueya', text: '我在月坑旁找到了这枚发亮的贝壳。' },
      { speaker: 'hewan', text: '月球没有空气，我们靠通讯器说话。' },
      { speaker: 'yueya', text: '故事里的贝壳，存着小回声留下的声音。' },
    ],
    question: '我们怎么听清贝壳里的话？',
    choices: [
      { id: 'listen-shell', label: '让听听贝接着听', hints: ['贝', '听', '接着', '安静'], result: '贝壳里说：“我去海底，看看蓝色的气泡。”', speaker: 'yueya', action: 'listen', expression: 'curious' },
      { id: 'play-again', label: '请月牙再放一遍', hints: ['再', '一遍', '重复', '播放', '月牙'], result: '再听一遍，听清了：“我去海底，看看蓝色的气泡。”', speaker: 'yueya', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'hewan', text: '不用着急，没听清就可以再听一次。' },
      { speaker: 'companion', text: '去下一页，找那个蓝色气泡。' },
    ],
  },
  {
    id: 'echo-reef', title: '气泡里的半句话', chapter: 2, world: 'reef',
    objective: '把气泡里的后半句话放出来。',
    cast: [
      { id: 'paopao', type: 'frog', name: '泡泡', color: '#86afa6', voice: 'bubble' },
      { id: 'hewan', type: 'otter', name: '河湾', color: '#a88060', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'paopao', text: '看，气泡里还藏着小回声的半句话。' },
      { speaker: 'hewan', text: '它太小了，我们靠近一点。' },
      { speaker: 'paopao', text: '轻轻碰气泡，或者用听听贝接住它。' },
    ],
    question: '你想怎样听见那半句话？',
    choices: [
      { id: 'touch-bubble', label: '轻碰蓝色气泡', hints: ['碰', '气泡', '戳', '蓝色', '轻'], result: '气泡轻轻打开：“巨人的口袋，好暖和……”', speaker: 'paopao', action: 'glow', expression: 'surprised' },
      { id: 'catch-sound', label: '用听听贝接声音', hints: ['贝', '接', '声音', '听'], result: '听听贝接住了那句：“巨人的口袋，好暖和……”', speaker: 'hewan', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'paopao', text: '我知道那个口袋，里面铺着软毛线。' },
      { speaker: 'companion', text: '我们找到了新方向，一起去看看。' },
    ],
  },
  {
    id: 'echo-pocket', title: '等你慢慢说', chapter: 3, world: 'pocket',
    objective: '让躲在毛线后的小回声知道，大家愿意等。',
    cast: [
      { id: 'xiaohui', type: 'rabbit', name: '小回声', color: '#c4cfdf', voice: 'sprout' },
      { id: 'hewan', type: 'otter', name: '河湾', color: '#a88060', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'hewan', text: '小回声，我们找到你了。' },
      { speaker: 'xiaohui', text: '我说得很小，你们会等我说完吗？' },
      { speaker: 'hewan', text: '会的，你可以慢慢说，也可以先歇一会儿。' },
    ],
    question: '怎么让小回声知道你在这里？',
    choices: [
      { id: 'im-listening', label: '告诉它我在听', hints: ['在听', '我在', '别怕', '慢慢', '等'], result: '我听见了，谢谢你愿意等我。', speaker: 'xiaohui', action: 'listen', reward: glowSeed, expression: 'happy' },
      { id: 'sit-beside', label: '安静坐在旁边', hints: ['坐', '安静', '旁边', '陪', '不说'], result: '你坐在这里，我也知道你愿意陪我。', speaker: 'xiaohui', action: 'listen', reward: glowSeed, expression: 'happy' },
    ],
    closing: [
      { speaker: 'xiaohui', text: '我的家在云洞里，我想和你们一起回去。' },
      { speaker: 'hewan', text: '好，带上你的发光种子，我们陪你走。' },
    ],
  },
  {
    id: 'echo-cloud-home', title: '云洞里的回答', chapter: 3, world: 'cloud',
    objective: '照亮洞口，陪小回声回家。',
    cast: [
      { id: 'xiaohui', type: 'rabbit', name: '小回声', color: '#c4cfdf', voice: 'sprout' },
      { id: 'hewan', type: 'otter', name: '河湾', color: '#a88060', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'xiaohui', text: '这里就是我的家，洞口有一点暗。' },
      { speaker: 'hewan', text: '种子和萤火线团，都能照亮一小段路。' },
      { speaker: 'xiaohui', text: '我想看着你们，慢慢走进去。' },
    ],
    question: '我们用什么照亮小回声的家？',
    choices: [
      { id: 'plant-light', label: '把发光种子放在洞口', hints: ['种子', '洞口', '放', '种'], result: '种子亮起来了，我看见回家的门啦。', speaker: 'xiaohui', action: 'glow', expression: 'happy' },
      { id: 'lay-thread', label: '用萤火线团铺一条路', hints: ['线', '萤火', '铺', '路'], result: '亮亮的小路一直通到家，谢谢你陪我。', speaker: 'xiaohui', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'xiaohui', text: '我回来啦。' },
      { speaker: 'hewan', text: '听，远处也送回一句：我回来啦。' },
      { speaker: 'companion', text: '声音回来了，小回声也到家了。' },
    ],
    final: true,
  },
];

export const STORIES = [
  WOW_DEV_STORY,
  GUGU_DEV_STORY,
  {
    id: 'doudou', title: '送豆豆回家', subtitle: '听线索，慢慢走，一起把小狗送到家。',
    age: '4～6 岁', companion: 'rabbit', companionName: '团团', color: '#91a97b',
    premise: '豆豆追着苹果跑远了。先照顾它，再陪它找到回家的路。',
    chapters: [
      { id: 'care', number: 1, title: '先照顾它', promise: '歇一会儿，把家的线索画下来。' },
      { id: 'cross', number: 2, title: '一起过河', promise: '先等豆豆准备好，再一起到对岸。' },
      { id: 'home', number: 3, title: '平安到家', promise: '对照门牌，把豆豆交给妈妈。' },
    ],
    scenes: doudouScenes,
    ending: { title: '豆豆到家了', text: '从苹果树下到红屋顶的门口，你一直陪着豆豆。', companionLine: '需要帮助时，可以问一问；走得慢，也能一起到家。' },
  },
  MOON_CURIOSITY_STORY,
  {
    id: 'echo', title: '不见了的回声', subtitle: '听完一句小小的话，陪小回声找到家。',
    age: '4～7 岁', companion: 'rabbit', companionName: '软软', color: '#91b5be',
    premise: '小回声说到一半就不见了。听听贝亮了一下，新的路藏在声音里。',
    chapters: [
      { id: 'hear', number: 1, title: '听见小回声', promise: '一个轻轻的声音，点亮下一页的路。' },
      { id: 'follow', number: 2, title: '跟着声音走', promise: '把两段没听完的话，慢慢听清。' },
      { id: 'accompany', number: 3, title: '陪它回家', promise: '愿意等一等，再一起走进亮起来的家。' },
    ],
    scenes: echoScenes,
    ending: { title: '这一次，我们听完了', text: '小回声回到了云洞。那句小小的话，有人听，也有人等。', companionLine: '声音小也没关系。你想说的时候，我会听。' },
  },
];

export function getStory(id) {
  return STORIES.find((story) => story.id === id) || STORIES[0];
}
