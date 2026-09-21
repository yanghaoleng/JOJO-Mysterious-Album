import { ASSETS } from "../content/assets.js";
import { WORLD_CATALOG } from "../content/worlds.js";
import { AUDIO_CATALOG } from "../content/audio.generated.js";
import { ENCOUNTERS } from "../content/encounters.js";
import { PROP_COLLECTION } from "../content/prop-collection.js";
import { CREATION_KITS, PROP_CATEGORIES } from "../content/props.js";

// Adding a reusable UI/logic module requires an entry here. Assets are derived automatically.
export const COMPONENTS = [
  {id:'logic:group-motion',kind:'logic',name:'巡逻、聚拢与包围',description:'输入“叫叫小分队开始在月球上巡逻”或“绿豆家族围住了叫叫小分队”：角色沿直线来回巡逻、集合聚拢或围成一圈，纯表演动作不改变存档。',source:'dev/presentation/movement-controller.js',capabilities:['巡逻走动','聚拢集合','包围成圈','不落盘'],dependencies:['logic:intent']},
  {id:'logic:fx-play',kind:'logic',name:'特效与天气',description:'输入“放烟花”“下雪”“画面震动”“变大”“都飘起来”：烟雾、闪光、烟花、撒花、流星、雨雪天气、画面震动、巨化微缩与无重力漂浮等视觉特效。',source:'dev/presentation/pfx-controller.js',capabilities:['烟花撒花','下雨下雪','画面震动','巨化微缩','无重力漂浮'],dependencies:['logic:intent']},
  {id:'logic:feeding',kind:'logic',name:'角色寻找食物与循环进食',description:'输入“10个猪小弟吃80个汉堡包”：分批生成角色与食物，角色独占目标，靠近后每两下吃掉一份；在 AI 控制台验证，可说停止吃。',source:'dev/presentation/feeding-controller.js',capabilities:['多对象指令','寻找食物','两次咀嚼消耗','停止与清理'],dependencies:['logic:intent']},
  {id:'logic:story-tap-target',kind:'logic',name:'剧情对象点选引导',description:'脚本指定目标，循环柔光与点击强光，共用回答入口；验证入口 dev/tools/verify-story-tap.mjs。',source:'dev/presentation/story-tap-target.js',capabilities:['3D 对象点选','循环发光','点击反馈','减少动态效果','资源释放'],dependencies:[]},
  {
    id: "logic:dialogue",
    kind: "logic",
    name: "对话播放与字幕",
    description: "把说话人、台词和朗读字幕组合成可取消的对话序列。",
    source: "dev/presentation/dialogue-player.js",
    capabilities: ["连续台词", "分段朗读", "过期回调隔离"],
    dependencies: ["logic:read-along"],
  },
  {
    id: "logic:contracts",
    kind: "logic",
    name: "世界能力约定",
    description: "所有来源共用的命令字段、范围与资源校验。",
    source: "dev/runtime/contracts.js",
    capabilities: ["字段检查", "资源白名单"],
    dependencies: [],
  },
  {
    id: "logic:session",
    kind: "logic",
    name: "游戏会话装配",
    description: "连接事件、存档、世界命令和呈现器，离开场景时释放实例。",
    source: "dev/runtime/game-session.js",
    capabilities: ["场景绑定", "生命周期"],
    dependencies: ["logic:director", "logic:presenter"],
  },
  {
    id: "logic:actor-factory",
    kind: "logic",
    name: "角色模型装配",
    description: "通过资源 ID 装配原创角色、故事角色、MOMO 和黄色四巨头。",
    source: "dev/presentation/actor-factory.js",
    capabilities: ["统一模型入口", "稳定实例身份"],
    dependencies: [],
  },
  {
    id: "logic:prop-animation",
    kind: "logic",
    name: "道具动画与释放",
    description: "为独立道具提供激活、工作、停止与释放接口。",
    source: "dev/creation-models.js",
    capabilities: ["通用状态", "资源所有权", "减少动态"],
    dependencies: [],
  },
  {
    id: "ui:choices",
    kind: "ui",
    name: "短选项列表",
    description: "共用的点选输入，第一章、辩论和彩蛋都在使用。",
    source: "dev/presentation/choice-list.js",
    capabilities: ["文字安全渲染", "选择回调", "键盘焦点"],
    dependencies: [],
  },
  {
    id: "ui:encounter",
    kind: "ui",
    name: "NPC 对话框",
    description: "招呼、两项互动、继续探索。世界行为与朗读由调用方提供。",
    source: "dev/presentation/encounter-dialog.js",
    capabilities: ["对话展示", "焦点恢复", "退出清理"],
    dependencies: ["ui:choices"],
  },
  {
    id: "ui:voice",
    kind: "ui",
    name: "语音输入状态",
    description:
      "等待、收音、转写、识别文字和暂停状态的统一展示。演示不申请麦克风。",
    source: "src/voice-input-control.js",
    capabilities: ["录音状态", "音量反馈", "原话展示"],
    dependencies: [],
  },
  {
    id: "logic:answer-support",
    kind: "logic",
    name: "等待与选项兜底",
    description: "4 秒未开口，或 8 秒仍未有具体回答时，提供短选项。",
    source: "dev/answer-support.js",
    capabilities: ["静默计时", "收到语音", "暂停计时"],
    dependencies: ["ui:choices"],
  },
  {
    id: "logic:world-runtime",
    kind: "logic",
    name: "世界命令与事件试验区",
    description:
      "增加与移除物件、切换环境、播放动作；无效批次整体拒绝。可试用 AI 的结构化提案。",
    source: "dev/runtime/world-runtime.js",
    capabilities: ["原子校验", "版本检查", "世界快照", "能力白名单"],
    dependencies: ["logic:director", "logic:intent"],
  },
  {
    id: "logic:director",
    kind: "logic",
    name: "剧情事件运行器",
    description:
      "按进入场景、选择、靠近和造物事件执行规则；支持条件、一次性事件和参数绑定。",
    source: "dev/runtime/story-director.js",
    capabilities: ["事件条件", "故事旗标", "一次性触发"],
    dependencies: [],
  },
  {
    id: "logic:intent",
    kind: "logic",
    name: "语音 / AI 操作入口",
    description:
      "语音意图和模型提案共用命令入口。提案携带场景版本，旧场景的回答不能修改新场景。",
    source: "dev/runtime/intent-gateway.js",
    capabilities: ["能力描述", "提案校验", "拒绝过期操作"],
    dependencies: [],
  },
  {
    id: "logic:creation",
    kind: "logic",
    name: "造物组合规则",
    description:
      "识别已有模型、颜色与伙伴，生成创建或修改命令。未知想法明确保存成试作品。",
    source: "dev/features/creation-service.js",
    capabilities: ["三件组合", "继续修改", "容量限制"],
    dependencies: [],
  },
  {
    id: "logic:progress",
    kind: "logic",
    name: "场景进度与旧档迁移",
    description:
      "用稳定场景 ID 恢复进度，支持脚本改序、插入与删除场景；兼容旧数字存档。",
    source: "dev/runtime/story-progress.js",
    capabilities: ["稳定场景 ID", "分支跳转", "旧档兼容"],
    dependencies: [],
  },
  {
    id: "logic:exploration",
    kind: "logic",
    name: "球面探索与寻路",
    description: "地面点选、键盘移动、球面绕障、靠近触发。",
    source: "dev/exploration.js",
    capabilities: ["绕障行走", "区域事件", "坐标保存"],
    dependencies: [],
  },
  {
    id: "logic:voice",
    kind: "logic",
    name: "语音采集与朗读",
    description:
      "管理采集、识别、朗读和取消；只在孩子主动打开麦克风后申请权限。",
    source: "dev/voice.js",
    capabilities: ["ASR", "TTS", "取消与暂停"],
    dependencies: ["ui:voice"],
  },
  {
    id: "logic:read-along",
    kind: "logic",
    name: "朗读字幕同步",
    description: "按合成音频真实时间戳高亮字幕。无时间戳时展示原文。",
    source: "dev/read-along.js",
    capabilities: ["播放时钟", "字词高亮", "中断清理"],
    dependencies: [],
  },
  {
    id: "logic:presenter",
    kind: "logic",
    name: "3D 世界呈现器",
    description:
      "根据世界状态同步模型、碰撞与动画；释放被移除的实例，不推进剧情。",
    source: "dev/presentation/world-presenter.js",
    capabilities: ["模型增删", "状态同步", "资源释放"],
    dependencies: [],
  },
  {
    id: "ui:story-editor", kind: "ui", name: "脚本创作工作台",
    description: "打开任一故事脚本可编辑对白、选项与事件，保存草稿并导入导出；文字预演验证分支，不运行 AI 或 3D 效果。",
    source: "dev/modules/story-editor.js",
    capabilities: ["本地草稿", "场景编排", "脚本导入导出"],
    dependencies: ["logic:director"],
  },
  ...["wow", "debate", "moon"].map((id, i) => ({
    id: `story:${id}`,
    kind: "story",
    name: ["第一章 · 第一束好奇的光", "第二章 · 辩论与表达", "第三章 · 自由造物"][
      i
    ],
    description:
      "修改台词、问题、选项、场景顺序与事件的入口。故事内容不创建模型，也不操作页面。",
    source: `dev/content/stories/${id}.js`,
    capabilities: ["场景可视化", "对白与选项编辑", "事件编辑", "本地草稿", "JSON 导入导出", "文字分支预演"],
    dependencies: ["logic:director"],
  })),
  {
    id: "story:ufo-party",
    kind: "story",
    name: "沙盒故事 · 月球飞碟水果派对",
    description:
      "一个孩子口述的故事：叫叫小分队在月球巡逻，绿豆家族突然包围，奶龙与牛来开着飞碟带来水果派对。点击即在 3D 场景里自动演出：圆形缩放转场、星球随行搬运道具与角色。",
    source: "dev/content/examples/ufo-party.js",
    capabilities: ["自动剧情播放", "圆形缩放转场", "星球随行搬运", "角色改名"],
    dependencies: ["logic:intent"],
  },
];

