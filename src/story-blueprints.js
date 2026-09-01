import { storyCharacterTemplateById } from './story-character-templates.js';

const doudouGuide = storyCharacterTemplateById('river-otter');
const moonGuide = storyCharacterTemplateById('book-owl');

export const STORY_CATALOG = [
  {
    slug: 'doudou',
    id: 'doudou-home',
    title: '送豆豆回家',
    age: '4～6 岁',
    intro: '一只迷路的小狗躲在草丛里，等着有人陪它回家。',
    cover: './assets/story/covers/doudou-home.webp?v=20260901-doudou',
  },
  {
    slug: 'moon',
    id: 'moon-plan',
    title: '登月计划',
    age: '10 岁以上',
    intro: '今晚只有一个目标：想办法登上月球。',
    cover: './assets/story/covers/moon-plan.webp?v=20260901-moon',
  },
];

const DOUDOU_ITEMS = {
  appleClue: {
    id: 'appleClue', name: '半个红苹果', mark: '苹', color: '#b96555',
    short: '豆豆吃完有力气继续走了。', description: '你在苹果园先照顾好饿肚子的豆豆。', use: '提醒大家：先把眼前的小需要照顾好。',
  },
  homeSketch: {
    id: 'homeSketch', name: '回家线索图', mark: '图', color: '#688795',
    short: '红屋顶、骨头门牌和一座小木桥。', description: '阿暖熊把豆豆记得的线索画在纸上。', use: '到了岔路口，把看见的房子和线索一项项对上。',
  },
  duckFeather: {
    id: 'duckFeather', name: '点点的水滴章', mark: '滴', color: '#5f8f9b',
    short: '过桥时得到的一枚蓝色小印章。', description: '点点小蛙看见你耐心陪豆豆过桥，把它送给你。', use: '豆豆紧张时，拿出来提醒它慢慢走也没关系。',
  },
};

const MOON_ITEMS = {
  missionPatch: {
    id: 'missionPatch', name: '登月任务章', mark: '月', color: '#52607c',
    short: '写着今晚唯一的目标：登上月球。', description: '阿策在望远镜山丘交给登月小队。', use: '每次绕路时重新确认最终目标。',
  },
  seaBolt: {
    id: 'seaBolt', name: '深海蓝螺栓', mark: '钉', color: '#5f8f9b',
    short: '能把刚造好的装置固定得更稳。', description: '泡泡小蛙从海底工具箱里找出来的零件。', use: '给下一次改造加一个真正能工作的连接点。',
  },
  pocketThread: {
    id: 'pocketThread', name: '巨人口袋线', mark: '线', color: '#9a745b',
    short: '又轻又结实，卷起来只有一颗纽扣大。', description: '竹叶熊猫从口袋缝边抽出的一小卷线。', use: '搭梯子、系降落伞，或者固定新发明。',
  },
  cloudCompass: {
    id: 'cloudCompass', name: '云层方向针', mark: '云', color: '#8eada9',
    short: '针尖一直朝着月亮最亮的方向。', description: '云朵羊驼从一团积雨云里找出的导航针。', use: '穿过看不清方向的云层。',
  },
};

