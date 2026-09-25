import { installUISFX, playUISFX, startUISFXLoop } from './ui-sfx.js?v=20260831-always-on';

installUISFX();

const $ = id => document.getElementById(id);
const PAGE_LABELS = { choose: '故事与角色主页', story: '已下线故事', echo: '旧回声故事', doudou: '送豆豆回家', moon: '登月计划', debug: '角色模拟器', words: '开口造世界' };
const CHAPTER_LABELS = { monster: '机器人朋友', ocean: '海底朋友', camp: '森林露营', snow: '冰雪乐园', words: '开口造世界', choose: '入口与选择' };
const EVENT_LABELS = {
  choose_mode_story: '选择雾灯花园',
  choose_mode_echo: '选择不见了的回声',
  choose_mode_doudou: '选择送豆豆回家',
  choose_mode_moon: '选择登月计划',
  choose_mode_debug: '选择角色模拟器',
  echo_start: '开始不见了的回声',
  echo_interview_answer: '回答图鉴员问题',
  echo_pet_wake: '让专属小伙伴开口',
  echo_scene_choice: '推进回声故事场景',
  echo_complete: '完成不见了的回声',
  doudou_voice_enabled: '送豆豆回家开启语音',
  doudou_start: '开始送豆豆回家',
  doudou_interview_answer: '回答伙伴塑形问题',
  doudou_listen_continue: '继续听伙伴塑形回答',
  doudou_scene_choice: '推进豆豆回家场景',
  doudou_complete: '完成送豆豆回家',
  moon_voice_enabled: '登月计划开启语音',
  moon_start: '开始登月计划',
  moon_invention: '生成登月发明',
  moon_complete: '完成登月计划',
  chapter_start: '进入英语章节',
  chapter_complete: '完成英语章节',
  voice_answer: '完成一次朗读作答',
  story_start: '开始第一张图鉴',
  story_world_enter: '进入雾灯花园',
  story_seed_1: '找到第 1 颗萤火种',
  story_seed_2: '找到第 2 颗萤火种',
  story_seed_3: '集齐 3 颗萤火种',
  story_gate_reached: '到达雾门',
  story_gate_ability: '使用角色能力',
  story_complete: '完成第一张图鉴',
  profile_complete: '完成兴趣画像',
  lab_character_tap: '点击角色互动',
  lab_random_character: '随机换一只角色',
  lab_script_answer: '回答连续剧情问题',
  lab_script_replay: '重新体验连续剧情',
  lab_script_exit: '退出连续剧情',
};
const PROFILE_FIELD_LABELS = {
  age_band: '年龄阶段', learning: '看听偏好', attention: '专注节奏', explore: '探索方式', challenge: '受挫习惯', pace: '推进节奏',
  expression: '表达方式', social: '相处偏好', role: '角色身份', theme: '故事主题', play_style: '玩法兴趣', story_tone: '故事感觉',
  tone: '说话语气', emotion: '情绪支持', encouragement: '鼓励方式', sensitivities: '需要避开的体验', interest: '最近着迷',
};
const LAB_TAB_LABELS = { interview: '成长问答', templates: '角色模板', face: '捏脸', body: '身体', actions: '动作', scene: '场景', voice: '声音', dialogue: '对话' };
const DEPTH_LABELS = ['进入页面', '第一次选择', '继续探索', '完成关键选择', '进入连续互动', '到达核心玩法', '深入体验', '推进任务', '接近完成', '到达结尾', '完成体验'];

let code = '';
let activeRange = '7d';
let activeGranularity = 'day';
let loading = false;

function paintGrain() {
  const canvas = $('data-grain');
  const context = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const count = Math.round(innerWidth * innerHeight / 920);
  for (let index = 0; index < count; index += 1) {
    const shade = 82 + Math.random() * 34;
    context.fillStyle = `rgba(${shade},${shade * .88},${shade * .69},${.06 + Math.random() * .09})`;
    const size = (.45 + Math.random() * .7) * dpr;
    context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, size, size);
  }
}

function renderCode() {
  [...$('code-display').children].forEach((slot, index) => slot.classList.toggle('filled', index < code.length));
  $('code-input').value = code;
}

function resetCode(message = '') {
  code = '';
  renderCode();
  $('code-error').textContent = message;
  if (message) {
    const display = $('code-display');
    display.classList.remove('is-error');
    requestAnimationFrame(() => display.classList.add('is-error'));
  }
}

