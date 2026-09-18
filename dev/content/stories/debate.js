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
      "先想清楚一个问题，出发就知道要看什么。",
      "先走出去也会发现，原来还有没想到的问题。",
      "如果一直想却不出发，我们会错过什么？",
      "如果边走边记问题，就能带着发现回来想。",
      "我愿意带一个问题出发，再慢慢补充计划。",
      "我也愿意停下来听。好奇心可以一边走一边长。",
    ],
    [
      "轮流选目的地，安静的朋友也能带一次路。",
      "先听大家想去的理由，也许能找到共同的路。",
      "如果总是最响亮的人说话，轮流能帮上忙。",
      "那就让每个人都说一句，再一起排顺序。",
      "我想保留轮流的机会，让每个问题都被听见。",
      "我想保留商量的时间，让路线可以改变。",
    ],
    [
      "先试一个点子，比较容易看见它怎么工作。",
      "把不同点子拼起来，可能会长出意外的办法。",
      "一次拼太多，坏了可能不知道该改哪里。",
      "那我们先试一个，再接上朋友的一小块。",
      "试做不是考试。看见结果以后，还能修改。",
      "听见不同的理由，宇宙就多了一条新路。",
    ],
  ][n];
  return {
    allowed: true,
    topic,
    turns: lines.map((text, i) => ({ speakerId: speakers[i % 2].id, text })),
    commonGround: "让每个人的问题都有地方落下，再一起试一试。",
    closingQuestion: "你想先试哪种办法？说一个理由，也可以把两种办法合起来。",
  };
}

export const DEBATE_STORY = {
  id: "debate",
  version: 1,
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
  rounds: ["先说说自己的理由", "再听听另一种想法", "带走一个新问题"],
  opening:
    "第一束光唤醒了宇宙。怎样让好奇心继续亮着？我们想听两种理由，也想听你的。先选一个问题吧。",
  handoff:
    "上一站你留下了：“{question}”光回来了，可我们对下一步有不同想法。先选一个问题，一起听听吧。",
  ending:
    "你的办法我们记下了。下一站，把它做成朋友能试用的东西，让宇宙的好奇心继续亮起来。",
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
