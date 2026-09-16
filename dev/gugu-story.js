// 《等一个肚子的回答》——独立故事版
// 由《哇呜！第一束好奇光》第一章《是谁在咚咚响？》改编：
// 保留原交互骨架（听声、点灯、收音机、造钥匙、收颜色、海螺引路），
// 台词按儿童文学优化版「温柔陪伴风」重写。
// 陪伴伙伴小灯担任引导，鼓鼓为故事主人；两个选择同等有效，不评分。
const torch = { id: 'torch', name: '好奇手电筒', description: '把你的话变成光。停下来时，也会留着光等你。' };
const radio = { id: 'radio', name: '唔姆收音机', description: '把问候寄给MOMO，听它慢慢说完。' };
const jar = { id: 'jar', name: '颜色罐', description: '保存旅途中找到的颜色，休息时也不会消失。' };
const yellow = { id: 'gugu-color', name: '暖暖黄', description: '第一滴颜色：身体说的话，有人认真听。', color: '#F8CE5B' };

const guguScenes = [
  {
    id: 'gugu-room', title: '星星窗的小房间', chapter: 1, world: 'bakery',
    objective: '先认识新朋友，再听听房间里的声音。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'companion', text: '你好呀，我是小灯。我们来到了一间小房间，这里有一扇星星窗，还有一盏还没亮的小灯。' },
      { speaker: 'companion', text: '在出发之前，我该怎么叫你？' },
    ],
    question: '想让我怎么叫你？',
    choices: [
      { id: 'star', label: '小星星', hints: ['星星', '小星星'], result: '好，小星星，我记住啦。', speaker: 'companion', action: 'celebrate', expression: 'happy' },
      { id: 'moon', label: '小月亮', hints: ['月亮', '小月亮'], result: '好，小月亮，我记住啦。', speaker: 'companion', action: 'celebrate', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '你听——房间深处，有轻轻的声音。咚、咚。像有什么话，想被人听见。' },
    ],
  },
  {
    id: 'gugu-sound', title: '房间里的咚咚声', chapter: 1, world: 'bakery',
    objective: '对房间里的声音说一句话。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'companion', text: '咚、咚。你听见了吗？那个声音，好像在等谁先开口。' },
    ],
    question: '你想对房间里的声音说什么？',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'companion', text: '原来这盏灯会把声音变成光。它叫好奇手电筒，会一直留着这格光，等你。' },
    ],
    question: '再送它一句话，看看光照到哪里。',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'companion', text: '这里叫哇呜星。没被人听过的提问，会悄悄结成灰灰雾。雾不坏，只是把想说的话藏住了。' },
      { speaker: 'companion', text: '刚才的咚咚，会不会就是一个藏起来的提问？' },
    ],
    question: '你想和我一起去找它吗？',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'companion', text: '小毛球可能听不清我们。收音机可以把你的问候轻轻送过去——就像敲敲门，问一声：你好吗？' },
    ],
    question: '借收音机，和它打个招呼吧。',
    choices: [
      { id: 'hello', label: '你好呀，你也在听吗？', hints: ['你好', '在听', '打招呼'], result: '你的问候到啦。雾散开了一点，小毛球抬起头。', speaker: 'companion', action: 'listen', expression: 'happy', reward: radio },
      { id: 'okay', label: '你好，你还好吗？', hints: ['你好', '还好', '好吗'], result: '你的问候到啦。雾散开了一点，小毛球动了动耳朵。', speaker: 'companion', action: 'listen', expression: 'happy', reward: radio },
    ],
    closing: [
      { speaker: 'gugu', text: '你的问候，我收到啦。你好，我叫鼓鼓。' },
    ],
  },
  {
    id: 'gugu-feeling', title: '听鼓鼓说', chapter: 1, world: 'bakery',
    objective: '听听鼓鼓想说的话。',
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'gugu', text: '我的肚子一直咚咚响。不是它不乖……是它在说：我在这里，等一个人听。' },
    ],
    question: '你想问鼓鼓什么？',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'gugu', text: '现在肚子空空的，它就一直轻轻提醒我：嘿，记得照顾我呀。' },
    ],
    question: '你想怎样陪鼓鼓？',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'gugu', text: '空白的地方，好像在想：会有什么样的想法，来打开我呢？' },
    ],
    question: '你的钥匙是什么颜色、什么形状？',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'gugu', text: '鼓鼓坐下，吃了一小口点心。咚、咚……声音慢慢安静下来。' },
      { speaker: 'gugu', text: '它说：谢谢你，愿意听我说完。' },
    ],
    question: '你想把哪句话留在花园的小桌上？',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'gugu', text: '鼓声变成了一滴暖暖黄——像被人轻轻接住的感觉。鼓鼓递来颜色罐：它会把今天收好。以后你想它了，随时可以来看。' },
    ],
    question: '你觉得这滴暖暖黄像什么？',
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
    cast: [{ id: 'gugu', type: 'bear', name: '鼓鼓', color: '#c39666', voice: 'moss' }],
    dialogue: [
      { speaker: 'gugu', text: '黄光照见窗边一枚海螺。海螺里传来水声，还有一个小小的声音：海的这一边……有人愿意听我说吗？' },
    ],
    question: '你想给海螺那一边回什么话？',
    choices: [
      { id: 'listen', label: '我听见你了。', hints: ['听见', '听', '你'], result: '海螺轻轻亮了一下，像记住了你的话。', speaker: 'gugu', action: 'listen', expression: 'happy' },
      { id: 'slow', label: '慢慢说，我在听。', hints: ['慢', '说', '在听'], result: '海螺轻轻亮了一下，像记住了你的话。', speaker: 'gugu', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'gugu', text: '从咚咚声到第一滴暖暖黄，你一直认真听着。' },
    ],
    final: true,
  },
];

export const GUGU_DEV_STORY = {
  id: 'gugu', title: '等一个肚子的回答', subtitle: '鼓鼓的肚子在咚咚响。不是它不乖，是它在等一个人听。',
  onboarding: 'direct',
  age: '5～8 岁', companion: 'rabbit', companionName: '小灯', color: '#F8CE5B',
  premise: '你听——咚、咚、咚。先靠近一点，听它说完。',
  chapters: [
    { id: 'belly', number: 1, title: '是谁在咚咚响？', promise: '听清一句身体的话，收下第一滴暖暖黄。' },
  ],
  scenes: guguScenes,
  ending: {
    title: '第一滴暖暖黄',
    text: '从咚咚声到第一滴暖暖黄，你一直认真听着。',
    companionLine: '身体的话，说出来就轻了。你想说的时候，我会听。',
  },
};