const doudouScenes = [
  {
    id: 'orchard-bush', chapter: 1, name: '红苹果园', place: 'meadow', sceneId: 'meadow',
    objective: '先照顾好躲在草丛里的豆豆。',
    npc: {
      name: '豆豆小狗', templateId: 'bean-dog', entrance: 'bush', voice: 'sprout',
      intro: '你好，我叫豆豆。我追着一颗红苹果跑远了，现在找不到家。',
    },
    cast: [{
      name: '果果兔', templateId: 'snow-rabbit', entrance: 'left', voice: 'bubble',
      intro: '嗨，我是果果兔。我刚刚追着滚走的苹果，从果园那边跑过来。',
      line: '豆豆先吃一点、喝一点，想起家的线索会更容易。',
    }],
    conversation: [
      { speaker: 'cast', text: '豆豆的肚子咕咕叫，鼻尖也有点干。' },
      { speaker: 'npc', text: '我跑了好久。休息一下，我也许就能想起家在哪里。' },
    ],
    dialogue: '我们先怎么照顾豆豆？可以说“分它半个苹果”，或者“先给它喝点水”。',
    choices: [
      { id: 'share-apple', label: '分它半个苹果', voiceHints: ['半个苹果', '分苹果', '给它苹果', '吃苹果'], result: '你把红苹果分成两半。豆豆慢慢吃完，尾巴又有力气摇起来了。', trait: 'care' },
      { id: 'give-water', label: '先给它喝点水', voiceHints: ['喝水', '给它水', '先喝水', '找水'], result: '你用叶子接来清水。豆豆喝了几口，鼻尖重新变得湿润。', trait: 'patient' },
    ],
    reward: 'appleClue', petLine: '豆豆舒服多了。它记得家里有红屋顶，还有一块骨头形的门牌。',
  },
  {
    id: 'warm-bakery', chapter: 1, name: '阿暖面包房', place: 'breakfast-table', sceneId: 'breakfast-table',
    objective: '把豆豆记得的家画成一张线索图。',
    npc: {
      name: '阿暖熊', templateId: 'honey-bear', entrance: 'door', voice: 'moss',
      intro: '你们好，我是阿暖熊，这间面包房每天都会给附近的小狗烤骨头饼干。',
    },
    cast: [{
      name: '豆豆小狗', templateId: 'bean-dog', entrance: 'left', voice: 'sprout',
      intro: '阿暖熊你好，我是豆豆。我正在找回家的路。',
      line: '我还记得回家前要走过一座吱呀响的小木桥。',
    }],
    conversation: [
      { speaker: 'npc', text: '我见过豆豆妈妈。她家确实有红屋顶，门口还挂着骨头牌。' },
      { speaker: 'cast', text: '对了，回家前还要走过一座会吱呀响的小木桥。' },
    ],
    dialogue: '线索已经有三个：红屋顶、骨头门牌、小木桥。可以说“把三个都画下来”，或者“先画最容易认的骨头门牌”。',
    choices: [
      { id: 'draw-all', label: '把三个都画下来', voiceHints: ['三个都画', '全画下来', '都记下来', '画全部'], result: '阿暖熊画下红屋顶、骨头门牌和小木桥，三条线索一眼就能看清。', trait: 'make' },
      { id: 'draw-sign', label: '先画骨头门牌', voiceHints: ['骨头门牌', '画骨头', '门牌', '先画牌子'], result: '你先把骨头门牌画得大大的，再补上红屋顶和小木桥。', trait: 'listen' },
    ],
    reward: 'homeSketch', petLine: '线索图画好啦。我们沿着面包香味外的小路去找木桥。',
  },
  {
    id: 'creaky-bridge', chapter: 2, name: '吱呀小木桥', place: 'paper-creek', sceneId: 'paper-creek',
    objective: '陪有点怕水的豆豆安全过桥。',
    npc: {
      name: '点点小蛙', templateId: 'pond-frog', entrance: 'water', voice: 'bubble',
      intro: '你们好，我是点点小蛙。我每天都从这座小桥下面游过去。',
    },
    cast: [{
      name: '豆豆小狗', templateId: 'bean-dog', entrance: 'bridge', voice: 'sprout',
      intro: '点点你好，我是豆豆。桥一响，我的腿就有一点发抖。',
      line: '只要有人陪着我慢一点，我愿意试试看。',
    }],
    conversation: [
      { speaker: 'npc', text: '桥板很结实，只是踩上去会吱呀响。我的小船也能载你们过河。' },
      { speaker: 'cast', text: '我想回家，可是看到水还是有一点紧张。' },
    ],
    dialogue: '怎么陪豆豆过河？可以说“牵着它慢慢走”，或者“大家坐点点的小船”。',
    choices: [
      { id: 'walk-slowly', label: '牵着它慢慢走', voiceHints: ['牵着它', '慢慢走', '走过桥', '陪它走'], result: '你牵着豆豆一步一步走。桥响了几声，豆豆一直能感觉到你在旁边。', trait: 'patient' },
      { id: 'take-boat', label: '坐点点的小船', voiceHints: ['坐船', '小船', '点点的船', '划过去'], result: '点点把小船靠到岸边。大家坐稳后，小船轻轻滑到了对岸。', trait: 'together' },
    ],
    reward: 'duckFeather', petLine: '豆豆过河啦！前面真的出现了两座小房子。',
  },
  {
    id: 'two-houses', chapter: 2, name: '两座小房子', place: 'rooftop', sceneId: 'rooftop',
    objective: '把眼前的房子和线索图一项项对上。',
    npc: {
      name: '邮差月牙', templateId: 'moon-cat', entrance: 'right', voice: 'star',
      intro: '晚上好，我是邮差月牙。这条路上的每一块门牌，我都认得。',
    },
    cast: [{
      name: '豆豆小狗', templateId: 'bean-dog', entrance: 'left', voice: 'sprout',
      intro: '月牙你好，我是豆豆。左边是蓝屋顶和小鱼牌，右边是红屋顶和骨头牌。',
      line: '我的线索图上画着红屋顶和骨头门牌。',
    }],
    conversation: [
      { speaker: 'npc', text: '左边房子是蓝屋顶，挂着小鱼牌；右边房子是红屋顶，挂着骨头牌。' },
      { speaker: 'cast', text: '线索图上正好画着红屋顶和骨头门牌。' },
    ],
    dialogue: '豆豆家是哪一间？可以说“右边红屋顶那间”，或者“跟着骨头门牌走”。',
    choices: [
      { id: 'red-roof', label: '右边红屋顶那间', voiceHints: ['右边', '红屋顶', '右边那间', '红色房子'], result: '你指向右边的红屋顶。三个线索都对上了，豆豆一下子认出了门口。', trait: 'listen' },
      { id: 'bone-sign', label: '跟着骨头门牌走', voiceHints: ['骨头门牌', '骨头牌', '跟着门牌', '看牌子'], result: '你把图上的骨头门牌和眼前的牌子一对，正是右边那一间。', trait: 'make' },
    ],
    reward: null, petLine: '找到了！豆豆已经听见屋里熟悉的脚步声。',
  },
  {
    id: 'doudou-home', chapter: 3, name: '豆豆的家', place: 'paper-ground', sceneId: 'paper-ground',
    objective: '把豆豆一路上的情况告诉来接它的妈妈。',
    npc: {
      name: '豆豆妈妈', templateId: 'bean-dog', entrance: 'house', voice: 'moss',
      intro: '你们好，我是豆豆妈妈。谢谢你们把豆豆陪到家门口。',
    },
    cast: [{
      name: '豆豆小狗', templateId: 'bean-dog', entrance: 'left', voice: 'sprout',
      intro: '妈妈，我是豆豆！我迷路了，不过一路都有人照顾我。',
      line: '我吃过东西、喝过水，还慢慢走过了小木桥。',
    }],
    conversation: [
      { speaker: 'npc', text: '我一直在等豆豆。它现在还好吗？一路上发生了什么？' },
      { speaker: 'cast', text: '我有点饿、也有点怕水，不过大家一直陪着我。' },
    ],
    dialogue: '怎么告诉豆豆妈妈？可以说“豆豆有点饿，不过没有受伤”，或者“我们一路都陪着它”。',
    choices: [
      { id: 'safe-report', label: '豆豆没有受伤', voiceHints: ['没有受伤', '没受伤', '豆豆很好', '安全'], result: '你把豆豆一路上的情况说清楚。豆豆妈妈放心地把它抱进怀里。', trait: 'care' },
      { id: 'stayed-together', label: '我们一路陪着它', voiceHints: ['一路陪着', '我们陪它', '一直陪着', '一起回来'], result: '你告诉豆豆妈妈，大家一直没有让豆豆一个人。她认真向每个人道谢。', trait: 'together' },
    ],
    reward: null, petLine: '豆豆到家啦。先照顾它，再听线索，最后陪它走完回家的路。', final: true,
  },
];

