import { MODULE_CATALOG, MODULE_KINDS } from "./catalog.js";
import { DioramaStage } from "../stage.js";
import { createGameSession } from "../runtime/game-session.js";
import { renderChoices } from "../presentation/choice-list.js";
import { createEncounterDialog } from "../presentation/encounter-dialog.js";
import { createVoiceInput } from "../../src/voice-input-control.js";
import { AnswerSupport } from "../answer-support.js";
import { planCreation } from "../creation-catalog.js";
import { resolveSceneIndex } from "../runtime/story-progress.js";
import { EVENT_PLAYGROUND } from "../content/examples/event-playground.js";
import { AI_CONTROL_LEVEL } from "../content/examples/ai-control-level.js";

const $ = (id) => document.getElementById(id);
let stage,
  game,
  selected,
  filter = "all",
  limit = 60,
  cleanup = () => {};
let controlRecords = [], activeControlRecord = -1;
const counts = Object.fromEntries(
  Object.keys(MODULE_KINDS).map((kind) => [
    kind,
    MODULE_CATALOG.filter((m) => m.kind === kind).length,
  ]),
);
const report = (text) => ($("preview-status").textContent = text);
$("catalog-summary").textContent = Object.entries(counts)
  .map(([kind, n]) => `${n} 个${MODULE_KINDS[kind]}`)
  .join(" · ");
