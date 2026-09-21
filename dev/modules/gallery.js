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
import { UFO_PARTY_STORY } from "../content/examples/ufo-party.js";
import { PROP_CATEGORIES } from "../content/props.js";
import { createElement, PanelLeftClose, PanelLeftOpen, Search, Library, BookOpen, Box, Users, Sparkles, Volume2, Route, Settings2 } from "lucide";
import { arrangeInView } from "./scatter.js";
import { capacityEvictions } from "../runtime/contracts.js";
import { CAMERA_SHOTS, cameraShotById } from "../camera-shots.js";

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
const MODULE_KIND_ICONS = {actor:Users,prop:Box,logic:Settings2,ui:Sparkles,encounter:Route,audio:Volume2,world:Library,story:BookOpen};
function typeIcon(item, extraClass = "") {
  const badge = document.createElement("span");
  badge.className = `module-type-icon ${extraClass}`.trim();
  badge.title = MODULE_KINDS[item.kind] || item.kind;
  badge.append(icon(MODULE_KIND_ICONS[item.kind] || Sparkles));
  return badge;
}
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
      `${m.name} ${m.id} ${m.description} ${(m.keywords || []).join(" ")}`.toLowerCase().includes(q),
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
      button.append(typeIcon(item));
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
  if (!stage) stage = new DioramaStage($("preview-stage"), undefined, { drift: { yawAmplitude: .21, pitchAmplitude: .07, period: 30, quietSeconds: 1.5, fadeInSeconds: 2.2 } });
  game?.dispose();
  game = createGameSession({ story: script, stage, saved, onChange: () => {} });
  stage.setScene(world, cast, { studio: true });
  stage.setCameraDriftEnabled(false);
  // The AI scene-play mode keeps the handheld sway on by default.
  if (script === AI_CONTROL_LEVEL) stage.setCameraDriftEnabled(true);
  game.bind({ id: "showcase-scene", world }, cast);
  stage.worldPresenter.onPickEntity = lockEntity;
  stage.onFollowChange = renderLockBanner;
  stage.resize();
  requestAnimationFrame(() => {
    // 圆形缩放转场：先收圆（out 停留），再展开（in），形成故事书式的圆形过场。
    setTimeout(() => {
      viewport.classList.remove("scene-transition-out");
      viewport.classList.add("scene-transition-in");
      setTimeout(() => viewport.classList.remove("scene-transition-in"), 660);
    }, 430);
  });
}
function entityName(id) {
  const world = game?.runtime?.context?.world;
  const entity = world ? game.runtime.snapshot?.worlds?.[world]?.entities?.[id] : null;
  if (!entity) return id;
  const entry = MODULE_CATALOG.find((m) => m.id === entity.asset);
  return entry?.name || String(entity.asset || id).split(":").pop();
}
function lockEntity(id) {
  if (!stage) return;
  const name = entityName(id);
  stage.setFollowTarget(() => stage.worldPresenter?.getPosition(id), name);
}
let autoQueue = [];
let autoToken = 0;
let autoTrace = null, autoStatus = null;
function scheduleAutoNarrative(suggestions) {
  autoToken++;
  const token = autoToken;
  autoQueue = (suggestions || []).slice(0, 3);
  if (!autoQueue.length) return;
  autoTrace?.push('[后续剧本]', `    ${autoQueue.map(x => x.reason || x.kind).join('；')}`);
  if (autoTrace) controlLog(autoTrace);
  let delay = 4.2;
  for (const item of autoQueue) {
    const wait = delay;
    delay += 5.5 + Math.random() * 3;
    setTimeout(() => {
      if (token !== autoToken || !game || !stage) return;
      autoStage(item);
    }, wait * 1000);
  }
}
function autoStage(item) {
  if (!game || !stage) return;
  const world = game.runtime.context.world;
  const entities = game.runtime.snapshot?.worlds?.[world]?.entities || {};
  const list = Object.entries(entities);
  const npcs = list.filter(([, e]) => String(e.asset || "").startsWith("npc:"));
  const rides = list.filter(([, e]) => /spaceship|airplane|rocket|ufo|car/.test(String(e.asset || "")));
  const foods = list.filter(([, e]) => !String(e.asset || "").startsWith("npc:") && !rides.includes(e));
  let commands = [], note = "";
  const pick = (arr, n = 1) => arr.sort(() => Math.random() - 0.5).slice(0, n).map(([id]) => id);
  switch (item.kind) {
    case "auto-feed": {
      if (!npcs.length || !foods.length) return;
      const active = new Set((stage?.worldPresenter?.feedingStats?.jobs || []).map(j => j.id));
      const free = npcs.filter(([id]) => !active.has(id));
      if (!free.length) return;
      const [eater] = pick(free);
      // 一次给全部剩余食物，避免打断正在进行的连续进食
      commands = [{ type: "feeding.start", eaters: [eater], foods: foods.map(([id]) => id) }];
      note = `${item.reason || "角色自己去找东西吃"}`;
      break;
    }
    case "auto-ride": {
      if (!npcs.length || !rides.length) return;
      const [driver] = pick(npcs), [mount] = pick(rides);
      commands = [{ type: "group.ride", driver, mount }];
      note = `${item.reason || "骑上载具玩起来"}`;
      break;
    }
    case "auto-play": {
      if (!npcs.length) return;
      const [id] = pick(npcs);
      const action = ["run", "jump", "roll", "dance", "cheer"][Math.floor(Math.random() * 5)];
      commands = [{ type: "actor.perform", id, action, duration: 4 }];
      note = `${item.reason || "自己玩起来（${action}）"}`;
      break;
    }
    case "socialize": {
      if (npcs.length < 2) return;
      const [a, b] = pick(npcs, 2);
      const kind = ["group.hug", "group.handshake", "group.dance"][Math.floor(Math.random() * 3)];
      commands = [kind === "group.dance"
        ? { type: "group.dance", targets: npcs.map(([id]) => id).slice(0, 4) }
        : { type: kind, targets: [a, b] }];
      note = `${item.reason || "角色们聊起来"}`;
      break;
    }
    case "weather": {
      const preset = ["rain", "snow"][Math.floor(Math.random() * 2)];
      commands = [{ type: "weather.set", preset }];
      note = item.reason || (preset === "rain" ? "突然下起小雨" : "飘起了雪花");
      break;
    }
    case "fun": {
      const effect = ["firework", "confetti", "sparkle", "stars"][Math.floor(Math.random() * 4)];
      commands = [{ type: "fx.play", effect }];
      note = item.reason || "来点小惊喜";
      break;
    }
  }
  if (!commands.length) return;
  const applied = game.gateway.apply({ version: 1, context: game.runtime.token, commands }, "ai");
  autoTrace?.push('[自发剧情]', `    ${applied.ok ? note : `未上演：${applied.error}`}`);
  if (autoTrace) controlLog(autoTrace);
  if (applied.ok && autoStatus) autoStatus.textContent = `（自发）${note}`;
}
function clearLock() {
  stage?.clearFollowTarget();
  renderLockBanner(null);
}
function renderLockBanner(name) {
  const host = $("preview-stage");
  if (!host) return;
  let banner = $("follow-lock");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "follow-lock";
    banner.className = "follow-lock";
    banner.innerHTML =
      '<span class="lock-eye" aria-hidden="true">👁</span><span class="lock-name"></span><button type="button" class="lock-clear" aria-label="取消锁定" title="取消锁定">×</button>';
    banner.querySelector(".lock-clear").onclick = clearLock;
    host.appendChild(banner);
  }
  banner.hidden = !name;
  if (name) banner.querySelector(".lock-name").textContent = `已锁定：${name}`;
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
const SHOT_META = {
  ground:   { label: "平视", next: "俯视", icon: '<line x1="3" y1="13" x2="21" y2="13"/><circle cx="12" cy="9" r="3"/><path d="M12 4.6v1.4M8.8 6.3l1 1M15.2 6.3l-1 1"/>' },
  overhead: { label: "俯视", next: "环绕", icon: '<circle cx="12" cy="12" r="6.5"/><path d="M12 12l4.6-4.6M12 12l-4.6-4.6M12 12l4.6 4.6M12 12l-4.6 4.6"/>' },
  orbit:    { label: "环绕", next: "特写", icon: '<circle cx="12" cy="12" r="6.5"/><path d="M18.5 12a6.5 6.5 0 0 1-6.5 6.5"/><path d="M12 18.5v-4"/><path d="M12 12l3-3"/>' },
  closeup:  { label: "特写", next: "平视", icon: '<circle cx="11" cy="11" r="5"/><line x1="14.8" y1="14.8" x2="20" y2="20"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>' },
  "tps-far": { label: "背后远", next: "平视", icon: '<circle cx="9" cy="10" r="2.6"/><path d="M5 19c.6-4 2.1-6 4-6s3.4 2 4 6"/><path d="M18 12l4-4M18 12l-4-4M18 12l4 4M18 12l-4 4"/>' },
  "tps-mid": { label: "背后中", next: "平视", icon: '<circle cx="10" cy="9" r="2.8"/><path d="M6 18.5c.7-3.4 2-5 4-5s3.3 1.6 4 5"/><path d="M18 12l3-3M18 12l-3-3M18 12l3 3M18 12l-3 3"/>' },
  "tps-near": { label: "背后近", next: "平视", icon: '<circle cx="12" cy="8" r="3.4"/><path d="M7.5 18c.8-3.6 2.3-5.4 4.5-5.4s3.7 1.8 4.5 5.4"/><path d="M18 12l2-2M18 12l-2-2M18 12l2 2M18 12l-2 2"/>' },
  fps:      { label: "第一人称", next: "平视", icon: '<path d="M3 12h4M17 12h4"/><circle cx="12" cy="12" r="2.6"/><path d="M12 5.6V3M12 21v-2.6"/>' },
};
function shotMeta(mode) {
  return SHOT_META[mode] || SHOT_META.ground;
}
function renderCameraPicker() {
  const picker = $("camera-shot-select");
  if (!picker) return;
  const groups = new Map();
  for (const shot of CAMERA_SHOTS) {
    if (!groups.has(shot.group)) groups.set(shot.group, []);
    groups.get(shot.group).push(shot);
  }
  picker.innerHTML = "";
  for (const [group, shots] of groups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group;
    for (const shot of shots) {
      const option = document.createElement("option");
      option.value = shot.id;
      option.textContent = shot.label;
      optgroup.append(option);
    }
    picker.append(optgroup);
  }
}
function syncCameraNav() {
  const nav = $("camera-nav");
  if (!nav) return;
  nav.hidden = !stage;
  if (!stage) return;
  const picker = $("camera-shot-select");
  if (picker) {
    const mode = stage.cameraAngleMode?.() || "ground";
    const option = picker.querySelector(`option[value="${CSS.escape(mode)}"]`);
    if (option) picker.value = mode;
  }
}

