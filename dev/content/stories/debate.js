export const CURIOSITY_MISSION =
  "让宇宙里的朋友重新愿意提问、听见不同想法，再一起动手试试。";
export const DEBATE_TOPICS = [
  "要救回好奇心，先去探索还是先把问题想清楚？",
  "大家想去不同星球，轮流选还是一起商量？",
  "新发明只听一个点子，还是把不同点子拼起来？",
];
export function debateFallback(topic, speakers) {
  const n = Math.max(0, DEBATE_TOPICS.indexOf(topic));
  const lines = [
    [
      "我想先画张观察表，看看星球上少了哪些问题。",
      "你先找线索，我先去问三位朋友，也许会冒出新问题。",
      "听起来，出发也能找线索。可我们先往哪里走呢？",
      "带上观察表去最近的山坡吧，边走边记，再回来商量。",
    ],
    [
      "我想把船长徽章轮流戴，让安静的朋友也带一次路。",
      "轮流很公平，不过先听理由，也许两颗星球能顺路去。",
      "你说的顺路很有用。那谁来保证每个人都能开口？",
      "先每人说一句，再排路线；船长仍然轮流当。",
    ],
    [
      "我想先装一盏小灯，亮不亮一眼就能看出来。",
      "小灯不错！再接上小兔的转轮，也许它会边跑边照路。",
      "一起装很有趣，可要是停了，我们怎么知道哪里坏了？",
      "先试小灯，再接转轮，每加一块就按一下开关。",
    ],
  ][n];
  return {
    allowed: true,
    topic,
    turns: lines.map((text, i) => ({
      speakerId: speakers[i % 2].id,
      phase: ["offer", "connect", "challenge", "experiment"][i],
      text,
    })),
    commonGround: "让每个人的问题都有地方落下，再一起试一试。",
    closingQuestion: "你想先试哪种办法？说一个理由，也可以把两种办法合起来。",
  };
}

export function journeyDebate(question, speakers) {
  const focus = String(question || '').trim().slice(0, 48);
  const shortFocus = focus.slice(0, 12);
  const [owl, rabbit] = speakers;
  const skyQuestion = /(?:天空|天)(?:为什么|为何|怎么会|怎么是).{0,4}蓝|为什么.{0,4}(?:天空|天).{0,3}蓝/.test(focus);
  const lines = skyQuestion ? [
    '太阳光里藏着许多颜色，来到天空时会碰上空气。',
    '空气更容易把蓝光撒向四面，所以到处都能看到蓝色。',
    '那傍晚为什么变红？因为阳光穿过的空气更长了。',
    '蓝光一路被撒开，剩下的红橙光更容易来到我们眼前。',
  ] : [
    `这是在问“${shortFocus}”的原因，我们先找可靠线索。`,
    '我来看看哪些是已经知道的，哪些还只是有趣的猜想。',
    '如果证据还不够，就把不知道的地方清楚地留下来。',
    '等资料连上再回答；现在先观察它在什么时候会变化。',
  ];
  return {
    allowed: true,
    topic: focus,
    turns: lines.map((text, index) => ({ speakerId: index % 2 ? rabbit.id : owl.id, phase: ['offer','connect','challenge','experiment'][index], text })),
    commonGround: skyQuestion ? '白天的蓝和傍晚的红，都和阳光穿过空气有关。' : '不知道时不硬猜，先分清事实、猜想和还缺少的线索。',
    closingQuestion: skyQuestion ? '下次看天空时，你想比较中午和傍晚的哪种颜色？' : '你还观察到什么变化，能成为寻找答案的新线索？',
  };
}

export const DEBATE_STORY = {
  id: "debate",
  version: 2,
  interaction: "debate",
  world: "meadow",
  speakers: [
    {
      id: "book-owl",
      name: "书桌小鸮",
      hint: "在好奇心救援队负责先观察、再计划；愿意听新证据改主意。",
      type: "owl",
      voice: "neighbor",
    },
    {
      id: "snow-rabbit",
      name: "雪团小兔",
      hint: "在好奇心救援队喜欢先试一小步；尊重不同理由，把点子带去第三章造物场。",
      type: "rabbit",
      voice: "bubble",
    },
  ],
  topics: DEBATE_TOPICS,
  topicLabels: ["先探索还是先计划", "不同路线怎么选", "点子要不要拼起来"],
  reflections: [
    "我想先观察，再带一个问题出发。",
    "我想先试一点，再看看有什么新发现。",
    "我想先听大家的点子，再合起来试试。",
  ],
  rounds: ["摆出两个办法", "接住对方的想法"],
  opening:
    "我是书桌小鸮。我想知道，问出来以后怎样试出答案？雪团小兔有另一个办法。选个问题，我们一起商量。",
  handoff:
    "我是书桌小鸮。咯咯哒带来了你的问题：“{question}”我想先观察，雪团小兔想先试一小步。听完就由你决定下一步。",
  ending:
    "你的试法我们记下了。下一站，先做出一件能用的东西，再请朋友试试。",
  events: [
    {
      id: "ready-to-listen",
      on: "debate.ready",
      effects: [
        {
          type: "actor.animate",
          target: "book-owl",
          animation: "wave",
          expression: "happy",
        },
      ],
    },
    {
      id: "take-your-idea",
      on: "debate.completed",
      effects: [{ type: "world.react", action: "celebrate" }],
    },
  ],
};