export const MODULE_CATALOG = [
  ...COMPONENTS,
  ...Object.values(ASSETS).map((asset) => ({
    id: asset.id,
    kind: asset.kind,
    name: asset.name,
    description:
      asset.kind === "prop"
        ? CREATION_KITS.find((k) => `prop:${k.id}` === asset.id)?.response ||
          "把暂未匹配的想法呈现为彩色积木试作品。"
        : "可复用的实体角色模型，沿用既有造型与角色身份。",
    source:
      asset.kind === "prop"
        ? `dev/modules/props/${asset.id.slice(5)}.js`
        : asset.id.startsWith("npc:")
          ? "src/story-npcs/factory.js"
          : asset.id.startsWith("yellow:")
            ? "dev/yellow-four-models.js"
            : asset.id.startsWith("wow:")
              ? "dev/wow-visuals.js"
              : "dev/models.js",
    capabilities: [...asset.animations, ...asset.states],
    dependencies: [],
    asset,
    category: asset.kind === 'prop' ? PROP_CATEGORIES[asset.id.slice(5)] || '场景道具' : '角色',
    variety: PROP_COLLECTION.find(p => `prop:${p.id}` === asset.id)?.seed?.toString() || asset.id,
    tags: asset.kind === 'prop' && (['apple','banana','watermelon'].includes(asset.id.slice(5)) || PROP_COLLECTION.some(p => `prop:${p.id}` === asset.id && p.seed >= 28 && p.seed <= 37)) ? ['水果'] : [],
    keywords: asset.kind === "prop" ? CREATION_KITS.find(k => `prop:${k.id}` === asset.id)?.words.split("|") || [] : [asset.name],
  })),
  ...WORLD_CATALOG.map((world) => ({
    id: `world:${world.id}`,
    kind: "world",
    name: world.name,
    description: "完整球面环境，可复用到不同故事与事件。",
    source: "dev/worlds.js",
    capabilities: ["完整星球", "球面坐标", "环境反馈"],
    dependencies: [],
  })),
  ...ENCOUNTERS.map((n) => ({
    id: `encounter:${n.id}`,
    kind: "encounter",
    name: `${n.name} · ${n.occupation}`,
    description: `${n.storyId} / ${n.world}：${n.greeting}`,
    source: "dev/content/encounters.js",
    capabilities: ["靠近招呼", "短选项互动"],
    dependencies: ["ui:encounter"],
    encounter: n,
  })),
  ...AUDIO_CATALOG,
];

export const MODULE_KINDS = {
  prop: "道具",
  actor: "角色",
  world: "星球",
  ui: "界面",
  logic: "互动逻辑",
  encounter: "彩蛋",
  story: "故事脚本",
  audio: "音频",
};