const BEHAVIOR_EVENTS = [
  {
    title: "对象互动",
    rows: [
      ["吃", "猪小弟吃现金"],
      ["追", "叫叫追猪小弟"],
      ["抱", "铃铛抱小熊"],
      ["握手", "叫叫和猪小弟握握手"],
      ["牵手", "大家手拉手排成一队走"],
      ["叠罗汉", "叫叫和猪小弟叠罗汉"],
      ["一起跳舞", "大家一起来跳舞"],
      ["骑乘", "叫叫骑火箭"],
      ["聚拢", "让所有角色集合"],
      ["包围", "围住猪小弟"],
    ],
  },
  {
    title: "单人表演",
    rows: [
      ["跑", "猪小弟跑起来"],
      ["跳", "叫叫跳起来"],
      ["睡觉", "小猪睡觉"],
      ["打滚", "小狗打滚"],
      ["欢呼", "大家欢呼"],
      ["挥手", "让铃铛招手"],
    ],
  },
  {
    title: "世界与镜头",
    rows: [
      ["换场景", "去果园看看"],
      ["天气", "下雪"],
      ["特效", "放烟花"],
      ["运镜", "把镜头拉近"],
    ],
  },
  {
    title: "物件操作",
    rows: [
      ["生成", "变出来3个好奇火箭"],
      ["变色", "把火箭变成蓝色"],
      ["机关", "启动风车"],
      ["移动", "让叫叫走过去"],
      ["移除", "把气球收走"],
    ],
  },
];
function renderBehaviorEvents() {
  const host = $("behavior-groups");
  if (!host) return;
  host.replaceChildren(
    ...BEHAVIOR_EVENTS.map((group) => {
      const wrap = document.createElement("section");
      wrap.className = "behavior-group";
      const title = document.createElement("h4");
      title.textContent = group.title;
      wrap.append(title);
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      thead.innerHTML = "<tr><th>事件</th><th>试试这样说</th></tr>";
      table.append(thead);
      const tbody = document.createElement("tbody");
      for (const [name, example] of group.rows) {
        const tr = document.createElement("tr");
        const nameCell = document.createElement("td");
        nameCell.textContent = name;
        const exampleCell = document.createElement("td");
        exampleCell.textContent = example;
        exampleCell.tabIndex = 0;
        exampleCell.title = "点一下填进输入框";
        const fill = () => {
          const input = $("natural-command-input");
          if (!input) return;
          input.value = example;
          input.focus();
        };
        exampleCell.onclick = fill;
        exampleCell.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fill();
          }
        };
        tr.append(nameCell, exampleCell);
        tbody.append(tr);
      }
      table.append(tbody);
      wrap.append(table);
      return wrap;
    }),
  );
}
function aiControlDemo() {
  startWorld(AI_CONTROL_LEVEL.world);
  enableNaturalControl();
  $("preview-ui").hidden = true;
  $("runtime-report").textContent = "等待输入……\n当前场景：meadow\n渲染状态：已就绪";
}
let storyPlayToken = 0;
async function playStoryDemo(story) {
  const my = ++storyPlayToken;
  const status = $("natural-command-status");
  const report = $("runtime-report");
  const submit = $("natural-command-submit");
  startWorld(story.world, [], null, story);
  enableNaturalControl();
  $("preview-ui").hidden = true;
  submit.disabled = true;
  report.textContent = `沙盒故事：${story.title}\n渲染状态：已就绪`;
  for (const [i, step] of story.steps.entries()) {
    if (my !== storyPlayToken) return; // 重复点击/切换模块时，旧播放立即退出。
    if (step.world && step.world !== game.runtime.context.world) {
      // 圆形缩放转场 + 随行搬运原星球全部道具与角色。
      const carry = Object.entries(game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}).map(([id, e]) => ({
        type: "entity.spawn", id, asset: e.asset, name: e.name || "", position: e.position, color: e.color, scale: e.scale, sizeLocked: e.sizeLocked === true, colorOverride: e.colorOverride === true,
      }));
      startWorld(step.world, [], null, story);
      if (carry.length) game.gateway.apply({ version: 1, context: game.runtime.token, commands: carry }, "script");
      report.textContent += `\n[场景切换] 前往${step.world}，随行带上 ${carry.length} 个道具和角色`;
    }
    $("natural-command-input").value = step.say;
    status.textContent = `第 ${i + 1} 幕 / ${story.steps.length}：${step.say}`;
    report.textContent += `\n[第 ${i + 1} 幕] ${step.say}`;
    if (step.commands.length) {
      const applied = game.gateway.apply({ version: 1, context: game.runtime.token, commands: step.commands }, "script");
      report.textContent += applied.ok ? "（已演出）" : `（失败：${applied.error}）`;
    }
    await new Promise((resolve) => setTimeout(resolve, (step.wait || 4) * 1000));
  }
  if (my !== storyPlayToken) return;
  status.textContent = "故事讲完啦！";
  report.textContent += "\n—— 完 ——";
  submit.disabled = false;
}
function enableNaturalControl() {
  $("command-panel").dataset.mode = "natural";
  $("command-panel").hidden = false;
  $("natural-command-input").value = "";
  $("natural-command-status").textContent = "";
  controlRecords = [];
  activeControlRecord = -1;
  renderControlTabs();
  stage.onCameraHistoryChange = syncCameraNav;
  stage.setNearestSubjectProvider(() => {
    const world = game?.runtime?.context?.world;
    const ents = world ? game.runtime.snapshot?.worlds?.[world]?.entities || {} : {};
    let best = null, bestId = null, bestD = Infinity;
    for (const [id, e] of Object.entries(ents)) {
      if (e.dead) continue;
      const p = e.position || [0, 0];
      const d = p[0] * p[0] + p[1] * p[1];
      if (d < bestD) { bestD = d; best = p; bestId = id; }
    }
    const h = bestId ? stage.worldPresenter?.getHeight(bestId) || 0 : 0;
    return best ? [best[0], best[1], h] : null;
  });
  renderCameraPicker();
  const picker = $("camera-shot-select");
  if (picker) {
    picker.onchange = () => {
      const shot = cameraShotById(picker.value);
      if (shot) { stage.applyCameraShot(shot); syncCameraNav(); }
    };
  }
  stage.saveCameraState();
  syncCameraNav();
  renderBehaviorEvents();
  $("behavior-events").hidden = false;
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

// ---- 一句话控制的语音输入：豆包 ASR ----
function encodeWorkshopPcm(chunks, sourceRate) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const joined = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
  const ratio = sourceRate / 16000;
  const pcm = new Int16Array(Math.floor(joined.length / ratio));
  for (let index = 0; index < pcm.length; index++) {
    const sample = Math.max(-1, Math.min(1, joined[Math.floor(index * ratio)] || 0));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(pcm.buffer);
}
async function startWorkshopMic() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(1024, 1, 1);
  const silent = context.createGain();
  let chunks = [], buffered = 0, paused = true;
  let levelListener = () => {};
  const maxBuffered = context.sampleRate * 45;
  silent.gain.value = 0;
  processor.onaudioprocess = event => {
    const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
    if (paused) return;
    let sum = 0;
    for (let index = 0; index < chunk.length; index += 8) sum += chunk[index] * chunk[index];
    const rms = Math.sqrt(sum / Math.max(1, Math.ceil(chunk.length / 8)));
    levelListener(Math.max(0, Math.min(1, Math.pow((rms - .004) / .06, .72))));
    chunks.push(chunk);
    buffered += chunk.length;
    while (buffered > maxBuffered && chunks.length > 1) buffered -= chunks.shift().length;
  };
  source.connect(processor);
  processor.connect(silent);
  silent.connect(context.destination);
  stream.getAudioTracks().forEach(track => { track.enabled = false; });
  return {
    resume() { chunks = []; buffered = 0; paused = false; stream.getAudioTracks().forEach(track => { track.enabled = true; }); },
    pause() { paused = true; levelListener(0); stream.getAudioTracks().forEach(track => { track.enabled = false; }); },
    take() {
      paused = true; levelListener(0);
      const captured = chunks; chunks = []; buffered = 0;
      return encodeWorkshopPcm(captured, context.sampleRate);
    },
    async close() {
      paused = true; processor.onaudioprocess = null;
      try { source.disconnect(); processor.disconnect(); silent.disconnect(); } catch { /* already closed */ }
      stream.getTracks().forEach(track => track.stop());
      await context.close().catch(() => {});
    },
    setLevelListener(listener) { levelListener = typeof listener === "function" ? listener : () => {}; },
  };
}
let micCapture = null, micTimer = null, micGeneration = 0;
async function workshopAsr(pcm) {
  let binary = "";
  for (let offset = 0; offset < pcm.length; offset += 32768) {
    binary += String.fromCharCode(...pcm.subarray(offset, offset + 32768));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16000);
  try {
    const response = await fetch("/api/asr", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pcm: btoa(binary) }), signal: controller.signal,
    });
    if (!response.ok) throw new Error("asr unavailable");
    const data = await response.json();
    return String(data.transcript || "").trim().slice(0, 180);
  } finally { clearTimeout(timer); }
}
function stopWorkshopMic() {
  micGeneration++;
  clearTimeout(micTimer);
  const capture = micCapture; micCapture = null;
  if (capture) capture.close();
}
async function finishWorkshopVoice() {
  const generation = ++micGeneration;
  clearTimeout(micTimer);
  const capture = micCapture; micCapture = null;
  if (!capture) return;
  capture.pause();
  voiceInput.setState("transcribing");
  try {
    const pcm = capture.take();
    if (pcm.length < 1600) throw new Error("short");
    const text = await workshopAsr(pcm);
    if (generation !== micGeneration) return;
    voiceInput.reset("setup");
    if (text) {
      $("natural-command-input").value = text;
      naturalControl();
    } else {
      voiceInput.setState("error", { message: "这次没听清，可以再说一次，也可以打字。" });
    }
  } catch {
    if (generation !== micGeneration) return;
    voiceInput.setState("error", { message: "这次没听清，可以再说一次，也可以打字。" });
  }
}
async function startWorkshopVoice() {
  if (!navigator.mediaDevices?.getUserMedia) {
    voiceInput.setState("error", { message: "这个浏览器不能打开麦克风，可以用文字输入。" });
    return;
  }
  const generation = ++micGeneration;
  voiceInput.setState("requesting");
  try {
    const capture = await startWorkshopMic();
    if (generation !== micGeneration) { capture.close(); return; }
    micCapture = capture;
    capture.setLevelListener(level => voiceInput.setLevel(level));
    capture.resume();
    voiceInput.setState("listening");
    micTimer = setTimeout(finishWorkshopVoice, 25000);
  } catch {
    if (generation !== micGeneration) return;
    micCapture = null;
    voiceInput.setState("error", { message: "麦克风没有打开。可以检查浏览器权限再试，也可以用文字输入。" });
  }
}
const voiceInput = createVoiceInput({ button: $("natural-command-mic") });
$("natural-command-mic").addEventListener("click", async () => {
  const state = voiceInput.getState().state;
  if (["listening", "receiving", "recording", "quiet", "short", "empty"].includes(state)) {
    await finishWorkshopVoice();
  } else if (state === "transcribing" || state === "thinking" || micCapture) {
    return;
  } else {
    await startWorkshopVoice();
  }
});
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
    autoTrace = trace; autoStatus = status;
    if (result.substitution) trace.push('[近似替代]', `    原指令：${result.substitution.request}`, `    替代模型：${result.substitution.replacement} × ${result.substitution.count}`, `    匹配依据：${result.substitution.reason}`);
    if (result.sceneSwitch?.world && result.sceneSwitch.world !== game.runtime.context.world) {
      clearLock();
      // 星球切换带走原星球所有道具与角色（圆形缩放转场期间搬运）。
      const carry = Object.entries(game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}).map(([id, e]) => ({
        type: "entity.spawn", id, asset: e.asset, name: e.name || "", position: e.position, color: e.color, scale: e.scale, sizeLocked: e.sizeLocked === true, colorOverride: e.colorOverride === true,
      }));
      startWorld(result.sceneSwitch.world);
      if (carry.length) {
        const carryResult = game.gateway.apply({ version: 1, context: game.runtime.token, commands: carry }, "script");
        if (!carryResult.ok) trace.push("[随行搬运]", `    失败：${carryResult.error}`);
      }
      trace.push("[5] 场景切换", `    ${result.sceneSwitch.world}`, `    随行带上原星球 ${carry.length} 个道具和角色（圆形缩放转场）`);
    }
    stage.saveCameraState();
    const layout = arrangeInView(result.commands, game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}, stage);
    const arranged = layout.commands;
    if (layout.reframed) {
      syncCameraNav();
      trace.push('[镜头调整]', '    已渐进拉远取景（保留了当前视角方向），新模型尽量留在原镜头内。');
    }
    if (layout.reduced) trace.push('[密度调整]', '    已适当缩小本批模型，采用紧凑排列。');
    trace.push('[5] 视野内散落', `    ${arranged.filter(c => c.type === 'entity.spawn').length} 个新模型，已检查镜头和地面遮挡；采用紧凑排列，密集时允许接触并播放碰撞反馈。`);
    const recycled = capacityEvictions(game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}, arranged).length;
    autoToken++; autoQueue = [];
    const applied = game.gateway.apply({ version: 1, context: game.runtime.token, commands: arranged }, "ai");
    if(applied.warnings?.length) trace.push('[执行提醒]',...applied.warnings);
    if (applied.ok) trace.push('[物件容量]', `    当前 ${Object.keys(game.runtime.snapshot.worlds[game.runtime.context.world]?.entities || {}).length} / 300 个；自动移除最早生成的 ${recycled} 个。`);
    if(arranged.some(c=>c.type==='feeding.start')) trace.push('[进食计划]','    先生成各组对象；吃者走向食物、播放吃动画，食物随后消失（A 吃 B 开放表演）。');
    if(arranged.some(c=>c.type==='group.patrol')) trace.push('[巡逻]','    角色沿直线来回走动，带一点小动作。');
    if(arranged.some(c=>c.type==='group.gather')) trace.push('[聚拢]','    角色/物件集合到一起。');
    if(arranged.some(c=>c.type==='group.surround')) trace.push('[包围]','    包围者围成一圈，被围者先聚拢到中间。');
    if(result.camera) {
      const shot = [result.camera.kind, result.camera.move].filter(Boolean).join(' / ');
      stage.playCinematic(result.camera);
      trace.push('[运镜]', `    系统调用「${shot}」镜头（切换带过渡）。`);
    }
    trace.push("[6] 世界命令执行", `    ${applied.ok ? "成功" : applied.error}`);
    const newActors = arranged.filter(c => c.type === 'entity.spawn' && String(c.asset || "").startsWith("npc:"));
    if (applied.ok && newActors.length && !arranged.some(c => c.type === 'feeding.start')) {
      stage.worldPresenter?.movement?.defaultRoam(newActors.map(c => c.id));
      trace.push('[游走]', `    ${newActors.length} 个角色站一会儿后自动走动（来回/绕圈/乱走）。`);
    }
    const spawnCount = arranged.filter(c => c.type === 'entity.spawn').length;
    const arrivalSeconds = stage.reduced ? 0 : 2 + Math.min(8, Math.max(0, spawnCount - 1) * .28);
    trace.push("[7] 渲染状态", `    ${applied.ok ? `${spawnCount} 个新模型依次入场，整批约 ${arrivalSeconds.toFixed(1)} 秒完成` : "未渲染"}`);
    controlRecords.push({ text, lines: trace });
    activeControlRecord = controlRecords.length - 1;
    renderControlTabs();
    controlLog(trace);
    status.textContent = applied.ok ? `${result.reply} 已执行。` : `已解析，但执行失败：${applied.error}`;
    if (applied.ok && result.suggestions?.length) scheduleAutoNarrative(result.suggestions);
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
  if (item.id === "story:ufo-party") { playStoryDemo(UFO_PARTY_STORY); return; }
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
  stopWorkshopMic();
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
  $("camera-nav") && ($("camera-nav").hidden = true);
  $("preview-ui").hidden = true;
  $("preview-ui").replaceChildren();
  $("preview-controls").replaceChildren();
  $("command-panel").hidden = true;
  delete $("command-panel").dataset.mode;
  $("behavior-events").hidden = true;
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
    enableNaturalControl();
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
    enableNaturalControl();
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
    enableNaturalControl();
    button("环境回应", () =>
      commands([{ type: "world.react", action: "celebrate" }]),
    );
  } else if (item.kind === "audio") {
    $("audio-preview").src = item.url;
    $("audio-preview").hidden = false;
    report("点击播放器试听；切换模块会停止当前声音。");
  } else if (item.kind === "encounter") {
    startWorld(item.encounter.world);
    enableNaturalControl();
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
  stopWorkshopMic();
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
      feeding: stage?.worldPresenter?.feedingStats,
    };
  },
};
