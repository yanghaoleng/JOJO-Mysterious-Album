// 《等一个肚子的回答》——独立故事版（完整六章）
// 由《哇呜！第一束好奇光》六章改编：
// 温柔陪伴风：小灯（陪伴伙伴）全程引导，鼓鼓是第一位朋友。
// 每个提问都给孩子明确的范围暗示，孩子照着说也能被接住。
// 两个选择同等有效，不评分；孩子自报的名字会被记住并用来称呼。
import { createWowCharacter } from './wow-visuals.js';

const torch = { id: 'torch', name: '好奇手电筒', description: '把你的话变成光。停下来时，也会留着光等你。' };
const radio = { id: 'radio', name: '唔姆收音机', description: '把问候寄给朋友，听它慢慢说完。' };
const jar = { id: 'jar', name: '颜色罐', description: '保存旅途中找到的颜色，休息时也不会消失。' };
const yellow = { id: 'gugu-color', name: '暖暖黄', description: '第一滴颜色：身体说的话，有人认真听。', color: '#F8CE5B' };
const blue = { id: 'gugu-blue', name: '深深蓝', description: '第二滴颜色：被遮住的声音，有人愿意听。', color: '#5794DB' };
const white = { id: 'gugu-white', name: '轻轻白', description: '第三滴颜色：想说的话，可以慢慢说。', color: '#E8F1FA' };
const green = { id: 'gugu-green', name: '慢慢绿', description: '第四滴颜色：大大的一天，从小小一步开始。', color: '#93BC8B' };
const pink = { id: 'gugu-pink', name: '柔柔粉', description: '第五滴颜色：原来的样子，也可以很好玩。', color: '#E6A9BB' };
const gold = { id: 'gugu-gold', name: '闪闪金', description: '第六滴颜色：不必比谁更亮，你也发光。', color: '#DCAE52' };

