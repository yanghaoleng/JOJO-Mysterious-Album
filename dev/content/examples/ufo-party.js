// 沙盒故事剧本：月球飞碟水果派对。
// 一个孩子口述的故事，逐步在世界工坊沙盒模拟器里演出来。
// 结构与 AI_CONTROL_LEVEL 相同：steps 每步是自然语言指令（say）+ 世界命令（commands）。
// step.world 表示先切换到该星球（圆形缩放转场 + 带上原星球实体）；wait 是播放下一步前的停留秒数。

const spawn = (id, asset, position, scale = 1, extra = {}) => ({
  type: "entity.spawn", id, asset, position, scale, ...extra,
});

export const UFO_PARTY_STORY = {
  id: "ufo-party",
  title: "月球飞碟水果派对",
  world: "moon",
  sceneId: "ufo-party",
  steps: [
    {
      id: "to-moon",
      say: "圆形的光收起来——月球到啦！",
      world: "moon",
      wait: 5.2,
      commands: [],
    },
    {
      id: "squad-appear",
      say: "在月球上，突然出现了叫叫小分队！",
      wait: 4.6,
      commands: [
        spawn("sq-jiaojiao", "npc:jiaojiao", [-1.6, 1.2], 0.9),
        spawn("sq-lingdang", "npc:lingdang", [0, 1.4], 0.9),
        spawn("sq-zhuxiaodi", "npc:zhuxiaodi", [1.6, 1.2], 0.9),
      ],
    },
    {
      id: "patrol",
      say: "他们在月球上巡逻。",
      wait: 4.2,
      commands: [
        { type: "group.patrol", targets: ["sq-jiaojiao", "sq-lingdang", "sq-zhuxiaodi"] },
      ],
    },
    {
      id: "bean-appear",
      say: "这时，绿豆家族出现了，包围住了叫叫小分队！",
      wait: 4.8,
      commands: [
        spawn("bn-lvdou", "npc:lvdou", [-3.4, -2.2], 1),
        spawn("bn-fendou", "npc:fendou", [3.4, -2.4], 1),
        spawn("bn-douya", "npc:douya", [-3.6, 2.6], 1),
        spawn("bn-landou", "npc:landou", [3.6, 2.4], 1),
        spawn("bn-dahongdou", "npc:dahongdou", [0, -3.2], 1),
        {
          type: "group.surround",
          targets: ["sq-jiaojiao", "sq-lingdang", "sq-zhuxiaodi"],
          surrounders: ["bn-lvdou", "bn-fendou", "bn-douya", "bn-landou", "bn-dahongdou"],
        },
      ],
    },
    {
      id: "ufo-hover",
      say: "就在这紧张的时刻，上空出现了盘旋的飞碟！",
      wait: 4.6,
      commands: [
        spawn("ufo-1", "prop:ufo", [0, 2.6], 1.5),
        { type: "fx.play", effect: "stars" },
        { type: "world.float", on: true },
      ],
    },
    {
      id: "drivers",
      say: "飞碟里走出了奶龙和牛来：“大家不要紧张，都是朋友，大家一起吃水果吧！”",
      wait: 6.5,
      commands: [
        spawn("driver-round", "yellow:round", [-1.1, 1.9], 1, { name: "奶龙" }),
        spawn("driver-bull", "yellow:bull", [1.1, 1.9], 1, { name: "牛来" }),
        { type: "fx.play", effect: "sparkle" },
      ],
    },
    {
      id: "fruit",
      say: "飞碟变出了好多水果给大家！",
      wait: 5.2,
      commands: [
        spawn("fr-apple", "prop:procedural", [-3.6, 2.4], 0.8, { name: "苹果" }),
        spawn("fr-orange", "prop:procedural", [-1.2, 2.2], 0.8, { name: "橙子" }),
        spawn("fr-banana", "prop:procedural", [1.2, 2.2], 0.8, { name: "香蕉" }),
        spawn("fr-grape", "prop:procedural", [3.6, 2.4], 0.8, { name: "葡萄" }),
        spawn("fr-strawberry", "prop:procedural", [0, -3.2], 0.8, { name: "草莓" }),
        spawn("fr-watermelon", "prop:procedural", [-3.6, -2.4], 0.9, { name: "西瓜" }),
      ],
    },
    {
      id: "eat",
      say: "大家一起愉快地吃水果！",
      wait: 7.5,
      commands: [
        {
          type: "feeding.start",
          eaters: ["sq-jiaojiao", "sq-lingdang", "sq-zhuxiaodi", "bn-lvdou", "bn-fendou", "bn-douya", "bn-landou", "bn-dahongdou", "driver-round", "driver-bull"],
          foods: ["fr-apple", "fr-orange", "fr-banana", "fr-grape", "fr-strawberry", "fr-watermelon"],
        },
      ],
    },
    {
      id: "eaten-up",
      say: "哇，水果真的被大家吃光啦！",
      wait: 3.6,
      commands: [],
    },
    {
      id: "depart",
      say: "大家分别坐着不同的飞碟飞走了！",
      wait: 6.2,
      commands: [
        spawn("ufo-a", "prop:ufo", [-2.2, 1.6], 1.2),
        spawn("ufo-b", "prop:ufo", [0, 2], 1.2),
        spawn("ufo-c", "prop:ufo", [2.2, 1.6], 1.2),
        { type: "group.ride", driver: "sq-jiaojiao", mount: "ufo-a" },
        { type: "group.ride", driver: "sq-lingdang", mount: "ufo-b" },
        { type: "group.ride", driver: "sq-zhuxiaodi", mount: "ufo-c" },
        { type: "fx.play", effect: "vanishStar" },
      ],
    },
    {
      id: "back-home",
      say: "奶龙和牛来搭着大家，一起回到萌萌星！",
      world: "meadow",
      wait: 5.5,
      commands: [
        { type: "fx.play", effect: "confetti" },
      ],
    },
    {
      id: "the-end",
      say: "故事讲完啦！水果派对真开心～",
      wait: 2,
      commands: [],
    },
  ],
};