const moonScenes = [
  {
    id: 'moon-hill', chapter: 1, name: '望远镜山丘', place: 'rooftop', sceneId: 'rooftop', mode: 'director',
    objective: '造出第一件能带大家出发的东西。', reward: 'missionPatch',
    npc: {
      name: '阿策小鸮', templateId: 'book-owl', entrance: 'door', voice: 'moss',
      intro: '晚上好，我是阿策小鸮，负责望远镜、发射倒数和航线记录。',
    },
    cast: [], conversation: [
      { speaker: 'npc', text: '月球已经升到山丘上方。我们没有现成飞船，但有整晚时间和一张空白设计纸。' },
    ],
    dialogue: '第一步想造什么？可以说“造一座传送门”，也可以说“造一艘火箭”，或者讲讲你的方案。',
    director: { destination: '海底', constraint: '第一次启动出现温和偏航，队伍连同发明安全落到海底。' },
    petLine: '第一件发明真的动起来了！路线偏了一点，但我们可以在下一站继续改。',
  },
  {
    id: 'moon-underwater', chapter: 1, name: '海底维修站', place: 'underwater', sceneId: 'underwater', mode: 'director',
    objective: '改造刚才的发明，让它离开海底。', reward: 'seaBolt',
    npc: {
      name: '泡泡小蛙', templateId: 'pond-frog', entrance: 'water', voice: 'bubble',
      intro: '欢迎来到海底维修站，我是泡泡小蛙，最会修进水以后还想继续工作的机器。',
    },
    cast: [], conversation: [
      { speaker: 'npc', text: '你们造的东西跟着一起下来了。它没有坏，只需要一项适合海底的新改造。' },
    ],
    dialogue: '想怎么改它？比如加“气泡发动机”、改成“潜水火箭”，或者用你自己的办法。',
    director: { destination: '巨人口袋', constraint: '改造成功上升，却被路过巨人的外套口袋轻轻兜住。' },
    petLine: '我们离开海底了，又掉进一个超大的口袋。好在发明和大家都还在。',
  },
  {
    id: 'moon-pocket', chapter: 2, name: '巨人的口袋', place: 'giant-pocket', sceneId: 'giant-pocket', mode: 'director',
    objective: '利用口袋里的材料，想办法回到天空。', reward: 'pocketThread',
    npc: {
      name: '竹叶熊猫', templateId: 'bamboo-panda', entrance: 'seam', voice: 'bubble',
      intro: '你们好，我是竹叶熊猫。我住在这条缝线旁，知道每一颗纽扣通向哪里。',
    },
    cast: [], conversation: [
      { speaker: 'npc', text: '口袋很深，不过这里有纽扣、结实的线和一小股从袋口吹进来的风。' },
    ],
    dialogue: '想加什么让大家出去？比如“折叠梯”“弹簧座椅”“迷你传送门”，也可以发明别的东西。',
    director: { destination: '云层', constraint: '新改造把队伍送出口袋并升入云层，过程安全、可见、带一点意外幽默。' },
    petLine: '袋口越来越小，我们出来了！下一层是厚厚的云。',
  },
  {
    id: 'moon-clouds', chapter: 2, name: '云层导航站', place: 'clouds', sceneId: 'clouds', mode: 'director',
    objective: '穿过看不清方向的云层。', reward: 'cloudCompass',
    npc: {
      name: '云朵羊驼', templateId: 'cloud-alpaca', entrance: 'cloud', voice: 'bubble',
      intro: '晚上好，我是云朵羊驼，负责给误入云层的旅行者找上方和下方。',
    },
    cast: [], conversation: [
      { speaker: 'npc', text: '月球就在云层上面，可四周都是白色。你们的发明需要一项能辨认方向的新功能。' },
    ],
    dialogue: '怎么穿过云层？比如加“云朵雷达”“月光指南针”，或者说一个完全不同的办法。',
    director: { destination: '月球轨道', constraint: '改造带队伍穿过云层并抵达月球上空，但还需要最后一次稳稳落地。' },
    petLine: '云层在脚下了。月球就在前面，我们只差最后一次着陆。',
  },
  {
    id: 'moon-landing', chapter: 3, name: '月球上空', place: 'moon', sceneId: 'moon', mode: 'director',
    objective: '完成最后一次改造，稳稳落在月面。', reward: null,
    npc: {
      name: '月面月牙', templateId: 'moon-cat', entrance: 'crater', voice: 'star',
      intro: '这里是月面接引区，我是月牙。你们已经到达月球上空，只差最后一步。',
    },
    cast: [], conversation: [
      { speaker: 'npc', text: '月面的重力很轻，下降太快会弹起来。最后一次改造要让大家慢慢落地。' },
    ],
    dialogue: '最后怎么稳稳落地？比如“打开降落伞”“让传送门贴着地面打开”，或者说你的着陆方案。',
    director: { destination: '月球表面', constraint: '方案成功，所有人和发明完整、缓慢、清楚地落在月面，完成登月目标。' },
    petLine: '脚印真的留在月球上了。我们绕了很远，但每一次改造都把目标拉近了一点。', final: true,
  },
];