async function submitCode() {
  if (code.length !== 6 || loading) return;
  loading = true;
  $('code-error').textContent = '正在核对口令';
  await new Promise(resolve => setTimeout(resolve, 80));
  try {
    const response = await fetch('/api/data/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'same-origin',
    });
    if (response.status === 429) {
      resetCode('尝试次数较多，请十分钟后再试');
      void playUISFX('warning');
      return;
    }
    if (!response.ok) {
      resetCode('口令不正确');
      void playUISFX('error');
      return;
    }
    showDashboard();
    void playUISFX('unlock');
  } catch {
    resetCode('网络暂时不可用，请稍后再试');
    void playUISFX('error');
  } finally {
    loading = false;
  }
}

function pushDigit(digit) {
  if (loading || code.length >= 6) return;
  code += digit;
  $('code-error').textContent = '';
  renderCode();
  if (code.length === 6) window.setTimeout(submitCode, 80);
}

function number(value) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(Number(value) || 0));
}

function percent(value) {
  return value == null || value === '' ? '—' : `${Math.round(Number(value) * 100)}%`;
}

function chapterLabel(value) {
  return CHAPTER_LABELS[value] || String(value || '未分章');
}

function duration(milliseconds) {
  const seconds = Math.round((Number(milliseconds) || 0) / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}分${rest}秒` : `${minutes}分钟`;
}

function eventLabel(name) {
  if (EVENT_LABELS[name]) return EVENT_LABELS[name];
  if (name.startsWith('profile_answer_')) {
    const field = name.replace('profile_answer_', '');
    return `回答画像问题：${PROFILE_FIELD_LABELS[field] || field}`;
  }
  if (name.startsWith('lab_tab_')) {
    const tab = name.replace('lab_tab_', '');
    return `打开实验室栏目：${LAB_TAB_LABELS[tab] || tab}`;
  }
  if (name.startsWith('lab_scene_')) return `选择场景：${name.replace('lab_scene_', '')}`;
  if (name.startsWith('lab_template_')) return `套用角色模板：${name.replace('lab_template_', '')}`;
  if (name.startsWith('lab_script_')) return `剧情互动：${name.replace('lab_script_', '')}`;
  return name.replaceAll('_', ' ');
}

function renderPages(rows) {
  const body = $('page-rows');
  body.innerHTML = '';
  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty-state';
    cell.textContent = '这个时间段还没有访问数据';
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }
  for (const item of rows) {
    const row = document.createElement('tr');
    const values = [PAGE_LABELS[item.page] || item.page, number(item.uv), number(item.pv), duration(item.avg_active_ms), Number(item.avg_depth || 0).toFixed(1)];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
}

function renderDepth(rows) {
  const root = $('depth-funnel');
  root.innerHTML = '';
  const total = rows.reduce((sum, item) => sum + Number(item.views || 0), 0);
  if (!total) {
    root.innerHTML = '<p class="empty-state">有访问后，这里会显示到达层级</p>';
    return;
  }
  const maxDepth = Math.max(1, ...rows.map(item => Number(item.max_depth || 0)));
  const levels = [...new Set([0, 1, 2, 4, 6, 8, Math.min(10, maxDepth)].filter(value => value <= maxDepth))].sort((a, b) => a - b);
  for (const level of levels) {
    const reached = rows.filter(item => Number(item.max_depth) >= level).reduce((sum, item) => sum + Number(item.views || 0), 0);
    const percent = Math.round(reached / total * 100);
    const row = document.createElement('div');
    row.className = 'funnel-row';
    const label = document.createElement('span');
    label.textContent = DEPTH_LABELS[Math.min(level, DEPTH_LABELS.length - 1)];
    const track = document.createElement('div');
    track.className = 'funnel-track';
    const fill = document.createElement('div');
    fill.className = 'funnel-fill';
    fill.style.width = `${percent}%`;
    track.appendChild(fill);
    const value = document.createElement('strong');
    value.textContent = `${percent}%`;
    row.append(label, track, value);
    root.appendChild(row);
  }
}

function renderEvents(rows) {
  const root = $('event-list');
  root.innerHTML = '';
  if (!rows.length) {
    root.innerHTML = '<p class="empty-state">还没有产生主要交互</p>';
    return;
  }
  for (const item of rows.slice(0, 12)) {
    const row = document.createElement('div');
    row.className = 'event-row';
    const copy = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = eventLabel(item.event_name);
    const detail = document.createElement('span');
    detail.textContent = `${PAGE_LABELS[item.page] || item.page} · ${number(item.uv)} 位访客`;
    copy.append(title, detail);
    const count = document.createElement('strong');
    count.textContent = number(item.count);
    row.append(copy, count);
    root.appendChild(row);
  }
}

function renderDaily(rows) {
  const root = $('daily-chart');
  root.innerHTML = '';
  const ordered = [...rows].reverse();
  if (!ordered.length) {
    root.innerHTML = '<p class="empty-state">有访问后，这里会出现每日趋势</p>';
    return;
  }
  const max = Math.max(1, ...ordered.flatMap(item => [Number(item.pv), Number(item.uv)]));
  for (const item of ordered) {
    const column = document.createElement('div');
    column.className = 'day-column';
    const bars = document.createElement('div');
    bars.className = 'day-bars';
    const uv = document.createElement('span');
    uv.className = 'day-bar';
    uv.style.height = `${Math.max(2, Number(item.uv) / max * 100)}%`;
    uv.title = `UV ${item.uv}`;
    const pv = document.createElement('span');
    pv.className = 'day-bar pv';
    pv.style.height = `${Math.max(2, Number(item.pv) / max * 100)}%`;
    pv.title = `PV ${item.pv}`;
    bars.append(uv, pv);
    const value = document.createElement('b');
    value.textContent = `${item.uv}/${item.pv}`;
    const date = document.createElement('small');
    date.textContent = String(item.day || item.period || '').slice(5);
    column.append(bars, value, date);
    root.appendChild(column);
  }
}

function renderSources(rows) {
  const root = $('source-list');
  root.innerHTML = '';
  if (!rows.length) { root.innerHTML = '<p class="empty-state">还没有来源数据</p>'; return; }
  for (const item of rows) {
    const row = document.createElement('div'); row.className = 'source-row';
    const copy = document.createElement('div');
    const title = document.createElement('b'); title.textContent = item.source === 'direct' ? '直接访问' : item.source;
    const detail = document.createElement('span'); detail.textContent = `${number(item.uv)} 位用户 · ${number(item.sessions)} 个会话`;
    copy.append(title, detail);
    const value = document.createElement('strong'); value.textContent = `${number(item.pv)} PV`;
    row.append(copy, value); root.appendChild(row);
  }
}

function renderChapters(rows) {
  const body = $('chapter-rows'); body.innerHTML = '';
  if (!rows.length) { body.innerHTML = '<tr><td colspan="8" class="empty-state">进入章节后，这里会显示章节表现</td></tr>'; return; }
  for (const item of rows) {
    const row = document.createElement('tr');
    [chapterLabel(item.chapter), number(item.uv), number(item.views), Number(item.avg_depth || 0).toFixed(1), number(item.completes), percent(item.d1_rate), percent(item.d7_rate), item.voice_attempts ? percent(item.voice_correct_rate) : '—'].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
    body.appendChild(row);
  }
}

function renderRetention(retention) {
  const root = $('retention-list'); root.innerHTML = '';
  const overall = retention?.overall || {};
  const cards = [['次日留存', percent(overall.d1Rate), overall.d1Total ? `${number(overall.d1Users)} / ${number(overall.d1Total)} 个成熟用户` : '数据成熟后计算'], ['第 7 日留存', percent(overall.d7Rate), overall.d7Total ? `${number(overall.d7Users)} / ${number(overall.d7Total)} 个成熟用户` : '需要至少 7 天历史'], ['最近一批 cohort', overall.cohorts?.[0]?.day || '—', overall.cohorts?.[0] ? `${number(overall.cohorts[0].users)} 位新用户` : '暂无']];
  for (const [label, value, note] of cards) { const item = document.createElement('div'); item.className = 'retention-card'; const title = document.createElement('span'); title.textContent = label; const strong = document.createElement('strong'); strong.textContent = value; const small = document.createElement('small'); small.textContent = note; item.append(title, strong, small); root.appendChild(item); }
}

function renderUsers(rows) {
  const body = $('user-rows'); body.innerHTML = '';
  if (!rows.length) { body.innerHTML = '<tr><td colspan="8" class="empty-state">还没有可展示的用户行为</td></tr>'; return; }
  for (const item of rows) {
    const row = document.createElement('tr');
    const shortId = String(item.identity || '').replace(/^visitor:/, '访客·').slice(0, 18);
    const seen = item.last_seen_at ? new Date(Number(item.last_seen_at)).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    [shortId, seen, number(item.views), number(item.chapters), Number(item.avg_depth || 0).toFixed(1), number(item.voice_attempts), item.voice_attempts ? percent(item.voice_correct / item.voice_attempts) : '—', duration(item.active_ms)].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
    body.appendChild(row);
  }
}

function renderVoice(data) {
  const voice = data || {};
  const hasAttempts = Number(voice.attempts || 0) > 0;
  $('voice-attempts').textContent = number(voice.attempts);
  $('voice-asr').textContent = hasAttempts ? percent(voice.asr_rate) : '—';
  $('voice-correct').textContent = hasAttempts ? percent(voice.correct_rate) : '—';
  $('voice-coverage').textContent = hasAttempts ? percent(voice.avg_coverage) : '—';
  $('voice-duration').textContent = hasAttempts ? duration(voice.avg_duration_ms) : '—';
}

function renderDashboard(data) {
  const totals = data.totals || {};
  $('metric-uv').textContent = number(totals.uv);
  $('metric-users').textContent = number(totals.users || totals.uv);
  $('metric-pv').textContent = number(totals.pv);
  $('metric-dwell').textContent = duration(totals.avg_active_ms);
  $('metric-depth').textContent = Number(totals.avg_depth || 0).toFixed(1);
  $('metric-interactions').textContent = `${number(totals.interactions)} 次有效交互`;
  $('metric-retention').textContent = percent(data.retention?.d1Rate);
  $('metric-voice').textContent = percent(data.voice?.correct_rate);
  $('generated-at').textContent = `更新于 ${new Date(data.generatedAt).toLocaleString('zh-CN', { hour12: false })}`;
  $('privacy-note').textContent = data.privacy || '';
  renderPages(data.pages || []);
  renderDepth(data.depth || []);
  renderEvents(data.events || []);
  renderDaily(data[activeGranularity === 'week' ? 'weekly' : activeGranularity === 'month' ? 'monthly' : 'daily'] || []);
  renderSources(data.sources || []);
  renderChapters(data.chapters || []);
  renderRetention(data.retention ? { overall: data.retention } : null);
  renderUsers(data.users || []);
  renderVoice(data.voice || {});
}

async function loadDashboard() {
  if (loading) return;
  loading = true;
  $('dashboard-error').hidden = true;
  $('dashboard-content').setAttribute('aria-busy', 'true');
  const loadingCue = startUISFXLoop('loading', { volume: 0.04 });
  try {
    const response = await fetch(`/api/data/summary?range=${activeRange}`, { credentials: 'same-origin' });
    if (response.status === 401) {
      showGate();
      return;
    }
    if (!response.ok) throw new Error('summary_unavailable');
    renderDashboard(await response.json());
    void playUISFX('success', { volume: 0.13 });
  } catch {
    $('dashboard-error').hidden = false;
    void playUISFX('error');
  } finally {
    (await loadingCue)?.stop();
    $('dashboard-content').removeAttribute('aria-busy');
    loading = false;
  }
}

function showDashboard() {
  $('data-gate').hidden = true;
  $('dashboard').hidden = false;
  window.setTimeout(loadDashboard, 0);
}

function showGate() {
  $('dashboard').hidden = true;
  $('data-gate').hidden = false;
  resetCode();
  requestAnimationFrame(() => $('code-input').focus());
}

$('code-form').addEventListener('submit', event => { event.preventDefault(); submitCode(); });
$('code-input').addEventListener('input', event => {
  code = event.target.value.replace(/\D/g, '').slice(0, 6);
  renderCode();
  if (code.length === 6) window.setTimeout(submitCode, 80);
});
$('code-form').addEventListener('click', event => {
  const key = event.target.closest('[data-key]')?.dataset.key;
  if (key) pushDigit(key);
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'clear') resetCode();
  if (action === 'backspace') { code = code.slice(0, -1); renderCode(); $('code-error').textContent = ''; }
  $('code-input').focus();
});
document.addEventListener('keydown', event => {
  if ($('data-gate').hidden) return;
  if (/^[0-9]$/.test(event.key)) { event.preventDefault(); pushDigit(event.key); }
  if (event.key === 'Backspace') { event.preventDefault(); code = code.slice(0, -1); renderCode(); }
  if (event.key === 'Escape') { event.preventDefault(); resetCode(); }
});

document.querySelectorAll('[data-range]').forEach(button => {
  button.addEventListener('click', () => {
    activeRange = button.dataset.range;
    document.querySelectorAll('[data-range]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    loadDashboard();
  });
});
document.querySelectorAll('[data-granularity]').forEach(button => {
  button.addEventListener('click', () => {
    activeGranularity = button.dataset.granularity;
    document.querySelectorAll('[data-granularity]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    loadDashboard();
  });
});
$('retry').addEventListener('click', loadDashboard);
$('logout').addEventListener('click', async () => {
  await fetch('/api/data/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  showGate();
});

paintGrain();
addEventListener('resize', paintGrain, { passive: true });
fetch('/api/data/session', { credentials: 'same-origin' })
  .then(response => response.json())
  .then(session => session.ok ? showDashboard() : showGate())
  .catch(showGate);
