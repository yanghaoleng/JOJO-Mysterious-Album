import { mountStoryEditor } from "./story-editor.js";
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
import { PROP_CATEGORIES } from "../content/props.js";
import { createElement, PanelLeftClose, PanelLeftOpen, Search, Library, BookOpen, Box, Users, Sparkles, Volume2, Route, Settings2 } from "lucide";
import { arrangeInView } from "./scatter.js";
import { capacityEvictions } from "../runtime/contracts.js";

const $ = (id) => document.getElementById(id);
let stage,
  game,
  selected,
  filter = "all",
  cleanup = () => {};
let controlRecords = [], activeControlRecord = -1;
let propCategory = "全部";
const categories = document.createElement("nav");
categories.id = "prop-categories";
categories.setAttribute("aria-label", "道具二级分类");
$("filters").after(categories);
for (const name of ["全部", "交通工具", "食物", "玩具", "场景道具"]) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = name;
  b.onclick = () => { propCategory = name; renderList(); };
  categories.append(b);
}
const icon = definition => createElement(definition, {width:20,height:20,"stroke-width":1.7,"aria-hidden":"true"});
const searchRow = document.createElement('div');
searchRow.className = 'sidebar-search-row';
const searchShell = document.querySelector('.search-shell');
searchShell.before(searchRow);
searchRow.append(searchShell, $('sidebar-toggle'));
$("sidebar-toggle").replaceChildren(icon(PanelLeftClose));
$("search-submit").replaceChildren(icon(Search));
$("search-submit").tabIndex = -1;
$("search-submit").setAttribute("aria-hidden", "true");
$("module-search").setAttribute("aria-label", "搜索模块");
const counts = Object.fromEntries(
  Object.keys(MODULE_KINDS).map((kind) => [
    kind,
    MODULE_CATALOG.filter((m) => m.kind === kind).length,
  ]),
);
const report = (text) => ($("preview-status").textContent = text);
const thumbnailCache = new Map(), thumbnailQueue = [];
let thumbnailBusy = false, thumbnailStage, thumbnailGame;
const thumbnailHost = document.createElement('div');
thumbnailHost.className = 'thumbnail-renderer';
document.body.append(thumbnailHost);
async function renderThumbnail(item, image) {
  if (thumbnailCache.has(item.id)) { image.src = thumbnailCache.get(item.id); return; }
  thumbnailQueue.push({item, image});
  if (thumbnailBusy) return;
  thumbnailBusy = true;
  while (thumbnailQueue.length) {
    const task = thumbnailQueue.shift();
    if (!task.image.isConnected || thumbnailCache.has(task.item.id)) continue;
    try {
      thumbnailStage ||= new DioramaStage(thumbnailHost);
      thumbnailGame?.dispose();
      const world = task.item.kind === 'world' ? task.item.id.slice(6) : task.item.encounter?.world || 'meadow';
      thumbnailGame = createGameSession({story:{id:'thumbnail',version:1},stage:thumbnailStage,onChange:()=>{}});
      thumbnailStage.setScene(world, [], {studio:true});
      thumbnailStage.setCameraDriftEnabled(false);
      thumbnailGame.bind({id:'thumbnail-scene',world},[]);
      const asset = task.item.kind === 'actor' || task.item.kind === 'prop' ? task.item.id : task.item.kind === 'encounter' ? (task.item.encounter.yellow ? task.item.encounter.id : `npc:${task.item.encounter.id}`) : null;
      if (asset) thumbnailGame.dispatch([{type:'entity.spawn',id:'thumbnail-model',asset,position:[0,1.5],scale:.72}]);
      thumbnailStage.resize();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const url = thumbnailStage.snapshot();
      thumbnailCache.set(task.item.id,url);
      if (task.image.isConnected) task.image.src=url;
    } catch {}
  }
  thumbnailBusy = false;
}
const thumbnailObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    thumbnailObserver.unobserve(entry.target);
    const item = MODULE_CATALOG.find(candidate => candidate.id === entry.target.dataset.thumbnail);
    if (item) void renderThumbnail(item, entry.target);
  }
},{root:$("module-list"),rootMargin:'160px'});
const resizeHandle = document.createElement('button');
resizeHandle.type = 'button';
resizeHandle.className = 'preview-resize-handle';
resizeHandle.hidden = true;
resizeHandle.setAttribute('aria-label', '调整预览高度');
resizeHandle.title = '拖动调整预览高度';
resizeHandle.innerHTML = '<span aria-hidden="true"></span>';
let resizing = false, resizeStartY = 0, resizeStartHeight = 420;
resizeHandle.addEventListener('pointerdown', event => {
  resizing = true; resizeStartY = event.clientY; resizeStartHeight = $("preview-stage").getBoundingClientRect().height;
  resizeHandle.setPointerCapture(event.pointerId); document.body.classList.add('preview-resizing'); event.preventDefault();
});
resizeHandle.addEventListener('pointermove', event => {
  if (!resizing) return;
  const height = Math.max(240, Math.min(window.innerHeight * .78, resizeStartHeight + event.clientY - resizeStartY));
  $("preview-stage").style.height = `${height}px`;
});
const stopResize = () => { resizing = false; document.body.classList.remove('preview-resizing'); };
resizeHandle.addEventListener('pointerup', stopResize); resizeHandle.addEventListener('pointercancel', stopResize);
$("preview-stage").after(resizeHandle);
renderChoices(
  $("filters"),
  [
    { id: "all", label: "全部", icon: icon(Library) },
    { id: "story", label: `故事脚本 ${counts.story}`, icon: icon(BookOpen) },
    ...Object.entries(MODULE_KINDS).filter(([id]) => id !== 'story').map(([id, label]) => ({
      id,
      label: `${label} ${counts[id]}`,
      icon: icon({actor:Users,prop:Box,logic:Settings2,ui:Sparkles,encounter:Route,audio:Volume2,world:Library}[id] || Sparkles),
    })),
  ],
  (choice) => {
    filter = choice.id;
    renderList();
  },
);
function renderList() {
  categories.hidden = filter !== "prop";
  for (const b of categories.children) b.setAttribute("aria-pressed", String(b.textContent === propCategory));
  const q = $("module-search").value.toLowerCase().trim();
  const found = [...MODULE_CATALOG].sort((a, b) => Number(b.kind === 'story') - Number(a.kind === 'story')).filter(
    (m) =>
      (filter === "all" || m.kind === filter) &&
      (filter !== "prop" || propCategory === "全部" || (PROP_CATEGORIES[m.id.slice(5)] || "场景道具") === propCategory) &&
      `${m.name} ${m.id} ${m.description}`.toLowerCase().includes(q),
  );
  $("module-list").replaceChildren(
    ...found.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "module-row";
      button.dataset.module = item.id;
      button.setAttribute("aria-current", String(selected?.id === item.id));
      const name = document.createElement("strong"),
        id = document.createElement("small");
      name.textContent = item.name;
      id.textContent = item.id;
      if (["actor","prop","world","encounter"].includes(item.kind)) {
        const image=document.createElement('img'); image.className='module-thumbnail'; image.alt=''; image.dataset.thumbnail=item.id;
        button.append(image); thumbnailObserver.observe(image);
      }
      const copy=document.createElement('span'); copy.className='module-row-copy'; copy.append(name,id); button.append(copy);
      button.onclick = () => select(item);
      return button;
    }),
  );
  if (!found.length) {
    const p = document.createElement("p");
    p.textContent = "没有找到，试试另一个名字。";
    $("module-list").append(p);
  }
  $("filters")
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.choice === filter)),
    );
}
$("module-search").oninput = () => {
  renderList();
};
$("sidebar-toggle").onclick = () => {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  $("sidebar-toggle").setAttribute("aria-expanded", String(!collapsed));
  $("sidebar-toggle").replaceChildren(icon(collapsed ? PanelLeftOpen : PanelLeftClose));
  $("sidebar-toggle").setAttribute("aria-label", collapsed ? "展开模块栏" : "收起模块栏");
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
  resizeHandle.hidden = false;
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
  if (!text || !game || $("natural-command-submit").disabled) return;
  const session = game, token = game.runtime.token;
  $("natural-command-submit").disabled = true;
  status.textContent = "大模型正在理解这句话……";
  const context = {
    world: game.runtime.context.world,
    entities: Object.fromEntries(Object.entries(game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}).map(([id, entity]) => [id, {asset:entity.asset, position:entity.position, scale:entity.scale}])),
    worlds: ["meadow", "pocket", "orchard", "bakery", "bridge", "home", "observatory", "reef", "cloud", "moon", "cove"],
  };
  try {
    const response = await fetch("/api/scene-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, context }) });
    const raw = await response.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const snippet = raw.replace(/\s+/g, " ").slice(0, 160);
      throw new Error(
        `场景接口返回了非 JSON（HTTP ${response.status}）：${snippet || "空响应"}`,
      );
    }
    if (!response.ok) throw new Error(result.error || "大模型暂时不可用");
    if (game !== session || game.runtime.token !== token) throw new Error('场景已经变化，请在当前场景重新提交。');
    const trace = ["[1] 收到用户原始文本", `    ${text}`, "[2] 当前场景", `    ${context.world}`, "[3] 关键词匹配", `    ${result.matches?.join("、") || "无（交给大模型理解）"}`, "[4] 意图解析", `    来源：${result.source || "model"}`, `    ${result.reply}`];
    if (result.substitution) trace.push('[近似替代]', `    原指令：${result.substitution.request}`, `    替代模型：${result.substitution.replacement} × ${result.substitution.count}`, `    匹配依据：${result.substitution.reason}`);
    if (result.sceneSwitch?.world && result.sceneSwitch.world !== game.runtime.context.world) {
      startWorld(result.sceneSwitch.world);
      trace.push("[5] 场景切换", `    ${result.sceneSwitch.world}`, "    状态：已完成淡出 / 淡入");
    }
    const layout = arrangeInView(result.commands, game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}, stage);
    const arranged = layout.commands;
    if (layout.reframed) trace.push('[镜头调整]', '    已自动拉远并重新取景，选择容纳新模型的正面地面。');
    if (layout.reduced) trace.push('[密度调整]', '    已适当缩小本批模型，采用紧凑排列。');
    trace.push('[5] 视野内散落', `    ${arranged.filter(c => c.type === 'entity.spawn').length} 个新模型，已检查镜头和地面遮挡；采用紧凑排列，密集时允许接触并播放碰撞反馈。`);
    const recycled = capacityEvictions(game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}, arranged).length;
    const applied = game.gateway.apply({ version: 1, context: game.runtime.token, commands: arranged }, "ai");
    if (applied.ok) trace.push('[物件容量]', `    当前 ${Object.keys(game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}).length} / 300 个；自动移除最早生成的 ${recycled} 个。`);
    trace.push("[6] 世界命令执行", `    ${applied.ok ? "成功" : applied.error}`);
    const spawnCount = arranged.filter(c => c.type === 'entity.spawn').length;
    const arrivalSeconds = stage.reduced ? 0 : 2 + Math.min(8, Math.max(0, spawnCount - 1) * .28);
    trace.push("[7] 渲染状态", `    ${applied.ok ? `${spawnCount} 个新模型依次入场，整批约 ${arrivalSeconds.toFixed(1)} 秒完成` : "未渲染"}`);
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
  } finally {
    $("natural-command-submit").disabled = false;
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
  if (item.kind === "story" || item.id === "ui:story-editor") { cleanup = mountStoryEditor($("preview-ui"), item.kind === "story" ? item.id.slice(6) : "wow"); return; }
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
  $("preview-stage").style.height = '';
  resizeHandle.hidden = true;
  $("preview-ui").hidden = true;
  $("preview-ui").replaceChildren();
  $("preview-controls").replaceChildren();
  $("command-panel").hidden = true;
  delete $("command-panel").dataset.mode;
  selected = item;
  history.replaceState(null, "", `#${encodeURIComponent(item.id)}`);
  const kindLabel = MODULE_KINDS[item.kind];
  $("module-kind").textContent = kindLabel || "";
  $("module-kind").hidden = !kindLabel;
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
    startWorld("meadow");
    commands([{type:"entity.spawn", id:"preview", asset:item.id, position:[0,1.5], scale:.78}]);
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
            { type: "entity.animate", id: "preview", animation: action },
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
    startWorld(item.encounter.world);
    commands([
      {
        type: "entity.spawn", position: [0,1.5], scale: .78,
        id: "preview",
        asset: item.encounter.yellow
          ? item.encounter.id
          : `npc:${item.encounter.id}`,
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
      MODULE_CATALOG.find((m) => m.id === "logic:intent"),
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
