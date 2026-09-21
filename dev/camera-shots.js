// 模块化镜头清单：把用户可操作与代码可调用的镜头统一抽象为可注册的镜头。
// 新增镜头只需在 CAMERA_SHOTS 追加一条：
//   - kind: "ground" | "overhead" | "orbit" | "closeup" 走现有固定预设；
//   - kind: "follow" 为第三人称跟随（distance 相机到目标距离 / height 相机高度，角色背后略高）；
//   - kind: "fps"    为第一人称（相机放在目标头部高度，看向当前朝向前方）。
// 世界工坊的下拉列表、LLM 运镜建议、cycle 快捷按钮都从这里取镜头定义。

export const CAMERA_SHOTS = [
  // 固定预设（常规视角）
  { id: "ground", label: "平视全景", group: "常规视角", kind: "ground" },
  { id: "overhead", label: "俯视全局", group: "常规视角", kind: "overhead" },
  { id: "orbit", label: "环绕视角", group: "常规视角", kind: "orbit" },
  { id: "closeup", label: "近景特写", group: "常规视角", kind: "closeup" },
  // 跟随视角（需要目标：当前跟随角色 → 场景最近角色 → 场景中心）
  { id: "tps-far", label: "第三人称 · 远", group: "跟随视角", kind: "follow", distance: 9.5, height: 3.4 },
  { id: "tps-mid", label: "第三人称 · 中", group: "跟随视角", kind: "follow", distance: 5.8, height: 2.5 },
  { id: "tps-near", label: "第三人称 · 近", group: "跟随视角", kind: "follow", distance: 3.1, height: 1.8 },
  { id: "fps", label: "第一人称", group: "跟随视角", kind: "fps" },
];

export function cameraShotById(id) {
  return CAMERA_SHOTS.find((shot) => shot.id === id) || null;
}

// 固定预设的循环顺序（平视/俯视切换快捷按钮用）
export const CAMERA_CYCLE = ["ground", "overhead", "orbit", "closeup"];
