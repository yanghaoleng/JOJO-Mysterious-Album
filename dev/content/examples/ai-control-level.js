// A tiny, deterministic level for testing model-issued spatial commands.
// Coordinates are the same local surface coordinates used by the world runtime.
export const AI_CONTROL_LEVEL = {
  id: "ai-control-level",
  world: "meadow",
  sceneId: "ai-control-level",
  steps: [
    {
      id: "place-ball",
      say: "放一个新球在草地中央",
      commands: [{ type: "entity.spawn", id: "new-ball", asset: "prop:balloon", position: [0, 0], color: "#d7a9a5", scale: 0.8 }],
    },
    {
      id: "npc-behind-ball",
      say: "让 NPC 走到新球背面",
      commands: [{ type: "entity.spawn", id: "npc-guide", asset: "npc:jiaojiao-mom", position: [0, -2.3], scale: 0.7 }],
    },
    {
      id: "jiaojiao-front",
      say: "让叫叫出现在我面前",
      commands: [{ type: "entity.spawn", id: "jiaojiao", asset: "npc:jiaojiao", position: [0, 2.4], scale: 0.7 }],
    },
    {
      id: "giant-pocket",
      say: "移动到巨人的口袋",
      commands: [{ type: "entity.move", id: "jiaojiao", position: [0, 7.2] }],
    },
    {
      id: "ten-rockets",
      say: "出现 10 个好奇火箭",
      commands: Array.from({ length: 10 }, (_, i) => ({
        type: "entity.spawn",
        id: `curious-rocket-${i + 1}`,
        asset: "prop:rocket",
        position: [-4.5 + (i % 5) * 2.25, 4.5 + Math.floor(i / 5) * 1.2],
        color: "#e1b671",
        scale: 0.45,
      })),
    },
  ],
};

export const AI_CONTROL_EXPECTATIONS = {
  "new-ball": [0, 0],
  "npc-guide": [0, -2.3],
  jiaojiao: [0, 7.2],
};
