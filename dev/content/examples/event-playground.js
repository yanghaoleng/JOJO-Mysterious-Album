// A working script used by the module gallery and runtime tests.
export const EVENT_PLAYGROUND = {
  id: "showcase",
  version: 1,
  events: [
    {
      id: "opening",
      on: "scene.enter",
      once: true,
      effects: [
        {
          type: "entity.spawn",
          id: "demo-windmill",
          asset: "prop:windmill",
          position: [-1.1, 2],
          scale: 1,
        },
        {
          type: "entity.spawn",
          id: "demo-friend",
          asset: "npc:lingdang",
          position: [1.25, 1.5],
          scale: 0.85,
        },
      ],
    },
    {
      id: "start-working",
      on: "demo.start",
      effects: [
        { type: "entity.state", id: "demo-windmill", state: "working" },
        { type: "entity.animate", id: "demo-friend", animation: "wave" },
      ],
    },
    {
      id: "first-question",
      on: "entity.interact",
      when: { entityId: "demo-windmill" },
      once: true,
      effects: [
        { type: "flag.set", key: "asked-windmill", value: true },
        { type: "entity.animate", id: "demo-friend", animation: "wave" },
      ],
    },
    {
      id: "add-a-garden",
      on: "demo.garden",
      effects: [
        {
          type: "entity.spawn",
          id: "idea-garden",
          asset: "prop:garden",
          position: [0, 3.4],
        },
      ],
    },
    {
      id: "clear-garden",
      on: "demo.remove",
      effects: [{ type: "entity.remove", id: "idea-garden" }],
    },
    {
      id: "night",
      on: "demo.night",
      effects: [{ type: "environment.set", preset: "night" }],
    },
    {
      id: "day",
      on: "demo.day",
      effects: [{ type: "environment.set", preset: "day" }],
    },
  ],
};