renderChoices(
  $("filters"),
  [
    { id: "all", label: "全部" },
    ...Object.entries(MODULE_KINDS).map(([id, label]) => ({
      id,
      label: `${label} ${counts[id]}`,
    })),
  ],
  (choice) => {
    filter = choice.id;
    limit = 60;
    renderList();
  },
);
function renderList() {
  const q = $("module-search").value.toLowerCase().trim();
  const found = MODULE_CATALOG.filter(
    (m) =>
      (filter === "all" || m.kind === filter) &&
      `${m.name} ${m.id} ${m.description}`.toLowerCase().includes(q),
  );
  $("module-list").replaceChildren(
    ...found.slice(0, limit).map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "module-row";
      button.dataset.module = item.id;
      button.setAttribute("aria-current", String(selected?.id === item.id));
      const name = document.createElement("strong"),
        id = document.createElement("small");
      name.textContent = item.name;
      id.textContent = item.id;
      button.append(name, id);
      button.onclick = () => select(item);
      return button;
    }),
  );
  if (!found.length) {
    const p = document.createElement("p");
    p.textContent = "没有找到，试试另一个名字。";
    $("module-list").append(p);
  }
  $("load-more").hidden = found.length <= limit;
  $("filters")
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.choice === filter)),
    );
}
$("module-search").oninput = () => {
  limit = 60;
  renderList();
};
$("search-submit").onclick = () => { $("module-search").focus(); renderList(); };
$("sidebar-toggle").onclick = () => {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  $("sidebar-toggle").setAttribute("aria-expanded", String(!collapsed));
  $("sidebar-toggle").textContent = collapsed ? "展开模块栏" : "收起模块栏";
  $("sidebar-toggle").setAttribute("aria-label", collapsed ? "展开模块栏" : "收起模块栏");
};
$("load-more").onclick = () => {
  limit += 60;
  renderList();
};
function button(label, run) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.onclick = () => {
    try {
      run();
    } catch (error) {
      report(error.message);
    }
  };
  $("preview-controls").append(b);
  return b;
}
function log() {
  if (game)
    $("runtime-report").textContent = JSON.stringify(
      {
        revision: game.runtime.state.revision,
        entities: stage.worldPresenter.stats,
        events: game.runtime.log.slice(-3),
      },
      null,
      2,
    );
}
function commands(list) {
  const result = game.dispatch(list);
  report(
    result.ok ? "已应用，可以在上方看到变化。" : `没有应用：${result.error}`,
  );
  log();
  return result;
}
function startWorld(
  world = "meadow",
  cast = [],
  saved,
  script = { id: "showcase", version: 1 },
) {
  const viewport = $("preview-stage");
  viewport.classList.remove("scene-transition-in");
  viewport.classList.add("scene-transition-out");
  $("preview-stage").hidden = false;
  if (!stage) stage = new DioramaStage($("preview-stage"));
  game?.dispose();
  game = createGameSession({ story: script, stage, saved, onChange: () => {} });
  stage.setScene(world, cast, { studio: true });
  stage.setCameraDriftEnabled(false);
  game.bind({ id: "showcase-scene", world }, cast);
  stage.resize();
  requestAnimationFrame(() => {
    viewport.classList.remove("scene-transition-out");
    viewport.classList.add("scene-transition-in");
    setTimeout(() => viewport.classList.remove("scene-transition-in"), 520);
  });
}
function fillProposal() {
  if (!game) return;
  $("command-input").value = JSON.stringify(
    {
      version: 1,
      context: game.runtime.token,
      commands: [
        {
          type: "entity.spawn",
          id: "idea-garden",
          asset: "prop:garden",
          position: [-1.5, 2],
          color: "#baa7d2",
          scale: 0.75,
        },
        { type: "entity.animate", id: "idea-garden", animation: "activate" },
      ],
    },
    null,
    2,
  );
}
function eventDemo() {
  startWorld("meadow", [], undefined, EVENT_PLAYGROUND);
  game.emit("scene.enter");
  const event = (name) => {
    const results = game.emit(name);
    report(results.every((r) => r.ok) ? "剧情事件已触发。" : "事件未能应用。");
    log();
  };
  button("开始工作", () => event("demo.start"));
  button("停下来", () =>
    commands([{ type: "entity.state", id: "demo-windmill", state: "idle" }]),
  );
  button("增加花园", () => event("demo.garden"));
  button("收起花园", () => event("demo.remove"));
  button("夜晚", () => event("demo.night"));
  button("白天", () => event("demo.day"));
  button("保存并恢复试验", () => {
    const saved = game.runtime.snapshot;
    startWorld("meadow", [], saved, EVENT_PLAYGROUND);
    game.emit("scene.enter");
    log();
    report("已从快照恢复物件和环境；游戏存档没有变化。");
  });
  $("command-panel").hidden = false;
  fillProposal();
  log();
}
function aiControlDemo() {
  startWorld(AI_CONTROL_LEVEL.world);
  $("command-panel").dataset.mode = "natural";
  $("preview-ui").hidden = true;
  $("command-panel").hidden = false;
  controlRecords = [];
  activeControlRecord = -1;
  renderControlTabs();
  $("runtime-report").textContent = "等待输入……\n当前场景：meadow\n渲染状态：已就绪";
}
function renderControlTabs() {
  const host = $("control-tabs");
  if (!host) return;
  host.replaceChildren(...controlRecords.map((record, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "control-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(index === activeControlRecord));
    tab.textContent = `${record.text.slice(0, 4)}${record.text.length > 4 ? "…" : ""}`;
    tab.title = record.text;
    tab.onclick = () => { activeControlRecord = index; renderControlTabs(); controlLog(record.lines, false); };
    return tab;
  }));
}
function controlLog(lines) {
  const output = $("runtime-report");
  output.classList.remove("console-reveal");
  void output.offsetWidth;
  output.textContent = lines.join("\n");
  output.classList.add("console-reveal");
}
async function naturalControl() {
  const input = $("natural-command-input"), status = $("natural-command-status");
  const text = input.value.trim();
  if (!text || !game) return;
  status.textContent = "大模型正在理解这句话……";
  const context = {
    world: game.runtime.context.world,
    entities: game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {},
    worlds: ["meadow", "pocket", "orchard", "bakery", "bridge", "home", "observatory", "reef", "cloud", "moon", "cove"],
  };
  try {
    const response = await fetch("/api/scene-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, context }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "大模型暂时不可用");
    const trace = ["[1] 收到用户原始文本", `    ${text}`, "[2] 当前场景", `    ${context.world}`, "[3] 关键词匹配", `    ${result.matches?.join("、") || "无（交给大模型理解）"}`, "[4] 意图解析", `    来源：${result.source || "model"}`, `    ${result.reply}`];
    if (result.sceneSwitch?.world && result.sceneSwitch.world !== game.runtime.context.world) {
      startWorld(result.sceneSwitch.world);
      trace.push("[5] 场景切换", `    ${result.sceneSwitch.world}`, "    状态：已完成淡出 / 淡入");
    }
    const applied = game.gateway.apply({ version: 1, context: game.runtime.token, commands: result.commands }, "ai");
    trace.push("[6] 世界命令执行", `    ${applied.ok ? "成功" : applied.error}`);
    trace.push("[7] 渲染状态", `    ${applied.ok ? "已提交到 3D 表现层，入场动画播放中" : "未渲染"}`);
    controlRecords.push({ text, lines: trace });
    activeControlRecord = controlRecords.length - 1;
    renderControlTabs();
    controlLog(trace);
    status.textContent = applied.ok ? `${result.reply} 已执行。` : `已解析，但执行失败：${applied.error}`;
  } catch (error) {
    status.textContent = `调试失败：${error.message}`;
    const trace = ["[1] 收到用户原始文本", `    ${text}`, "[错误]", `    ${error.message}`];
    controlRecords.push({ text, lines: trace });
    activeControlRecord = controlRecords.length - 1;
    renderControlTabs();
    controlLog(trace);
  }
}
function choicesDemo() {
  const host = document.createElement("div");
  host.className = "demo-options";
  $("preview-ui").append(host);
  renderChoices(
    host,
    [
      { id: "observe", label: "先看看" },
      { id: "try", label: "试一小步" },
      { id: "listen", label: "听听朋友" },
    ],
    (choice) => report(`你选了：${choice.label}`),
  );
}
function encounterDemo(config) {
  const view = createEncounterDialog({
    onClose: () => {
      view.hide();
      report("对话已关闭，可以再次打开。");
    },
  });
  cleanup = () => view.dispose();
  const open = () =>
    view.show(config, (choice) =>
      report(`互动回调：${choice.action} · ${choice.response}`),
    );
  button("打开角色对话", open);
  report("点一下打开。这里试用真实对话组件，不播放合成语音。");
}
function voiceDemo() {
  const mic = document.createElement("button"),
    transcript = document.createElement("p"),
    status = document.createElement("p");
  mic.type = "button";
  mic.className = "demo-mic";
  $("preview-ui").append(mic, transcript, status);
  const input = createVoiceInput({ button: mic, transcript, status });
  for (const state of [
    "listening",
    "receiving",
    "transcribing",
    "speaking",
    "paused",
    "error",
  ])
    button(state, () => {
      input.setState(state, { message: "演示状态，不采集声音" });
      input.setLevel(state === "receiving" ? 0.6 : 0);
      if (state === "transcribing") input.setTranscript("我想造一座蓝色小桥");
    });
  cleanup = () => input.dispose();
}
function supportDemo() {
  let support;
  const p = document.createElement("p");
  p.textContent = "点击“开始等候”后，观察选项何时出现。";
  $("preview-ui").append(p);
  const options = document.createElement("div");
  options.className = "demo-options";
  $("preview-ui").append(options);
  support = new AnswerSupport({
    available: () => true,
    reveal: () => {
      renderChoices(
        options,
        [
          { id: "bridge", label: "一座小桥" },
          { id: "garden", label: "一片花园" },
          { id: "robot", label: "一个机器人" },
        ],
        (c) => report(c.label),
      );
      report("计时结束，选项已出现。");
    },
  });
  button("开始等候", () => {
    options.replaceChildren();
    support.start();
    report("等待中：未开口时约 4 秒后出现选项。");
  });
  button("模拟已经开口", () => {
    support.capture({ state: "receiving" });
    report("已开口，等待窗口延长至约 8 秒。");
  });
  cleanup = () => support.stop();
}
function showLogic(item) {
  if (
    [
      "logic:world-runtime",
      "logic:director",
      "logic:intent",
      "logic:presenter",
    ].includes(item.id)
  ) {
    item.id === "logic:intent" ? aiControlDemo() : eventDemo();
    return;
  }
  $("preview-ui").hidden = false;
  if (item.id === "ui:choices") {
    choicesDemo();
    return;
  }
  if (item.id === "ui:encounter") {
    encounterDemo(MODULE_CATALOG.find((m) => m.kind === "encounter").encounter);
    return;
  }
  if (item.id === "ui:voice") {
    voiceDemo();
    return;
  }
  if (item.id === "logic:answer-support") {
    supportDemo();
    return;
  }
  if (item.id === "logic:creation") {
    const input = document.createElement("input");
    input.type = "search";
    input.value = "请铃铛造一座蓝色小桥和花园";
    input.setAttribute("aria-label", "造物想法");
    const pre = document.createElement("pre");
    $("preview-ui").append(input, pre);
    const run = () => {
      pre.textContent = JSON.stringify(planCreation(input.value), null, 2);
    };
    button("试着理解这句话", run);
    run();
    return;
  }
  if (item.id === "logic:progress") {
    const pre = document.createElement("pre");
    $("preview-ui").append(pre);
    button("在旧进度前插入一幕", () => {
      const saved = { sceneId: "meet", sceneIndex: 1 },
        story = {
          scenes: [{ id: "opening" }, { id: "new-event" }, { id: "meet" }],
        };
      const index = resolveSceneIndex(story, saved);
      pre.textContent = `旧数字位置：1\n插入新事件后的恢复位置：${index}\n仍在场景：${story.scenes[index].id}`;
    });
    return;
  }
  const p = document.createElement("p");
  p.textContent =
    item.kind === "story"
      ? "这个模块是可编辑脚本。使用下方源文件入口修改，三个正式章节会读取同一份内容。"
      : "该模块通过游戏流程验证。这里展示它的职责和源码入口。";
  $("preview-ui").append(p);
  if (item.kind === "story" || item.id === "logic:exploration") {
    const a = document.createElement("a");
    a.href =
      item.id === "story:debate"
        ? "/dev/debate"
        : `/dev/?story=${item.id.startsWith("story:") ? item.id.slice(6) : "wow"}`;
    a.textContent = "打开实际故事 ↗";
    a.target = "_blank";
    a.rel = "noopener";
    $("preview-ui").append(a);
  }
}
function select(item) {
  cleanup();
  cleanup = () => {};
  game?.dispose();
  game = null;
  $("audio-preview").pause();
  $("audio-preview").removeAttribute("src");
  $("audio-preview").load();
  $("audio-preview").hidden = true;
  $("preview-stage").hidden = true;
  $("preview-ui").hidden = true;
  $("preview-ui").replaceChildren();
  $("preview-controls").replaceChildren();
  $("command-panel").hidden = true;
  selected = item;
  history.replaceState(null, "", `#${encodeURIComponent(item.id)}`);
  $("module-kind").textContent = MODULE_KINDS[item.kind];
  $("module-name").textContent = item.name;
  $("module-description").textContent = item.description;
  $("module-id").textContent = item.id;
  $("module-source").href =
    `https://github.com/yanghaoleng/JOJO-Mysterious-Album/blob/main/${item.source}`;
  $("capabilities").replaceChildren(
    ...[...new Set(item.capabilities)].map((text) => {
      const span = document.createElement("span");
      span.textContent = text;
      return span;
    }),
  );
  report("");
  if (item.kind === "actor") {
    startWorld("meadow", [
      {
        id: "preview",
        asset: item.id,
        color: item.asset.color,
        name: item.name,
      },
    ]);
    for (const action of item.asset.animations)
      button(
        {
          idle: "休息",
          wave: "挥手",
          hop: "跳一跳",
          listen: "听一听",
          talk: "说句话",
          walk: "迈小步",
        }[action] || action,
        () =>
          commands([
            { type: "actor.animate", target: "preview", animation: action },
          ]),
      );
  } else if (item.kind === "prop") {
    startWorld();
    commands([
      {
        type: "entity.spawn",
        id: "preview",
        asset: item.id,
        position: [0, 1.5],
        scale: 1.2,
      },
    ]);
    button("试试机关", () =>
      commands([
        { type: "entity.animate", id: "preview", animation: "activate" },
      ]),
    );
    button("暂停动作", () =>
      commands([{ type: "entity.state", id: "preview", state: "idle" }]),
    );
    button("继续工作", () =>
      commands([{ type: "entity.state", id: "preview", state: "working" }]),
    );
    button("换成蓝色", () =>
      commands([{ type: "entity.color", id: "preview", color: "#95becb" }]),
    );
  } else if (item.kind === "world") {
    startWorld(item.id.slice(6));
    button("环境回应", () =>
      commands([{ type: "world.react", action: "celebrate" }]),
    );
  } else if (item.kind === "audio") {
    $("audio-preview").src = item.url;
    $("audio-preview").hidden = false;
    report("点击播放器试听；切换模块会停止当前声音。");
  } else if (item.kind === "encounter") {
    startWorld(item.encounter.world, [
      {
        id: "preview",
        asset: item.encounter.yellow
          ? item.encounter.id
          : `npc:${item.encounter.id}`,
        name: item.encounter.name,
      },
    ]);
    encounterDemo(item.encounter);
  } else showLogic(item);
  renderList();
}
$("apply-proposal").onclick = () => {
  try {
    const result = game.gateway.apply(JSON.parse($("command-input").value));
    report(result.ok ? "提案已应用。" : `没有应用：${result.error}`);
    log();
  } catch (error) {
    report(`没有应用：${error.message}`);
  }
};
$("refresh-proposal").onclick = fillProposal;
$("natural-command-submit").onclick = naturalControl;
$("natural-command-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") naturalControl();
});
$("audio-preview").addEventListener("error", () =>
  report("这段声音暂时没能加载，请稍后重试。"),
);
addEventListener("pagehide", () => {
  cleanup();
  game?.dispose();
  $("audio-preview").pause();
});
try {
  const id = decodeURIComponent(location.hash.slice(1));
  select(
    MODULE_CATALOG.find((m) => m.id === id) ||
      MODULE_CATALOG.find((m) => m.id === "prop:windmill"),
  );
} catch (error) {
  console.error(error);
  report(`预览暂时无法打开：${error.message}`);
}
window.__MODULE_GALLERY__ = {
  get status() {
    return {
      selected: selected?.id,
      count: MODULE_CATALOG.length,
      runtime: game
        ? {
            revision: game.runtime.state.revision,
            worlds: game.runtime.snapshot.worlds,
          }
        : null,
      stage: stage?.stats(),
    };
  },
};
