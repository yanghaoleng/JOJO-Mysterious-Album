import { planCreation } from "../creation-catalog.js";

// Domain rule only: no DOM, speech, meshes, persistence or asynchronous requests.
export function prepareCreation({ text, scene, creations, position, id }) {
  if (
    /自杀|自残|杀人|炸弹|武器|强奸|色情|身份证|手机号|我家在|住在|学校叫/.test(
      text,
    )
  )
    return {
      ok: false,
      message: "换成能帮助朋友探索的小机关吧，比如会亮的灯或小机器人。",
    };
  const plan = planCreation(text),
    inWorld = creations.filter((item) => item.world === scene.world),
    previous = inWorld.at(-1);
  const modifying = Boolean(
    previous &&
      /(?:刚才|这座|这个|它|原来).*(?:加|改|换)|^(给|把|让)?(刚才|这个|它|原来)|加上|换成|改成|再加|改为/.test(
        text,
      ),
  );
  if (inWorld.length >= 12 && !modifying)
    return {
      ok: false,
      message:
        "这里已经有十二件作品啦。可以说“给刚才的作品加一朵花”，继续改造它。",
    };
  const normal = modifying ? previous.normal : position();
  if (!normal)
    return { ok: false, message: "这边有点挤，走到旁边的空地再试试吧。" };
  const record = {
    ...plan,
    id: modifying ? previous.id : id,
    world: scene.world,
    scene: scene.id,
    normal,
  };
  if (modifying) {
    const replacing = /换成|改成|替换/.test(text);
    record.parts = replacing
      ? plan.parts
      : [
          ...new Set([
            ...previous.parts,
            ...plan.parts.filter((p) => p !== "prototype"),
          ]),
        ].slice(-3);
    record.name = replacing ? plan.name : previous.name;
    record.primary = /红|橙|黄|绿|蓝|紫|粉|白/.test(text)
      ? plan.primary
      : previous.primary;
    // Keep the current helper unless the child explicitly requests another friend.
    if (!/请|叫|和|让|帮/.test(text)) record.helper = previous.helper;
    if (plan.parts[0] === "prototype") {
      record.parts = previous.parts;
      record.response =
        record.primary !== previous.primary
          ? `${record.name}换上了你说的颜色。`
          : "原来的作品还在，新功能先记在作品旁。再说一个具体物件，朋友就能帮你接上去。";
    }
  }
  return {
    ok: true,
    record,
    modifying,
    commands: [
      { type: "creation.put", record },
      { type: "creation.activate", id: record.id },
    ],
  };
}