const guguScenes = [
  // ───────── 第一章 · 是谁在咚咚响？ ─────────
  {
    id: 'gugu-room', title: '星星窗的小房间', chapter: 1, world: 'bakery', nickname: true,
    objective: '先认识新朋友，再听听房间里的声音。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'companion', text: '你好呀，我是小灯。我们来到了一间小房间，这里有一扇星星窗，还有一盏还没亮的小灯。' },
      { speaker: 'companion', text: '在出发之前，我该怎么叫你？说一个你喜欢的名字就可以，比如“小星星”。' },
    ],
    question: '想让我怎么叫你？说出你的名字吧。',
    choices: [
      { id: 'star', label: '我叫小星星', hints: ['星星', '小星星'], result: '好，小星星，我记住啦。', speaker: 'companion', action: 'celebrate', expression: 'happy' },
      { id: 'moon', label: '我叫小月亮', hints: ['月亮', '小月亮'], result: '好，小月亮，我记住啦。', speaker: 'companion', action: 'celebrate', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '你听——房间深处，有轻轻的声音。咚、咚。像有什么话，想被人听见。' },
    ],
  },
  {
    id: 'gugu-sound', title: '房间里的咚咚声', chapter: 1, world: 'bakery',
    objective: '对房间里的声音说一句话。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'companion', text: '咚、咚。你听见了吗？那个声音，好像在等谁先开口。' },
    ],
    question: '你想对房间里的声音说什么？可以告诉它你听见了，也可以问问它是谁。',
    choices: [
      { id: 'heard', label: '我听到了。', hints: ['听到', '听见', '听到了'], result: '嗯，你听到了它。小灯也听到了。', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'where', label: '咚咚声，你在哪里？', hints: ['哪里', '在哪', '咚咚'], result: '声音从房间深处传来，轻轻的、一下一下的。', speaker: 'companion', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'companion', text: '你一说话，小灯就亮了一点。' },
    ],
  },
  {
    id: 'gugu-light', title: '第一束光', chapter: 1, world: 'bakery',
    objective: '送一句话给灯，看看光照到哪里。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'companion', text: '原来这盏灯会把声音变成光。它叫好奇手电筒，会一直留着这格光，等你。' },
    ],
    question: '再送它一句话吧，看看光照到哪里。可以是一句问候，也可以是你心里的话。',
    choices: [
      { id: 'look', label: '我们一起去看看。', hints: ['一起', '看看', '去看'], result: '光往前照了一点，照亮了房间深处。', speaker: 'companion', action: 'glow', expression: 'happy', reward: torch },
      { id: 'here', label: '别怕，我在这里。', hints: ['不怕', '别怕', '在这里'], result: '光暖暖地亮着，像有人陪着。', speaker: 'companion', action: 'glow', expression: 'happy', reward: torch },
    ],
    closing: [
      { speaker: 'companion', text: '前面有一团灰灰的雾，雾里好像藏着什么。' },
    ],
  },
  {
    id: 'gugu-world', title: '光照见哇呜星', chapter: 1, world: 'bakery',
    objective: '看看灰灰雾里藏着什么。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'companion', text: '这里叫哇呜星。没被人听过的提问，会悄悄结成灰灰雾。雾不坏，只是把想说的话藏住了。' },
      { speaker: 'companion', text: '刚才的咚咚，会不会就是一个藏起来的提问？' },
    ],
    question: '你想和我一起去找它吗？可以说“我们去吧”，也可以问“它想说什么”。',
    choices: [
      { id: 'go', label: '我们一起去吧。', hints: ['一起', '去吧', '去'], result: '好，我们一起去。雾那边，好像有什么在动。', speaker: 'companion', action: 'listen', expression: 'curious' },
      { id: 'ask', label: '它想说什么呢？', hints: ['什么', '说', '想问'], result: '我也想知道。走近一点，也许就听见了。', speaker: 'companion', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'companion', text: '雾后面，有一只小毛球。它好像也听见了咚咚声。' },
    ],
  },
  {
    id: 'gugu-radio', title: '寄出一声问候', chapter: 1, world: 'bakery',
    objective: '用收音机送出一声问候。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'companion', text: '小毛球可能听不清我们。收音机可以把你的问候轻轻送过去——就像敲敲门，问一声：你好吗？' },
    ],
    question: '借收音机，和它打个招呼吧。可以说“你好”，也可以问问“你还好吗”。',
    choices: [
      { id: 'hello', label: '你好呀，你也在听吗？', hints: ['你好', '在听', '打招呼'], result: '你的问候到啦。雾散开了一点，小毛球抬起头。', speaker: 'companion', action: 'listen', expression: 'happy', reward: radio },
      { id: 'okay', label: '你好，你还好吗？', hints: ['你好', '还好', '好吗'], result: '你的问候到啦。雾散开了一点，小毛球动了动耳朵。', speaker: 'companion', action: 'listen', expression: 'happy', reward: radio },
    ],
    closing: [
      { speaker: 'gugu', text: '{playerName}，你的问候，我收到啦。你好，我叫鼓鼓。' },
    ],
  },
  {
    id: 'gugu-feeling', title: '听鼓鼓说', chapter: 1, world: 'bakery',
    objective: '听听鼓鼓想说的话。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'gugu', text: '我的肚子一直咚咚响。不是它不乖……是它在说：我在这里，等一个人听。' },
    ],
    question: '你想问鼓鼓什么？可以问问它的肚子，也可以问问它想要什么。',
    choices: [
      { id: 'belly', label: '你的肚子想说什么？', hints: ['肚子', '想说什么', '说'], result: '它想告诉我：嘿，记得照顾我呀。', speaker: 'gugu', action: 'listen', expression: 'sad' },
      { id: 'stop', label: '你希望它停下来吗？', hints: ['停', '希望', '安静'], result: '我希望它停下来，也希望大家听见它。', speaker: 'gugu', action: 'listen', expression: 'sad' },
    ],
    closing: [
      { speaker: 'gugu', text: '我想起来啦。刚才我一直玩，忘了吃点东西。' },
    ],
  },
  {
    id: 'gugu-question', title: '听听身体的话', chapter: 1, world: 'bakery',
    objective: '陪鼓鼓听听肚子在提醒什么。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'gugu', text: '现在肚子空空的，它就一直轻轻提醒我：嘿，记得照顾我呀。' },
    ],
    question: '你想怎样陪鼓鼓？可以去找点吃的，也可以先坐一会儿。',
    choices: [
      { id: 'snack', label: '我们去找点吃的吧。', hints: ['吃', '点心', '找'], result: '好，我们去找点心花园！', speaker: 'gugu', action: 'celebrate', expression: 'happy' },
      { id: 'sit', label: '我陪你坐一会儿。', hints: ['坐', '陪', '一会儿'], result: '谢谢你陪我。坐一会儿，心里也暖暖的。', speaker: 'gugu', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'gugu', text: '点心花园就在前面。可门打不开——门上没有锁，只有一片空白。' },
    ],
  },
  {
    id: 'gugu-key', title: '一把自己的钥匙', chapter: 1, world: 'bakery',
    objective: '用你的想法，做一把钥匙。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'gugu', text: '空白的地方，好像在想：会有什么样的想法，来打开我呢？' },
    ],
    question: '你的钥匙是什么颜色、什么形状？可以说一个颜色，再加一个形状。',
    choices: [
      { id: 'bread', label: '黄色，像一片面包。', hints: ['黄色', '面包', '黄'], result: '一片黄色面包钥匙，慢慢长出来啦。', speaker: 'gugu', action: 'glow', expression: 'happy' },
      { id: 'moon', label: '粉色，像弯弯的月亮。', hints: ['粉色', '月亮', '粉'], result: '一把粉色月亮钥匙，慢慢长出来啦。', speaker: 'gugu', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'gugu', text: '钥匙放上去，门轻轻开了。' },
    ],
  },
  {
    id: 'gugu-garden', title: '点心花园', chapter: 1, world: 'bakery',
    objective: '在花园的小桌上留一句话。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'gugu', text: '鼓鼓坐下，吃了一小口点心。咚、咚……声音慢慢安静下来。' },
      { speaker: 'gugu', text: '它说：谢谢你，愿意听我说完。' },
    ],
    question: '把一句话留在花园的小桌上吧。可以是一句谢谢，也可以是你想记住的话。',
    choices: [
      { id: 'body', label: '原来身体也会说话。', hints: ['身体', '说话', '原来'], result: '这句话留在小桌上，以后来还能看到。', speaker: 'gugu', action: 'celebrate', expression: 'happy' },
      { id: 'heard', label: '被听见的感觉真好。', hints: ['听见', '感觉', '真好'], result: '这句话留在小桌上，以后来还能看到。', speaker: 'gugu', action: 'celebrate', expression: 'happy' },
    ],
    closing: [
      { speaker: 'gugu', text: '咚、咚……声音变成了一滴暖暖黄。' },
    ],
  },
  {
    id: 'gugu-color', title: '第一滴暖暖黄', chapter: 1, world: 'bakery',
    objective: '收下第一滴颜色。',
    wow: { prop: 'jar' },
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'gugu', text: '鼓声变成了一滴暖暖黄——像被人轻轻接住的感觉。鼓鼓递来颜色罐：它会把今天收好。以后你想它了，随时可以来看。' },
    ],
    question: '你觉得这滴暖暖黄像什么？像一样暖暖的东西就可以。',
    choices: [
      { id: 'bread', label: '像热乎乎的小面包。', hints: ['面包', '热乎乎', '像'], result: '暖暖黄收进颜色罐啦，像热乎乎的小面包。', speaker: 'gugu', action: 'celebrate', expression: 'happy', reward: yellow },
      { id: 'hug', label: '像被抱了一下的光。', hints: ['抱', '光', '像'], result: '暖暖黄收进颜色罐啦，像被抱了一下的光。', speaker: 'gugu', action: 'celebrate', expression: 'happy', reward: yellow },
    ],
    closing: [
      { speaker: 'gugu', text: '颜色罐收好了一滴暖暖黄。窗边，好像有什么在轻轻响。' },
    ],
  },
  {
    id: 'gugu-shell', title: '海螺那边的声音', chapter: 1, world: 'bakery',
    objective: '给海螺那一边，回一句话。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' }],
    dialogue: [
      { speaker: 'gugu', text: '黄光照见窗边一枚海螺。海螺里传来水声，还有一个小小的声音：海的这一边……有人愿意听我说吗？' },
    ],
    question: '给海螺那一边回一句话吧。可以告诉它“我听见你了”，也可以说一句你的话。',
    choices: [
      { id: 'listen', label: '我听见你了。', hints: ['听见', '听', '你'], result: '海螺轻轻亮了一下，像记住了你的话。', speaker: 'gugu', action: 'listen', expression: 'happy' },
      { id: 'slow', label: '慢慢说，我在听。', hints: ['慢', '说', '在听'], result: '海螺轻轻亮了一下，像记住了你的话。', speaker: 'gugu', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '海螺里的水声变亮了。那一边，好像也有一片蓝蓝的海洋。' },
    ],
  },

  // ───────── 第二章 · 海螺里少了一种声音 ─────────
  {
    id: 'gugu-sea-window', title: '哗啦啦海洋星', chapter: 2, world: 'reef',
    objective: '认识灰灰，先仔细看看海底。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'huihui', name: '灰灰', color: '#5794DB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'fish', color: '#5794DB', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '海螺通向哗啦啦海洋星。小鱼灰灰从一只空瓶后探出头，身上的蓝色淡了。' },
      { speaker: 'companion', text: '海底有片地方，被杂物盖得严严的。灰灰好像很在意那里。' },
    ],
    question: '你想先仔细看看哪里？可以看看空瓶的后面，也可以听听哪边有水声。',
    choices: [
      { id: 'look', label: '看看空瓶的后面。', hints: ['空瓶', '后面', '看'], result: '你看见空瓶下面压着几片小贝壳，还有一条细细的缝。', speaker: 'companion', action: 'listen', expression: 'curious' },
      { id: 'hear', label: '听听哪一边有水声。', hints: ['水声', '听', '哪边'], result: '你听见右边有轻轻的“咔嗒”声，像小贝壳在开合。', speaker: 'companion', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'huihui', text: '你愿意停下来看我看见的东西，我好开心。' },
    ],
  },
  {
    id: 'gugu-sea-listen', title: '听灰灰说', chapter: 2, world: 'reef',
    objective: '听听灰灰最在意什么。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'huihui', name: '灰灰', color: '#5794DB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'fish', color: '#5794DB', scale }) },
    ],
    dialogue: [
      { speaker: 'huihui', text: '我最喜欢听小贝壳唱歌。可是杂物遮住了它们，声音也闷闷的，蓝颜色就慢慢淡了。' },
    ],
    question: '你想问灰灰什么？可以问问小贝壳怎么唱歌，也可以问问哪里最需要帮忙。',
    choices: [
      { id: 'sing', label: '小贝壳原来怎么唱歌？', hints: ['唱歌', '贝壳', '怎么'], result: '它们会轻轻开合，像在打拍子，一开一合就是一节歌。', speaker: 'huihui', action: 'listen', expression: 'happy' },
      { id: 'help', label: '哪里最需要留一条小路？', hints: ['小路', '哪里', '需要'], result: '就在空瓶下面。那条细缝后面，贝壳正等着被看见。', speaker: 'huihui', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'huihui', text: '我看见了！空瓶下面有一条细缝，贝壳正在那里开合。' },
    ],
  },
  {
    id: 'gugu-sea-plan', title: '指一条小路', chapter: 2, world: 'reef',
    objective: '把发现的小线索告诉回收车。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'huihui', name: '灰灰', color: '#5794DB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'fish', color: '#5794DB', scale }) },
    ],
    dialogue: [
      { speaker: 'huihui', text: '海底的回收小车能搬走杂物。我们先给它指路吧，告诉它往哪里走。' },
    ],
    question: '把你发现的小线索告诉回收车。可以说“跟着细缝走”，也可以说“先听歌声再靠近”。',
    choices: [
      { id: 'seam', label: '跟着空瓶下面的细缝走。', hints: ['细缝', '跟着', '下面'], result: '回收车点点头，顺着细缝慢慢开过去。', speaker: 'companion', action: 'glow', expression: 'happy' },
      { id: 'song', label: '先听到歌声，再慢慢靠近。', hints: ['歌声', '靠近', '先'], result: '回收车竖起耳朵，循着歌声轻轻开过去。', speaker: 'companion', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'huihui', text: '回收车停在一道贝壳门前。门上留着熟悉的空白——它在等你的想法。' },
    ],
  },
  {
    id: 'gugu-sea-key', title: '一把海洋的钥匙', chapter: 2, world: 'reef',
    objective: '用你的想法，做一把钥匙。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'huihui', name: '灰灰', color: '#5794DB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'fish', color: '#5794DB', scale }) },
    ],
    dialogue: [
      { speaker: 'huihui', text: '你的想法可以变成钥匙，让小车走到贝壳身边。它是什么颜色、什么形状呢？' },
    ],
    question: '这把海洋的钥匙是什么颜色、什么形状？可以说一个颜色，再加一个形状。',
    choices: [
      { id: 'wave', label: '蓝色，像卷起来的海浪。', hints: ['蓝色', '海浪', '卷'], result: '一把蓝色海浪钥匙，在海里轻轻转了一圈。', speaker: 'companion', action: 'glow', expression: 'happy' },
      { id: 'kelp', label: '绿色，像一条海带。', hints: ['绿色', '海带', '绿'], result: '一把绿色海带钥匙，在水里轻轻摆了一下。', speaker: 'companion', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '钥匙打开门，小车慢慢搬走杂物。贝壳的歌，响起来啦。' },
    ],
  },
  {
    id: 'gugu-sea-color', title: '深深蓝回来了', chapter: 2, world: 'reef',
    objective: '收下第二滴颜色。',
    wow: { prop: 'jar' },
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'huihui', name: '灰灰', color: '#5794DB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'fish', color: '#5794DB', scale }) },
    ],
    dialogue: [
      { speaker: 'huihui', text: '贝壳的歌响起来，深深蓝回到灰灰身上，也落进你的颜色罐。' },
    ],
    question: '给新露出来的小路起个名字吧。可以说“听得见的小路”，也可以自己起一个。',
    choices: [
      { id: 'way', label: '听得见的小路。', hints: ['听得见', '小路', '名字'], result: '好，这条小路叫“听得见的小路”，深深蓝收好啦。', speaker: 'huihui', action: 'celebrate', expression: 'happy', reward: blue },
      { id: 'songway', label: '贝壳唱歌路。', hints: ['唱歌', '贝壳', '名字'], result: '好，这条小路叫“贝壳唱歌路”，深深蓝收好啦。', speaker: 'huihui', action: 'celebrate', expression: 'happy', reward: blue },
    ],
    closing: [
      { speaker: 'huihui', text: '歌声传到海面，一滴水轻轻弹起来：“上面的云好像也有话想说。”' },
    ],
  },
  {
    id: 'gugu-sea-to-cloud', title: '海面那朵云', chapter: 2, world: 'reef',
    objective: '带一句话，去见那朵云。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'huihui', name: '灰灰', color: '#5794DB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'fish', color: '#5794DB', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '你沿着水光向上看，一朵云正微微发抖。它好像有什么话，想被人听见。' },
    ],
    question: '要带着哪句话去见那朵云？可以说“我们会慢慢听你说”，也可以说“你为什么发抖”。',
    choices: [
      { id: 'listen', label: '我们会慢慢听你说。', hints: ['慢慢', '听', '说'], result: '这句话变成一缕轻轻的水光，托着你往云朵那边去。', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'why', label: '云朵，你为什么在发抖？', hints: ['发抖', '为什么', '云'], result: '云朵停了一下，好像听见了你。它抖得更轻了一点。', speaker: 'companion', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'companion', text: '越靠近，云朵就越清楚。它把自己抱得紧紧的，肚子一抖一抖。' },
    ],
  },

  // ───────── 第三章 · 云朵可以慢慢说 ─────────
  {
    id: 'gugu-cloud-arrival', title: '呼呼呼天气星', chapter: 3, world: 'cloud',
    objective: '认识憋憋，温柔地开始说话。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'biebie', name: '憋憋', color: '#E8F1FA', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'cloud', color: '#E8F1FA', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '这就是呼呼呼天气星。云朵憋憋把自己抱得紧紧的，肚子一抖一抖。身旁的小风也放轻了声音。' },
    ],
    question: '你想怎样开始和憋憋说话？可以坐在它旁边，也可以问问它现在感觉怎么样。',
    choices: [
      { id: 'sit', label: '我可以坐在你旁边吗？', hints: ['坐', '旁边', '可以'], result: '憋憋轻轻挪了挪，给你留出一小片软软的云。', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'feel', label: '你现在感觉怎么样？', hints: ['感觉', '怎么样', '现在'], result: '憋憋愣了愣，小声说：还没人这样问过我。', speaker: 'biebie', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'biebie', text: '我从来没哭过。我把好多感觉装在里面，怕一开口就下雨。' },
    ],
  },
  {
    id: 'gugu-cloud-listen', title: '听憋憋说', chapter: 3, world: 'cloud',
    objective: '听听憋憋的担心。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'biebie', name: '憋憋', color: '#E8F1FA', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'cloud', color: '#E8F1FA', scale }) },
    ],
    dialogue: [
      { speaker: 'biebie', text: '我从来没哭过。我把好多感觉装在里面，怕一开口就下雨。可我也不知道，雨落下来会怎么样。' },
    ],
    question: '你想了解憋憋的哪一个担心？可以问“雨落在哪里”，也可以说“先试一小滴”。',
    choices: [
      { id: 'where', label: '你最担心雨落在哪里？', hints: ['担心', '雨', '哪里'], result: '我怕雨落下来，会把别人的晴天弄湿。', speaker: 'biebie', action: 'listen', expression: 'sad' },
      { id: 'drop', label: '我们可以先试一小滴吗？', hints: ['试', '一小滴', '先'], result: '一小滴？憋憋想了想：好像……没有那么可怕。', speaker: 'biebie', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'biebie', text: '我想让雨落在一片柔软的叶子上。今天下不下雨，都由我自己决定。' },
    ],
  },
  {
    id: 'gugu-cloud-choice', title: '找个舒服的地方', chapter: 3, world: 'cloud',
    objective: '陪憋憋找一个舒服的地方。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'biebie', name: '憋憋', color: '#E8F1FA', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'cloud', color: '#E8F1FA', scale }) },
    ],
    dialogue: [
      { speaker: 'biebie', text: '你愿意陪我找个舒服的地方吗？想下雨的时候，我想有个安安静静的角落。' },
    ],
    question: '怎样的地方会让你觉得舒服？可以说“有大叶子”，也可以说“安安静静”。',
    choices: [
      { id: 'leaf', label: '有一片大叶子，可以坐着。', hints: ['叶子', '坐着', '大'], result: '大叶子托着憋憋，像一把软软的小伞。', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'quiet', label: '安安静静，想说时再说。', hints: ['安静', '想说', '再说'], result: '憋憋缩在云里：好，那我就慢慢来。', speaker: 'biebie', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '前面是一扇风的小门，门后有一片叶子露台。门也在等你的想法。' },
    ],
  },
  {
    id: 'gugu-cloud-key', title: '一把轻轻的钥匙', chapter: 3, world: 'cloud',
    objective: '做一把轻轻的钥匙。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'biebie', name: '憋憋', color: '#E8F1FA', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'cloud', color: '#E8F1FA', scale }) },
    ],
    dialogue: [
      { speaker: 'biebie', text: '风的小门不催人。请把想法交给它，我们做一把轻轻的钥匙，去露台歇一歇。' },
    ],
    question: '这把轻轻的钥匙是什么颜色和形状？可以说一个颜色，再加一个形状。',
    choices: [
      { id: 'feather', label: '白色，像软软的羽毛。', hints: ['白色', '羽毛', '白'], result: '一把白色羽毛钥匙，轻飘飘地落在门上。', speaker: 'companion', action: 'glow', expression: 'happy' },
      { id: 'leaf', label: '蓝色，像一片大叶子。', hints: ['蓝色', '叶子', '蓝'], result: '一把蓝色叶子钥匙，轻轻放在风门上。', speaker: 'companion', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '门开了。憋憋在露台坐了一会儿，自己落下一滴小雨。' },
    ],
  },
  {
    id: 'gugu-cloud-color', title: '轻轻白落下来', chapter: 3, world: 'cloud',
    objective: '收下第三滴颜色。',
    wow: { prop: 'jar' },
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'biebie', name: '憋憋', color: '#E8F1FA', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'cloud', color: '#E8F1FA', scale }) },
    ],
    dialogue: [
      { speaker: 'biebie', text: '憋憋在露台坐了一会儿，自己落下一滴小雨：“这样轻松一点啦。”轻轻白落进颜色罐，云边透出光。' },
    ],
    question: '你想留一句什么话陪着憋憋？可以说“想说的时候我会听”，也可以说“哭一会儿也行”。',
    choices: [
      { id: 'listen', label: '想说的时候，我会听。', hints: ['想说', '听', '时候'], result: '这句话化作一朵小小的云，轻轻陪在憋憋身边。', speaker: 'companion', action: 'celebrate', expression: 'happy', reward: white },
      { id: 'rest', label: '哭一会儿，歇一会儿都可以。', hints: ['哭', '歇', '可以'], result: '憋憋眨眨眼：原来哭一会儿，也是可以的呀。', speaker: 'biebie', action: 'listen', expression: 'happy', reward: white },
    ],
    closing: [
      { speaker: 'companion', text: '小雨落到一串风铃上，叮、嗒、叮……最后两声碰在一起。' },
    ],
  },
  {
    id: 'gugu-cloud-to-time', title: '风铃下面的声音', chapter: 3, world: 'cloud',
    objective: '回应风铃下面的声音。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'biebie', name: '憋憋', color: '#E8F1FA', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'cloud', color: '#E8F1FA', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '风铃下面传来一个嘟嘟囔囔的声音：“糟啦，我又把早晚排反了。”' },
    ],
    question: '你想怎么回应它？可以说“没关系，我们慢慢理一理”，也可以问“你原来想先做什么”。',
    choices: [
      { id: 'okay', label: '没关系，我们慢慢理一理。', hints: ['没关系', '慢慢', '理'], result: '那个声音安静下来：“真的可以慢慢来吗？”', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'first', label: '你原来想先做什么？', hints: ['先', '做什么', '原来'], result: '“我想先散步！”它说，“结果一着急，先把早饭端起来了。”', speaker: 'companion', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'companion', text: '风铃下是嘀嗒嘀嗒时间星。一个抱枕、一盘早餐，正挤在一起。' },
    ],
  },

  // ───────── 第四章 · 把今天排成自己的样子 ─────────
  {
    id: 'gugu-time-arrival', title: '嘀嗒嘀嗒时间星', chapter: 4, world: 'home',
    objective: '认识乱乱，看看今天混在一起的东西。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'luanluan', name: '乱乱', color: '#93BC8B', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'clock', color: '#93BC8B', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '时钟乱乱一手抱着枕头，一手端着早餐：“咦，星星亮着，我怎么又准备起床啦？”' },
    ],
    question: '你发现了哪两个混在一起的东西？可以说“早餐和枕头”，也可以说“星星亮着还没休息”。',
    choices: [
      { id: 'mix', label: '早餐和枕头在一起。', hints: ['早餐', '枕头', '一起'], result: '对呀，一个要起床、一个要睡觉，两个愿望撞在一起啦。', speaker: 'companion', action: 'listen', expression: 'curious' },
      { id: 'night', label: '星星亮着，乱乱还没休息。', hints: ['星星', '休息', '亮'], result: '乱乱看看窗外：“原来现在是晚上呀，我完全弄反了。”', speaker: 'luanluan', action: 'listen', expression: 'surprised' },
    ],
    closing: [
      { speaker: 'luanluan', text: '我想散步，想吃饭，也想睡觉，想着想着就全挤在一起了。' },
    ],
  },
  {
    id: 'gugu-time-listen', title: '听乱乱说', chapter: 4, world: 'home',
    objective: '听听乱乱现在最需要什么。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'luanluan', name: '乱乱', color: '#93BC8B', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'clock', color: '#93BC8B', scale }) },
    ],
    dialogue: [
      { speaker: 'luanluan', text: '不是每件事都要现在做，对不对？可我总怕漏掉哪一件。' },
    ],
    question: '你想先听听乱乱现在最需要什么？可以问它困不困，也可以问哪件事最舒服。',
    choices: [
      { id: 'sleepy', label: '你现在困不困呀？', hints: ['困', '现在', '睡'], result: '乱乱揉揉眼睛：“有一点……刚才就是被自己吓醒的。”', speaker: 'luanluan', action: 'listen', expression: 'happy' },
      { id: 'cozy', label: '哪一件事让你最舒服？', hints: ['舒服', '哪件', '最'], result: '乱乱想了想：“散步最舒服。可我想先把今天安排好。”', speaker: 'luanluan', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'luanluan', text: '我现在有一点困。等醒来，我想吃早餐，再出去走走。' },
    ],
  },
  {
    id: 'gugu-time-plan', title: '先……再……', chapter: 4, world: 'home',
    objective: '给自己安排一小段舒服的今天。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'luanluan', name: '乱乱', color: '#93BC8B', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'clock', color: '#93BC8B', scale }) },
    ],
    dialogue: [
      { speaker: 'luanluan', text: '大大的一天，可以先从小小的一步开始。先做一件，再做下一件。' },
    ],
    question: '给自己也安排一段“先……再……”吧。可以说“先休息，再看看窗外”。',
    choices: [
      { id: 'rest', label: '先休息，再看看窗外。', hints: ['先', '休息', '窗外'], result: '好，先休息，再看窗外。一步一步来，今天不会跑掉的。', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'eat', label: '先吃点东西，再慢慢散步。', hints: ['先', '吃', '散步'], result: '好，先吃点东西，再慢慢散步。乱乱点点头，记住了这个顺序。', speaker: 'companion', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'luanluan', text: '我的休息小屋就在这里。门不催人，等你做一把自己的钥匙。' },
    ],
  },
  {
    id: 'gugu-time-key', title: '一把慢慢来的钥匙', chapter: 4, world: 'home',
    objective: '做一把慢慢来的钥匙。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'luanluan', name: '乱乱', color: '#93BC8B', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'clock', color: '#93BC8B', scale }) },
    ],
    dialogue: [
      { speaker: 'luanluan', text: '我们把刚才说好的第一步，放进今天。请做一把自己的钥匙。' },
    ],
    question: '这把慢慢来的钥匙是什么颜色和形状？可以说一个颜色，再加一个形状。',
    choices: [
      { id: 'tree', label: '绿色，像一棵小树。', hints: ['绿色', '小树', '绿'], result: '一把绿色小树钥匙，慢慢转开了小屋的门。', speaker: 'companion', action: 'glow', expression: 'happy' },
      { id: 'sun', label: '黄色，像圆圆的太阳。', hints: ['黄色', '太阳', '黄'], result: '一把黄色太阳钥匙，暖洋洋地打开小屋。', speaker: 'companion', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '钥匙转了一圈，风铃跟着放慢。乱乱把枕头放好：“先休息，其他事等一等。”' },
    ],
  },
  {
    id: 'gugu-time-color', title: '慢慢绿舒展开', chapter: 4, world: 'home',
    objective: '收下第四滴颜色。',
    wow: { prop: 'jar' },
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'luanluan', name: '乱乱', color: '#93BC8B', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'clock', color: '#93BC8B', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '慢慢绿在颜色罐里舒展开来，像一小片安静的草地。乱乱准备休息了。' },
    ],
    question: '你想对准备休息的乱乱说什么？可以说“好好睡”，也可以说“今天不用一次做完”。',
    choices: [
      { id: 'sleep', label: '好好睡，醒来再慢慢来。', hints: ['睡', '醒来', '慢慢'], result: '乱乱抱着枕头：“好，醒来再慢慢来。”慢慢绿收好啦。', speaker: 'luanluan', action: 'celebrate', expression: 'happy', reward: green },
      { id: 'once', label: '今天不用一次做完所有事。', hints: ['一次', '所有', '不用'], result: '乱乱松了一口气：“对，今天不用一次做完。”慢慢绿收好啦。', speaker: 'luanluan', action: 'celebrate', expression: 'happy', reward: green },
    ],
    closing: [
      { speaker: 'companion', text: '小屋的灯柔柔亮起，门边多了一条影子。它往墙角缩了缩。' },
    ],
  },
  {
    id: 'gugu-time-to-shadow', title: '墙角的影子', chapter: 4, world: 'home',
    objective: '给墙角的影子留一句话。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'luanluan', name: '乱乱', color: '#93BC8B', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'clock', color: '#93BC8B', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '影子小声说：“如果能看见我，会不会觉得我很奇怪？”' },
    ],
    question: '你想给墙角的影子留什么话？可以说“我想认识你”，也可以说“你可以待在舒服的地方”。',
    choices: [
      { id: 'know', label: '我想认识原来的你。', hints: ['认识', '原来', '想'], result: '影子轻轻晃了晃：“真的吗？那我出来一点点。”', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'stay', label: '你可以先待在舒服的地方。', hints: ['舒服', '待', '地方'], result: '影子停住：“好，那我不急。”它往灯下挪了挪。', speaker: 'companion', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '门边的影子通向一片新的星光。那里有一条弯弯长长的路。' },
    ],
  },

  // ───────── 第五章 · 一条不必笔直的路 ─────────
  {
    id: 'gugu-shadow-arrival', title: '影子影子星', chapter: 5, world: 'meadow',
    objective: '认识躲躲，看看它的样子。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'duoduo', name: '躲躲', color: '#E6A9BB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'shadow', color: '#E6A9BB', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '影子躲躲贴在墙边，忽长忽短：“我的样子总在变，好像怎么站都不对。”' },
    ],
    question: '你看见躲躲哪些有意思的样子？可以说“长长的像小河”，也可以说“圆圆的像小猫”。',
    choices: [
      { id: 'long', label: '长长的，像一条小河。', hints: ['长', '小河', '像'], result: '躲躲伸长了一点：“小河……原来长长的也可以好看。”', speaker: 'duoduo', action: 'listen', expression: 'curious' },
      { id: 'round', label: '圆圆的，像躺着的小猫。', hints: ['圆', '小猫', '像'], result: '躲躲缩成一团：“像小猫？那还挺可爱的。”', speaker: 'duoduo', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'duoduo', text: '我怕别人只喜欢又直又整齐的影子。所以我一直躲着。' },
    ],
  },
  {
    id: 'gugu-shadow-listen', title: '听躲躲说', chapter: 5, world: 'meadow',
    objective: '让躲躲知道，自己被听见了。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'duoduo', name: '躲躲', color: '#E6A9BB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'shadow', color: '#E6A9BB', scale }) },
    ],
    dialogue: [
      { speaker: 'duoduo', text: '你愿意听我说，而不是催我走出来吗？' },
    ],
    question: '你想怎么让躲躲知道自己被听见？可以说“按自己的速度来”，也可以说“样子有很多种”。',
    choices: [
      { id: 'pace', label: '你可以按自己的速度来。', hints: ['速度', '自己', '慢慢'], result: '躲躲的轮廓松了一点：“按我的速度……好。”', speaker: 'duoduo', action: 'listen', expression: 'happy' },
      { id: 'many', label: '你的样子也可以有很多种。', hints: ['很多种', '样子', '可以'], result: '躲躲眨眨眼：“很多种……原来不是只有一种才对。”', speaker: 'duoduo', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'duoduo', text: '我想试一小步，可广场只有一条笔直的线。' },
    ],
  },
  {
    id: 'gugu-shadow-path', title: '一条弯弯的路', chapter: 5, world: 'meadow',
    objective: '把路想成自己喜欢的样子。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'duoduo', name: '躲躲', color: '#E6A9BB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'shadow', color: '#E6A9BB', scale }) },
    ],
    dialogue: [
      { speaker: 'duoduo', text: '要是路也能弯弯的，我就能带着自己的样子去散步了。' },
    ],
    question: '你愿意把这条路想成什么样？可以说“像河流弯弯地走”，也可以说“像小花有好几个方向”。',
    choices: [
      { id: 'river', label: '像河流一样，弯弯地走。', hints: ['河流', '弯弯', '走'], result: '路变弯了。躲躲沿着弯弯的小河，慢慢走了两步。', speaker: 'companion', action: 'glow', expression: 'happy' },
      { id: 'flower', label: '像小花一样，有好多方向。', hints: ['小花', '方向', '好多'], result: '路开出几朵小花。躲躲绕着它们，左右都走了走。', speaker: 'companion', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'duoduo', text: '广场门上也有一块空白。我们把喜欢的形状放进去，做一把钥匙吧。' },
    ],
  },
  {
    id: 'gugu-shadow-key', title: '一把弯弯的钥匙', chapter: 5, world: 'meadow',
    objective: '做一把属于自己形状的钥匙。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'duoduo', name: '躲躲', color: '#E6A9BB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'shadow', color: '#E6A9BB', scale }) },
    ],
    dialogue: [
      { speaker: 'duoduo', text: '让钥匙先走一小步，打开一条可以弯弯曲曲的路。' },
    ],
    question: '你的钥匙是什么颜色、什么形状？可以说一个颜色，再加一个形状。',
    choices: [
      { id: 'petal', label: '粉色，像弯弯的花瓣。', hints: ['粉色', '花瓣', '弯'], result: '一把粉色花瓣钥匙，把门轻轻推开了。', speaker: 'companion', action: 'glow', expression: 'happy' },
      { id: 'star', label: '紫色，像歪歪的小星星。', hints: ['紫色', '星星', '歪'], result: '一把紫色星星钥匙，歪歪地转开了门。', speaker: 'companion', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '门开了。躲躲自己选了一条弯路，走一点，又停下来。' },
    ],
  },
  {
    id: 'gugu-shadow-color', title: '柔柔粉落下来', chapter: 5, world: 'meadow',
    objective: '收下第五滴颜色。',
    wow: { prop: 'jar' },
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'duoduo', name: '躲躲', color: '#E6A9BB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'shadow', color: '#E6A9BB', scale }) },
    ],
    dialogue: [
      { speaker: 'duoduo', text: '躲躲走了一点，又停下来：“原来的我，也能来玩。”柔柔粉轻轻落进颜色罐。' },
    ],
    question: '你想给“原来的自己”说句话吗？可以说“我的样子也可以很好玩”，也可以说“我可以慢慢试”。',
    choices: [
      { id: 'fun', label: '我的样子，也可以很好玩。', hints: ['好玩', '样子', '自己'], result: '躲躲转了个圈：“对，我的样子也可以很好玩。”柔柔粉收好啦。', speaker: 'duoduo', action: 'celebrate', expression: 'happy', reward: pink },
      { id: 'try', label: '我可以慢慢试，不用着急。', hints: ['慢慢', '试', '着急'], result: '躲躲点点头：“我可以慢慢试。”柔柔粉收好啦。', speaker: 'duoduo', action: 'celebrate', expression: 'happy', reward: pink },
    ],
    closing: [
      { speaker: 'duoduo', text: '躲躲顺着弯路抬头：“这里有一点光，一直陪着我的影子。”' },
    ],
  },
  {
    id: 'gugu-shadow-to-star', title: '那一点光', chapter: 5, world: 'meadow',
    objective: '和那一点光打个招呼。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'duoduo', name: '躲躲', color: '#E6A9BB', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'shadow', color: '#E6A9BB', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '天上，一颗小星星正努力把那一点光藏起来。它好像觉得自己的光太小了。' },
    ],
    question: '你想怎样和那一点光打招呼？可以说“我看见你的光了”，也可以问“你叫什么名字”。',
    choices: [
      { id: 'see', label: '我看见你的一点光了。', hints: ['看见', '一点光', '光'], result: '那颗小星星愣了一下：“你……看见我了？”', speaker: 'companion', action: 'listen', expression: 'happy' },
      { id: 'name', label: '你愿意告诉我你的名字吗？', hints: ['名字', '告诉', '愿意'], result: '小星星小声说：“我叫点点。我的光，只有一点点。”', speaker: 'companion', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'companion', text: '你来到好大好大小星星。点点缩在星图边上，正看着自己的光发呆。' },
    ],
  },

  // ───────── 第六章 · 原来第一束光是你 ─────────
  {
    id: 'gugu-star-arrival', title: '好大好大小星星', chapter: 6, world: 'observatory',
    objective: '认识点点，听听它的担心。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'diandian', name: '点点', color: '#DCAE52', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'star', color: '#DCAE52', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '点点缩在星图边上：“大家都那么亮，我只有一点点光，是不是还不够呀？”' },
    ],
    question: '你想先问点点什么？可以问“你想用这点光做什么”，也可以问“你喜欢怎样的小星星”。',
    choices: [
      { id: 'do', label: '你想用这一点光做什么？', hints: ['光', '做什么', '用'], result: '点点想了想：“我想给晚回家的朋友留一盏小灯。”', speaker: 'diandian', action: 'listen', expression: 'curious' },
      { id: 'like', label: '你喜欢怎样的小星星？', hints: ['喜欢', '星星', '怎样'], result: '点点小声说：“我喜欢小小的、刚刚好的那种。”', speaker: 'diandian', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'diandian', text: '其实，我想给晚回家的朋友留一盏小灯。小一点也许刚刚好。' },
    ],
  },
  {
    id: 'gugu-star-listen', title: '听点点说', chapter: 6, world: 'observatory',
    objective: '听听这一点光想做什么。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'diandian', name: '点点', color: '#DCAE52', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'star', color: '#DCAE52', scale }) },
    ],
    dialogue: [
      { speaker: 'diandian', text: '我总想等自己变得更亮，才敢开始。可晚回家的朋友，今晚就需要一盏灯呀。' },
    ],
    question: '你觉得这一点光还能陪谁做什么？可以说“陪小猫找枕头”，也可以说“陪问题找朋友”。',
    choices: [
      { id: 'cat', label: '陪小猫找到软软的枕头。', hints: ['小猫', '枕头', '找'], result: '点点眼睛一亮：“对，小猫怕黑，正好需要我。”', speaker: 'diandian', action: 'listen', expression: 'happy' },
      { id: 'question', label: '陪一个小问题找到朋友。', hints: ['问题', '朋友', '找'], result: '点点点点头：“问题在黑夜里转圈圈，有灯就有方向了。”', speaker: 'diandian', action: 'listen', expression: 'curious' },
    ],
    closing: [
      { speaker: 'diandian', text: '我想试着做那盏小灯！星图边上，也给你留着一块空白。' },
    ],
  },
  {
    id: 'gugu-star-wish', title: '一个小小的愿望', chapter: 6, world: 'observatory',
    objective: '说一个小小的愿望。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'diandian', name: '点点', color: '#DCAE52', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'star', color: '#DCAE52', scale }) },
    ],
    dialogue: [
      { speaker: 'diandian', text: '假如有一颗属于你的星星，你希望它陪你做什么？' },
    ],
    question: '说一个小小的、奇奇怪怪的愿望吧。可以说“去听月亮打呼噜”，也可以说“慢慢说完每一个问题”。',
    choices: [
      { id: 'snore', label: '陪我去听月亮打呼噜。', hints: ['月亮', '打呼噜', '听'], result: '点点捂住嘴笑了：“月亮打呼噜，会是嗡嗡声吗？”', speaker: 'diandian', action: 'celebrate', expression: 'happy' },
      { id: 'finish', label: '让我慢慢说完每一个问题。', hints: ['慢慢', '说完', '问题'], result: '点点认真点头：“好，每一个问题，都可以慢慢说完。”', speaker: 'diandian', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '最后这扇门通向回声花园。里面存着一路被听见的话。' },
    ],
  },
  {
    id: 'gugu-star-key', title: '最后一把钥匙', chapter: 6, world: 'observatory',
    objective: '做最后一把钥匙。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'diandian', name: '点点', color: '#DCAE52', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'star', color: '#DCAE52', scale }) },
    ],
    dialogue: [
      { speaker: 'diandian', text: '请做一把喜欢的钥匙，我们进去看看，声音走了多远。' },
    ],
    question: '最后这把钥匙是什么颜色和形状？可以说一个颜色，再加一个形状。',
    choices: [
      { id: 'tail', label: '金色，像一颗有尾巴的星星。', hints: ['金色', '尾巴', '星星'], result: '一把金色星星钥匙，拖着亮亮的小尾巴，转开了花园的门。', speaker: 'companion', action: 'glow', expression: 'happy' },
      { id: 'fly', label: '彩色，像一朵会飞的花。', hints: ['彩色', '会飞', '花'], result: '一把彩色花朵钥匙，轻轻飞起来，打开了花园的门。', speaker: 'companion', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '花园里，点点点起一盏小灯。六种颜色各自发光，谁也不用比谁亮。' },
    ],
  },
  {
    id: 'gugu-star-color', title: '闪闪金落下来', chapter: 6, world: 'observatory',
    objective: '收下第六滴颜色。',
    wow: { prop: 'jar' },
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'diandian', name: '点点', color: '#DCAE52', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'star', color: '#DCAE52', scale }) },
    ],
    dialogue: [
      { speaker: 'diandian', text: '闪闪金落进罐子。六种颜色各自发光——原来小灯也足够照亮回家的路。' },
    ],
    question: '你最想把旅途中的哪一刻留下来？可以说“鼓鼓第一次听见我的时候”，也可以说“我的想法变成钥匙的时候”。',
    choices: [
      { id: 'heard', label: '鼓鼓第一次听见我的时候。', hints: ['鼓鼓', '听见', '第一次'], result: '那一刻收好啦。它是最早的一格光，闪闪金也落进了罐子。', speaker: 'companion', action: 'celebrate', expression: 'happy', reward: gold },
      { id: 'key', label: '我的想法变成钥匙的时候。', hints: ['想法', '钥匙', '变成'], result: '六把钥匙都记着你的想法。闪闪金也落进了罐子。', speaker: 'companion', action: 'celebrate', expression: 'happy', reward: gold },
    ],
    closing: [
      { speaker: 'diandian', text: '“{firstWords}”——还记得吗？这是你来到这里说的第一句话。' },
    ],
  },
  {
    id: 'gugu-star-return', title: '第一束光是你', chapter: 6, world: 'observatory',
    objective: '听见自己的话回来。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'diandian', name: '点点', color: '#DCAE52', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'star', color: '#DCAE52', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '它走过六个世界，今天，我们把它轻轻说给你听。' },
    ],
    question: '听见自己的话回来，你想说什么？可以说“原来你们一直记得”，也可以说“我的话真的被听见了”。',
    choices: [
      { id: 'remember', label: '原来你们一直记得。', hints: ['记得', '一直', '原来'], result: '“当然记得。它是你在这里的第一句话呀。”', speaker: 'companion', action: 'celebrate', expression: 'happy' },
      { id: 'heard', label: '我的话真的被听见了。', hints: ['听见', '真的', '话'], result: '“对，每一句都被听见了，走过了六个世界。”', speaker: 'companion', action: 'celebrate', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '你说过的话、做过的钥匙，还有我们的相遇，都收进旅程纪念册了。' },
    ],
  },
  {
    id: 'gugu-star-book', title: '旅程纪念册', chapter: 6, world: 'observatory',
    objective: '给这次旅程留最后一句话。',
    cast: [
      { id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'star' },
      { id: 'diandian', name: '点点', color: '#DCAE52', voice: 'clear', createActor: ({ scale }) => createWowCharacter({ kind: 'star', color: '#DCAE52', scale }) },
    ],
    dialogue: [
      { speaker: 'companion', text: '你可以带走它。想回来时，我们再一起听听新问题。' },
    ],
    question: '给这次旅程留最后一句话吧。可以说“明天我还想问一个为什么”，也可以说“今天先休息”。',
    choices: [
      { id: 'tomorrow', label: '明天，我还想问一个为什么。', hints: ['明天', '为什么', '问'], result: '好，明天见。小灯会留着光，等你回来。', speaker: 'companion', action: 'celebrate', expression: 'happy' },
      { id: 'rest', label: '今天先休息，下次再一起玩。', hints: ['休息', '今天', '下次'], result: '好，今天先休息。下次再一起听新问题。', speaker: 'companion', action: 'celebrate', expression: 'happy' },
    ],
    closing: [],
    final: true,
  },
];

