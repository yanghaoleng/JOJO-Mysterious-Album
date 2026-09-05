// The /dev stories are independent of the published story blueprints.
// Choices are practical suggestions, never a test or a personality score.
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
      { speaker: 'guoguo', text: '阿暖熊认识附近的家，我们去问问。' },
    ],
  },
  {
    id: 'doudou-bakery', title: '香香的线索图', chapter: 1, world: 'bakery',
    objective: '把豆豆记得的三条线索画下来。',
    cast: [
      { id: 'anuan', type: 'bear', name: '阿暖', color: '#c69c72', voice: 'moss' },
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
    ],
    dialogue: [
      { speaker: 'anuan', text: '豆豆，我认得你家的骨头门牌。' },
      { speaker: 'doudou', text: '对！回家还要过一座小木桥。' },
      { speaker: 'anuan', text: '红屋顶、骨头门牌、小木桥。' },
      { speaker: 'doudou', text: '我怕又忘了，可以画下来吗？' },
    ],
    question: '我们先画哪一条线索？',
    choices: [
      { id: 'roof', label: '先画红屋顶', hints: ['屋顶', '红色', '房子', '红'], result: '红屋顶画好了，再添上门牌和小桥。', speaker: 'anuan', action: 'glow', reward: homeSketch, expression: 'happy' },
      { id: 'sign', label: '先画骨头门牌', hints: ['骨头', '门牌', '牌子', '图'], result: '骨头门牌画好了，再添上屋顶和小桥。', speaker: 'anuan', action: 'glow', reward: homeSketch, expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '这就是我家！线索图我拿好了。' },
      { speaker: 'anuan', text: '沿着门外的小路，就能看到木桥。' },
    ],
  },
  {
    id: 'doudou-riverbank', title: '在河边等一等', chapter: 2, world: 'bridge',
    objective: '先问豆豆需要怎样的陪伴。',
    cast: [
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
      { id: 'diandian', type: 'frog', name: '点点', color: '#91ae72', voice: 'bubble' },
    ],
    dialogue: [
      { speaker: 'diandian', text: '豆豆，桥板结实，小船也在岸边。' },
      { speaker: 'doudou', text: '我知道，可我的腿还是有点抖。' },
      { speaker: 'diandian', text: '那我们先在岸上等一会儿。' },
      { speaker: 'doudou', text: '有人陪着，我会安心一点。' },
    ],
    question: '等一会儿的时候，怎么陪豆豆？',
    choices: [
      { id: 'sit', label: '坐在它身边', hints: ['坐', '旁边', '身边', '等', '陪'], result: '你坐在这里，我就不着急了。', speaker: 'doudou', action: 'listen', expression: 'happy' },
      { id: 'hand', label: '伸手让它握住', hints: ['手', '牵', '握', '拉'], result: '我握住你的手，准备好了再出发。', speaker: 'doudou', action: 'listen', expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '我准备好了，不过还想慢慢来。' },
      { speaker: 'diandian', text: '好，我们一起选一条过河的路。' },
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
      { id: 'yueya', type: 'cat', name: '邮差月牙', color: '#bcc1d1', voice: 'star' },
      { id: 'doudou', type: 'dog', name: '豆豆', color: '#cf955f', voice: 'sprout' },
    ],
    dialogue: [
      { speaker: 'yueya', text: '左边是蓝屋顶，右边是红屋顶。' },
      { speaker: 'doudou', text: '我的图上画着红屋顶和骨头门牌。' },
      { speaker: 'yueya', text: '骨头门牌也在右边，我们靠近看看。' },
    ],
    question: '你想先对照什么？',
    choices: [
      { id: 'check-roof', label: '看看红屋顶', hints: ['屋顶', '红', '右边', '房子'], result: '红屋顶对上了，门口还有骨头牌！', speaker: 'doudou', action: 'glow', expression: 'happy' },
      { id: 'check-sign', label: '看看骨头门牌', hints: ['骨头', '门牌', '牌子'], result: '骨头门牌对上了，上面正是红屋顶！', speaker: 'doudou', action: 'glow', expression: 'happy' },
    ],
    closing: [
      { speaker: 'doudou', text: '我认出来了，就是这里！' },
      { speaker: 'yueya', text: '我们轻轻敲门，等妈妈来开。' },
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

const moonScenes = [
  {
    id: 'moon-observatory', title: '一张空白设计纸', chapter: 1, world: 'observatory',
    objective: '发明一样能带整支小队出发的东西。',
    cast: [{ id: 'ace', type: 'owl', name: '阿策', color: '#bfa98c', voice: 'moss' }],
    dialogue: [
      { speaker: 'ace', text: '今晚的目标只有一个：登上月球。' },
      { speaker: 'companion', text: '没有现成飞船，但我们有一张设计纸。' },
      { speaker: 'ace', text: '什么样的发明，都可以先做个小模型。' },
    ],
    question: '你想造什么，带大家去月球？',
    freeInput: true,
    inventionHints: ['一座能移动的传送门', '有透明驾驶舱的火箭', '你自己的发明'],
    inventionPrompt: '说说它的样子，以及怎样带大家移动。',
    inventionResult: '模型动起来了！它偏向海边，稳稳进入气泡站。',
    inventionAction: 'launch', inventionSpeaker: 'ace', inventionExpression: 'surprised',
    nextDestination: 'reef',
    choices: [
      { id: 'portal', label: '先试试传送门', hints: ['传送', '门', '穿越'], result: '门亮了！出口偏向海边，我们进入了气泡站。', speaker: 'ace', action: 'launch', expression: 'surprised' },
      { id: 'rocket', label: '先试试小火箭', hints: ['火箭', '飞船', '驾驶舱'], result: '火箭轻轻起飞，绕进了海边的气泡站。', speaker: 'ace', action: 'launch', expression: 'surprised' },
    ],
    closing: [
      { speaker: 'companion', text: '大家都好好的，发明也跟着来了。' },
      { speaker: 'ace', text: '我们记住这次偏航，下一站再改一点。' },
    ],
  },
  {
    id: 'moon-reef', title: '海底维修站', chapter: 1, world: 'reef',
    objective: '改造刚才的发明，让它带大家上浮。',
    cast: [
      { id: 'paopao', type: 'frog', name: '泡泡', color: '#86afa6', voice: 'bubble' },
      { id: 'ace', type: 'owl', name: '阿策', color: '#bfa98c', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'paopao', text: '欢迎！气泡站有空气，也有修理工具。' },
      { speaker: 'ace', text: '我们的发明还在，只是方向不太对。' },
      { speaker: 'paopao', text: '先让它上浮吧，我来帮你固定零件。' },
    ],
    question: '给刚才的发明加什么，能离开海底？',
    freeInput: true,
    inventionHints: ['能推着它上浮的气泡', '一对会划水的桨', '任何适合你发明的改造'],
    inventionPrompt: '保留你的发明，说说这次加上或改变什么。',
    inventionResult: '新改造让我们上浮了，巨人的软口袋接住了小队。',
    inventionAction: 'launch', inventionSpeaker: 'paopao', inventionExpression: 'happy',
    inventionReward: { id: 'sea-bolt', name: '深海蓝螺栓', description: '泡泡帮我们固定零件的螺栓，下一站还能用。' },
    nextDestination: 'pocket',
    choices: [
      { id: 'bubbles', label: '加一个气泡推进器', hints: ['气泡', '发动机', '推进', '浮'], result: '气泡推着我们上浮，软软的口袋接住了大家！', speaker: 'paopao', action: 'launch', expression: 'happy', reward: { id: 'sea-bolt', name: '深海蓝螺栓', description: '泡泡帮我们固定零件的螺栓，下一站还能用。' } },
      { id: 'paddles', label: '加一对划水桨', hints: ['桨', '划水', '划', '翅膀'], result: '小桨推着我们上浮，软软的口袋接住了大家！', speaker: 'paopao', action: 'launch', expression: 'happy', reward: { id: 'sea-bolt', name: '深海蓝螺栓', description: '泡泡帮我们固定零件的螺栓，下一站还能用。' } },
    ],
    closing: [
      { speaker: 'companion', text: '先是海底，现在是一个超大的口袋。' },
      { speaker: 'ace', text: '上浮成功了，下一步是找到袋口。' },
    ],
  },
  {
    id: 'moon-pocket', title: '纽扣那么大的窗', chapter: 2, world: 'pocket',
    objective: '用口袋里的材料，为发明增加脱身办法。',
    cast: [
      { id: 'zhuzhu', type: 'bear', name: '竹竹', color: '#d5cabb', voice: 'bubble' },
      { id: 'ace', type: 'owl', name: '阿策', color: '#bfa98c', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'zhuzhu', text: '我是口袋修补员，袋口就在上面。' },
      { speaker: 'ace', text: '这里有纽扣、线，还有一点风。' },
      { speaker: 'zhuzhu', text: '你来想办法，我帮你把材料接牢。' },
    ],
    question: '怎样改造它，把大家带出口袋？',
    freeInput: true,
    inventionHints: ['会展开的折叠梯', '借风鼓起来的小帆', '适合你发明的新办法'],
    inventionPrompt: '可以加零件，也可以改变它的形状或工作方式。',
    inventionResult: '这次改造把大家送到袋口，一阵轻风托我们进了云层。',
    inventionAction: 'launch', inventionSpeaker: 'zhuzhu', inventionExpression: 'happy',
    inventionReward: { id: 'pocket-thread', name: '巨人口袋线', description: '又轻又结实的一卷线，用来连接你的下一件新零件。' },
    nextDestination: 'cloud',
    choices: [
      { id: 'ladder', label: '装一架折叠梯', hints: ['梯', '伸长', '爬', '折叠'], result: '梯子展开，大家到达袋口，轻风把我们托进云层。', speaker: 'zhuzhu', action: 'launch', expression: 'happy', reward: { id: 'pocket-thread', name: '巨人口袋线', description: '又轻又结实的一卷线，用来连接你的下一件新零件。' } },
      { id: 'sail', label: '装一面借风的小帆', hints: ['帆', '风', '吹', '气球'], result: '小帆鼓起来，大家越过袋口，飘进了柔软云层。', speaker: 'zhuzhu', action: 'launch', expression: 'happy', reward: { id: 'pocket-thread', name: '巨人口袋线', description: '又轻又结实的一卷线，用来连接你的下一件新零件。' } },
    ],
    closing: [
      { speaker: 'companion', text: '袋口变小了，我们真的出来了！' },
      { speaker: 'ace', text: '前面全是白云，该给发明找方向了。' },
    ],
  },
  {
    id: 'moon-cloud', title: '白云里的方向', chapter: 2, world: 'cloud',
    objective: '让发明找到通往月球的方向。',
    cast: [
      { id: 'yunyou', type: 'rabbit', name: '云游', color: '#e4e0ef', voice: 'star' },
      { id: 'ace', type: 'owl', name: '阿策', color: '#bfa98c', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'yunyou', text: '我是云层领航员，月亮在云的上面。' },
      { speaker: 'ace', text: '看不清时，我们先停下来辨认方向。' },
      { speaker: 'yunyou', text: '我有月亮的位置，可以交给你的发明。' },
    ],
    question: '你想加什么，让它知道往哪儿走？',
    freeInput: true,
    inventionHints: ['标出月亮方向的小屏幕', '会发光的导航线', '你自己的指路办法'],
    inventionPrompt: '说说你的发明怎样接收方向，再带大家往前走。',
    inventionResult: '新功能找到了方向，云层慢慢退下，月球出现在前面。',
    inventionAction: 'glow', inventionSpeaker: 'yunyou', inventionExpression: 'happy',
    inventionReward: { id: 'cloud-bearing', name: '月球方向卡', description: '云游标出的方向：保留这张卡，让发明知道下一站。' },
    nextDestination: 'moon',
    choices: [
      { id: 'radar', label: '装一个月球导航屏', hints: ['雷达', '屏', '地图', '导航'], result: '屏幕亮出一条路线，我们穿过云层，看见月球了。', speaker: 'yunyou', action: 'glow', expression: 'happy', reward: { id: 'cloud-bearing', name: '月球方向卡', description: '云游标出的方向：保留这张卡，让发明知道下一站。' } },
      { id: 'light-line', label: '拉出一条发光航线', hints: ['光', '线', '亮', '指路'], result: '航线从白云里亮起来，带着我们找到前方的月球。', speaker: 'yunyou', action: 'glow', expression: 'happy', reward: { id: 'cloud-bearing', name: '月球方向卡', description: '云游标出的方向：保留这张卡，让发明知道下一站。' } },
    ],
    closing: [
      { speaker: 'companion', text: '一路改过的零件，都跟着我们来了。' },
      { speaker: 'ace', text: '还有最后一步：让大家稳稳落地。' },
    ],
  },
  {
    id: 'moon-landing', title: '最后一点距离', chapter: 3, world: 'moon',
    objective: '让整个小队连同发明缓缓落到月面。',
    cast: [
      { id: 'yueya', type: 'cat', name: '月牙', color: '#b9c4d4', voice: 'star' },
      { id: 'ace', type: 'owl', name: '阿策', color: '#bfa98c', voice: 'moss' },
    ],
    dialogue: [
      { speaker: 'yueya', text: '这里是月面接引站，我在通讯器里等你们。' },
      { speaker: 'ace', text: '月球没有空气，降落伞在这里用不上。' },
      { speaker: 'yueya', text: '让发明慢下来，就能稳稳接近地面。' },
    ],
    question: '最后怎样改造，让大家慢慢落地？',
    freeInput: true,
    inventionHints: ['让推进器轻轻向下喷气', '把传送门出口贴近地面', '你自己的缓慢着陆办法'],
    inventionPrompt: '讲一个能让整个小队慢下来、留在安全舱里的办法。',
    inventionResult: '我们把你的办法装好试了一次，发明缓缓贴近月面，停稳了。',
    inventionAction: 'launch', inventionSpeaker: 'yueya', inventionExpression: 'happy',
    nextDestination: 'moon',
    choices: [
      { id: 'gentle-thruster', label: '用小推进器减速', hints: ['推进', '喷气', '减速', '反推', '慢'], result: '小推进器轻轻工作，发明和大家稳稳落到月面。', speaker: 'yueya', action: 'launch', expression: 'happy' },
      { id: 'low-portal', label: '让出口贴近地面', hints: ['门', '出口', '传送', '贴近'], result: '出口贴着月面打开，发明和大家缓缓滑到地面。', speaker: 'yueya', action: 'launch', expression: 'happy' },
    ],
    closing: [
      { speaker: 'ace', text: '着陆完成，我们真的到月球了。' },
      { speaker: 'companion', text: '想给这次旅行，留下一样小纪念吗？' },
    ],
  },
  {
    id: 'moon-arrival', title: '月球，抵达', chapter: 3, world: 'moon',
    objective: '给一路改造的发明留下一张抵达记录。',
    cast: [
      { id: 'ace', type: 'owl', name: '阿策', color: '#bfa98c', voice: 'moss' },
      { id: 'yueya', type: 'cat', name: '月牙', color: '#b9c4d4', voice: 'star' },
    ],
    dialogue: [
      { speaker: 'ace', text: '从海底到口袋，再从白云到这里。' },
      { speaker: 'yueya', text: '每次绕路，你们都给发明加了一点办法。' },
      { speaker: 'ace', text: '我想把这段路，画在最初的设计纸上。' },
    ],
    question: '最后想留下什么纪念？',
    freeInput: true,
    inventionHints: ['给这件发明起一个名字', '画下你最喜欢的一次改造', '你想留下的旅行纪念'],
    inventionPrompt: '可以讲讲你最喜欢的零件，也可以给发明起个名字。',
    inventionResult: '这份纪念已经写在设计纸旁，和我们的月球合影放在一起。',
    inventionAction: 'celebrate', inventionSpeaker: 'ace', inventionExpression: 'happy',
    choices: [
      { id: 'route-drawing', label: '画出这条弯弯的路线', hints: ['路线', '画', '海底', '路'], result: '弯弯的路线画好了，每一个转弯都有我们的办法。', speaker: 'ace', action: 'celebrate', expression: 'happy' },
      { id: 'group-photo', label: '和发明拍一张合影', hints: ['拍', '照片', '合影', '纪念'], result: '大家和发明站在一起，月球合影拍好了。', speaker: 'yueya', action: 'celebrate', expression: 'happy' },
    ],
    closing: [
      { speaker: 'companion', text: '你的办法带我们到了这里。' },
      { speaker: 'ace', text: '下一次想再改，我们还有新的设计纸。' },
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
  {
    id: 'moon', title: '登月计划', subtitle: '带着一个点子出发，沿路把它改成真的。',
    onboarding: 'direct',
    age: '10 岁以上', companion: 'rabbit', companionName: '小航', color: '#9799bd',
    premise: '没有标准飞船，也没有唯一方案。你的发明会和整支小队一起旅行。',
    freeInput: true,
    inventionPolicy: '沿用玩家已经提出的发明与零件。接受不同的安全幻想方案；允许试做、偏航、暂停和重新修改。把现实科学与故事魔法说清楚。不评分、不宣布失败，不把自由输入硬改写为提示选项。',
    chapters: [
      { id: 'begin', number: 1, title: '先做一次', promise: '做出第一件发明，从海底继续改。' },
      { id: 'adjust', number: 2, title: '沿路改造', promise: '越过口袋，再给发明找到方向。' },
      { id: 'arrive', number: 3, title: '月球，抵达', promise: '稳稳落地，留下自己的旅行纪念。' },
    ],
    scenes: moonScenes,
    ending: { title: '月球，抵达', text: '海底、口袋、云层、月面。一路上的改造，组成了你的发明。', companionLine: '路线可以弯，办法可以改。下一张设计纸，也留给你。' },
  },
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
