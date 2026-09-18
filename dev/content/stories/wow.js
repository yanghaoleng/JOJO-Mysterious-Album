import { WOW_STORY } from "../../../src/wow-story-data.js";

const WORLDS = ["bakery", "reef", "cloud", "home", "meadow", "observatory"];
const KINDS = ["gugu", "fish", "cloud", "clock", "shadow", "star"];
const OPEN_SCENES = new Set([
  "gugu-feeling",
  "first-color",
  "sea-listen",
  "sea-plan",
  "sea-color",
  "cloud-listen",
  "cloud-choice",
  "time-plan",
  "shadow-arrival",
  "shadow-path",
  "star-arrival",
  "star-listen",
  "star-wish",
  "star-color",
  "your-book",
]);
const EXTRA_IDEAS = {
  "gugu-feeling": "你想吃什么点心？",
  "first-color": "像暖暖的小太阳。",
  "sea-listen": "小贝壳被什么挡住了？",
  "sea-plan": "把挡路的空瓶搬开。",
  "sea-color": "蓝色的小小路。",
  "cloud-listen": "你想让谁陪着你？",
  "cloud-choice": "软软的草地，有朋友陪我。",
  "time-plan": "先喝水，再去玩。",
  "shadow-arrival": "尖尖的，像一座小山。",
  "shadow-path": "像彩虹一样弯弯的。",
  "star-arrival": "你想邀请谁来看你的光？",
  "star-listen": "陪小兔找到回家的路。",
  "star-wish": "陪我坐着云朵去旅行。",
  "star-color": "大家一起找到颜色的时候。",
  "your-book": "下次我还想来找你们。",
};
const FIRST_TITLES = [
  "星星窗的小房间",
  "房间里的咚咚声",
  "第一束光",
  "光照见哇呜星",
  "寄出一声问候",
  "认识鼓鼓",
  "听听身体的话",
  "一把自己的钥匙",
  "点心花园",
  "第一滴暖暖黄",
  "海螺那边的声音",
];
export const WOW_PROPS = {
  torch: {
    id: "torch",
    name: "好奇手电筒",
    description: "把你的话变成光。停下来时，也会留着光等你。",
  },
  radio: {
    id: "radio",
    name: "唔姆收音机",
    description: "把问候寄给MOMO，听它慢慢说完。",
  },
  jar: {
    id: "jar",
    name: "颜色罐",
    description: "保存旅途中找到的颜色，休息时也不会消失。",
  },
};
export const WOW_DEV_STORY = {
  id: "wow",
  version: 1,
  interaction: "curiosity",
  exploration: true,
  title: WOW_STORY.title,
  subtitle: "你问一句，星球亮一格。",
  age: "六章好奇之旅",
  onboarding: "direct",
  companion: "rabbit",
  companionName: "小光",
  color: "#efd36e",
  premise: "窗后有个小小的声音。先靠近一点，听它说完。",
  events: [
    {
      id: "welcome-answer",
      on: "answer.accepted",
      effects: [
        {
          type: "actor.animate",
          target: "wow",
          animation: "wave",
          expression: "happy",
        },
      ],
    },
  ],
  chapters: WOW_STORY.chapters.map((chapter) => ({
    number: chapter.id,
    title: chapter.title,
  })),
  scenes: WOW_STORY.chapters.flatMap((chapter) =>
    chapter.scenes.map((source, chapterScene) => {
      const kind =
        chapter.id === 1 && chapterScene < 4 ? "window" : KINDS[chapter.id - 1];
      const narrator = source.speaker === "星星窗";
      return {
        id: source.id,
        chapter: chapter.id,
        chapterScene,
        world: source.world || WORLDS[chapter.id - 1],
        title: chapter.id === 1 ? FIRST_TITLES[chapterScene] : chapter.world,
        inputMode:
          source.inputMode ||
          (source.kind === "create" || OPEN_SCENES.has(source.id)
            ? "voice"
            : "choice"),
        objective: source.prompt,
        question: source.prompt,
        questionSpeaker: narrator ? "guide" : "wow",
        wow: {
          kind: source.kind,
          prop: source.prop,
          color: chapter.color,
          colorName: chapter.colorName,
          momo: chapter.momo,
        },
        cast: [
          {
            id: "wow",
            name:
              kind === "window"
                ? "星星窗"
                : chapter.id === 1 && chapterScene === 4
                  ? "MOMO"
                  : chapter.momo,
            voice: "bubble",
            asset: `wow:${kind}`,
            color: chapter.color,
          },
        ],
        dialogue: [
          { speaker: narrator ? "guide" : "wow", text: source.text },
          ...(chapter.id === 1 && chapterScene === 0
            ? [
                {
                  speaker: "guide",
                  text: "点一下脚边的小路，就能走过去。走近路边的朋友，它会和你打招呼。我们一起帮这个宇宙找回好奇心。",
                },
              ]
            : []),
        ],
        choices: [
          ...source.suggestions,
          ...(source.kind === "create"
            ? ["绿色，像一片小叶子。"]
            : EXTRA_IDEAS[source.id]
              ? [EXTRA_IDEAS[source.id]]
              : []),
        ].map((label, i) => ({ id: `${source.id}-${i}`, label })),
        closing: [],
        events: source.events || [],
        next: source.next,
        final: chapter.id === 6 && chapterScene === chapter.scenes.length - 1,
      };
    }),
  ),
  ending: {
    title: "第一束光，一直是你的声音",
    text: "六种颜色回来了。下一颗星球上，朋友们对怎样救回好奇心有不同的想法。",
    companionLine:
      "你最初说：“{firstWords}”我们一直记着。接下来，带着好奇去听听不同的理由，再把你想的办法做出来。",
  },
};