export const GUGU_DEV_STORY = {
  id: 'gugu', title: '等一个肚子的回答', subtitle: '鼓鼓的肚子在咚咚响。不是它不乖，是它在等一个人听。',
  onboarding: 'direct', companionVoice: 'clear',
  age: '5～8 岁', companion: 'rabbit', companionName: '小灯', color: '#F8CE5B',
  premise: '你听——咚、咚、咚。先靠近一点，听它说完。',
  chapters: [
    { id: 'belly', number: 1, title: '是谁在咚咚响？', promise: '听清一句身体的话，收下第一滴暖暖黄。' },
    { id: 'sea', number: 2, title: '海螺里少了一种声音', promise: '把被遮住的歌声，重新放出来。' },
    { id: 'cloud', number: 3, title: '云朵可以慢慢说', promise: '陪憋憋找到一种舒服的表达。' },
    { id: 'time', number: 4, title: '把今天排成自己的样子', promise: '把混在一起的愿望，排成一小段舒服的今天。' },
    { id: 'shadow', number: 5, title: '一条不必笔直的路', promise: '让弯弯长长的影子，走一条属于自己的路。' },
    { id: 'star', number: 6, title: '原来第一束光是你', promise: '听见自己的第一句话，带走旅程纪念册。' },
  ],
  scenes: guguScenes,
  ending: {
    title: '第一束光，一直是你的声音',
    text: '六位朋友，六种颜色，还有你亲手想出来的六把钥匙。',
    companionLine: '你最初说：“{firstWords}”我们一直记着。小灯会留着光，等你回来。',
  },
};