export const STORIES = {
  doudou: {
    ...STORY_CATALOG[0], analytics: 'doudou', onboarding: 'interview',
    guide: {
      id: 'river-otter', name: '河湾小水獭', voice: 'moss', template: doudouGuide,
      hello: '你好，我是河湾小水獭。我会从三个简单选择开始，帮你画出今天一起照顾豆豆的小伙伴。',
      entrance: 'parachute',
    },
    interviewQuestions: [
      { id: 'animal', question: '你希望伙伴更像哪种动物？像小兔子、小狗，还是小猫？', hint: '可以直接说“小兔子”“小狗”或“小猫”。' },
      { id: 'color', question: '给它选一种最显眼的颜色吧：太阳黄、草莓红，还是天空蓝？', hint: '也可以说另一种你喜欢的颜色。' },
      { id: 'name', question: '最后给它一个短名字吧。可以叫团团、跳跳、毛球，或者你想到的名字。', hint: '说两三个字的小名最容易记。' },
    ],
    chapters: [
      { id: 'meet-doudou', number: 1, title: '遇见豆豆', promise: '先照顾它，再把家的线索画下来。' },
      { id: 'walk-home', number: 2, title: '陪它走', promise: '一起过桥，用线索找到正确的房子。' },
      { id: 'home-again', number: 3, title: '平安到家', promise: '把一路上的情况告诉豆豆妈妈。' },
    ],
    items: DOUDOU_ITEMS, scenes: doudouScenes,
    ending: {
      label: '你把豆豆平安送回家啦', title: '豆豆到家了',
      petLine: '下次遇到需要帮助的朋友，我们也先问清楚、再一起慢慢走。',
    },
  },
  moon: {
    ...STORY_CATALOG[1], analytics: 'moon', onboarding: 'direct',
    guide: { id: 'book-owl', name: '阿策小鸮', voice: 'moss', template: moonGuide, entrance: 'door' },
    initialPet: {
      templateId: 'snow-rabbit', name: '小航', palette: 'moon', feature: 'bright-eyes',
      intro: '你好，我是小航。我不带现成答案，只负责和你一起把每个办法真的造出来。',
      entrance: 'house',
    },
    interviewQuestions: [],
    chapters: [
      { id: 'launch', number: 1, title: '设法出发', promise: '造出第一件东西，再从海底继续改。' },
      { id: 'reroute', number: 2, title: '绕路修正', promise: '从口袋到云层，每次偏航都再改一步。' },
      { id: 'land', number: 3, title: '完成登月', promise: '让整支小队稳稳落到月面。' },
    ],
    items: MOON_ITEMS, scenes: moonScenes,
    ending: {
      label: '登月计划完成', title: '月球，抵达',
      petLine: '路线不是直线也没关系。只要记得目标，每次都能把办法改得更接近它。',
    },
  },
};

export function storyBySlug(value) {
  return STORIES[value] || STORIES.doudou;
}
