const ace = {
  id: "ace",
  type: "owl",
  name: "阿策",
  color: "#bfa98c",
  voice: "moss",
};
const scenes = [
  ["moon-observatory", "把想法做出来", "observatory", 1,
    "咯咯哒带来的问题是：“{journeyQuestion}”", "你决定：“{journeyIdea}”先造一件能帮我们试试的东西。",
    "为了试试这个问题，你想先造什么？", ["一台观察镜", "一座能到达远处的小桥", "请豆芽帮忙造一台机器人"]],
  ["moon-cloud", "请朋友试一试", "cloud", 2,
    "朋友们试了“{firstWork}”，发现有些安静的朋友还没法参与。", "听听他们的需要，再添一件能让大家一起试的东西。",
    "你想添什么，让更多朋友试到你的办法？", ["会亮灯的好奇小屋", "能轮流使用的观察台", "带大家见面的传送门"]],
  ["moon-landing", "改好，留在广场", "moon", 3,
    "第一件作品和朋友的新点子都带来了。", "看看试用后还缺什么，把最后一块补进好奇心广场。",
    "你想修改刚才的作品，还是造一个能让大家继续提问的地方？", ["给刚才的作品加一座桥", "请铃铛照看的花园", "一台记录新发现的相机"]],
];
export const MOON_CURIOSITY_STORY = {
  id: "moon",
  version: 2,
  interaction: "creation",
  exploration: true,
  title: "登月计划 · 好奇心造物场",
  subtitle: "把你的问题做成作品，邀请朋友试用，再一起改好。",
  onboarding: "direct",
  age: "第三章 · 自由创造",
  companion: "rabbit",
  companionName: "小航",
  color: "#9799bd",
  premise:
    "第一束光让宇宙醒来，不同的理由让问题长大。现在轮到你：把想法做出来，留在这个世界里。",
  events: [
    {
      id: "try-a-new-idea",
      on: "creation.saved",
      effects: [
        {
          type: "actor.animate",
          target: "ace",
          animation: "wave",
          expression: "happy",
        },
      ],
    },
  ],
  chapters: [
    { number: 1, title: "做出第一个办法" },
    { number: 2, title: "请朋友试用" },
    { number: 3, title: "根据发现改好" },
  ],
  scenes: scenes.map(
    (
      [id, title, world, chapter, first, second, question, suggestions],
      i,
    ) => ({
      id,
      title,
      world,
      chapter,
      objective: "把问题做成作品，请朋友试用并完善。",
      cast: [ace],
      dialogue: [
        { speaker: ace.id, text: first },
        { speaker: "companion", text: second },
      ],
      question,
      questionSpeaker: ace.id,
      freeInput: true,
      creation: true,
      interaction: "creation",
      inputMode: "voice",
      inventionSpeaker: ace.id,
      choices: suggestions.map((label, j) => ({
        id: `create-${i}-${j}`,
        label,
      })),
      closing: [],
      final: i === scenes.length - 1,
    }),
  ),
  ending: {
    title: "宇宙有了继续好奇的地方",
    text: "你的作品留在星球上。随时回来，找朋友试用，再加上新的点子。",
    companionLine:
      "好奇心的光没有停在这里。你下一个想问的问题，就是新旅程的起点。",
  },
};
