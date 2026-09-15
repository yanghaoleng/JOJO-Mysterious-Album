// This small demo is intentionally local: it visualizes an entered question,
// never sends it to a model, and never creates a story progress record.
const chapterPreviews = [
  { world: ['咕噜咕噜', '肚子星'], theme: '感受', momo: '鼓鼓', color: '暖暖黄', hex: '#ecd271', tint: '#f8f4df', description: '它的肚子里像藏着一面小鼓，咕噜咕噜响。鼓鼓有点不好意思，也不知道这声音在说什么。', question: '肚子咕噜叫，是不是在跟我说话？', invitation: '先听一听，再说说你自己的感觉。' },
  { world: ['哗啦啦', '海洋星'], theme: '发现', momo: '灰灰', color: '深深蓝', hex: '#8dbbcf', tint: '#eaf2f4', description: '灰灰住在灰蒙蒙的海里，身边的蓝色淡了。海底被乱七八糟的东西盖住了，灰灰有点想念从前的蓝。', question: '海底的蓝色，会藏在哪里？', invitation: '仔细看一看，一起发现被挡住的线索。' },
  { world: ['呼呼呼', '天气星'], theme: '提问', momo: '憋憋', color: '轻轻白', hex: '#d9e2e5', tint: '#edf1f1', description: '住在云里的憋憋把自己抱得紧紧的。它从来没哭过，今天却有一肚子的话，不知道怎么说出口。', question: '云朵，你肚子里装着什么？', invitation: '问得温柔一点，也给云朵一点时间。' },
  { world: ['嘀嗒嘀嗒', '时间星'], theme: '顺序', momo: '乱乱', color: '慢慢绿', hex: '#a8c9a8', tint: '#edf3e9', description: '乱乱总把早上和晚上弄混。星球上的一天也跟着乱了套，它看着匆忙的一天，想知道可不可以先停下来。', question: '我们的一天，应该从哪里开始？', invitation: '从熟悉的小事开始，慢慢找到一天的节奏。' },
  { world: ['影子影子', '星'], theme: '勇敢', momo: '躲躲', color: '柔柔粉', hex: '#e6b4bc', tint: '#f6edef', description: '躲躲一直藏在角落里。它觉得自己的样子不够好看，所以连打招呼，都只敢轻轻伸出一点点。', question: '如果影子不一样，还能做朋友吗？', invitation: '说出一个想法，陪它试着走出来一点。' },
  { world: ['好大好大', '小星星'], theme: '想象', momo: '点点', color: '闪闪金', hex: '#dcb85f', tint: '#f6f1df', description: '点点抱着一点小小的星光。它望着很大的宇宙，担心自己的光太小，也不敢说出藏了很久的愿望。', question: '一点点的光，可以照亮什么呢？', invitation: '把你的愿望告诉它，最后一扇门就在前面。' },
];

const tabButtons = [...document.querySelectorAll('[data-chapter]')];
const preview = document.querySelector('#chapter-preview');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function selectChapter(index, moveFocus = false) {
  const chapter = chapterPreviews[index];
  if (!chapter) return;
  tabButtons.forEach((button, item) => {
    button.setAttribute('aria-selected', String(item === index));
    button.tabIndex = item === index ? 0 : -1;
  });
  preview.setAttribute('aria-labelledby', `chapter-tab-${index}`);
  preview.style.setProperty('--chapter-color', chapter.hex);
  preview.style.setProperty('--chapter-tint', chapter.tint);
  document.querySelector('#preview-theme').textContent = `从“${chapter.theme}”出发`;
  const world = document.querySelector('#preview-world');
  world.replaceChildren(document.createTextNode(chapter.world[0]), document.createElement('br'), document.createTextNode(chapter.world[1]));
  document.querySelector('#preview-color').textContent = `这一站的颜色：${chapter.color}`;
  document.querySelector('#preview-momo').textContent = `你会遇见${chapter.momo}`;
  document.querySelector('#preview-description').textContent = chapter.description;
  document.querySelector('#preview-question').textContent = `“${chapter.question}”`;
  document.querySelector('#preview-invitation').textContent = chapter.invitation;
  preview.classList.remove('is-changing');
  if (!reducedMotion.matches) {
    void preview.offsetWidth;
    preview.classList.add('is-changing');
  }
  if (moveFocus) tabButtons[index].focus();
}

tabButtons.forEach((button, index) => {
  button.addEventListener('click', () => selectChapter(index));
  button.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabButtons.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabButtons.length - 1) % tabButtons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabButtons.length - 1;
    if (next !== undefined) { event.preventDefault(); selectChapter(next, true); }
  });
});

const form = document.querySelector('#question-form');
const questionInput = document.querySelector('#curiosity-question');
const error = document.querySelector('#question-error');
const responseLabel = document.querySelector('#response-label');
const responseQuestion = document.querySelector('#response-question');
const resetButton = document.querySelector('#reset-light');
const canvas = document.querySelector('#curiosity-planet');
const ctx = canvas.getContext('2d');
const planetStage = document.querySelector('#planet-stage');
let lights = 0;
let sparkTimer;

function seededRandom(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function drawPlanet() {
  if (!ctx) return;
  const width = 900;
  const height = 760;
  ctx.clearRect(0, 0, width, height);
  const random = seededRandom(117);
  const x = 450;
  const y = 350;
  const radius = 227;

  const glow = ctx.createRadialGradient(x, y, radius * .4, x, y, radius * 1.6);
  glow.addColorStop(0, lights ? 'rgba(248, 217, 130, .42)' : 'rgba(186, 201, 207, .18)');
  glow.addColorStop(1, 'rgba(245, 230, 180, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-.27);
  ctx.strokeStyle = '#afc0c6';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.5, radius * .52, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  const base = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  base.addColorStop(0, '#edf0e9');
  base.addColorStop(.48, '#dce2dd');
  base.addColorStop(1, '#b9c8c9');
  ctx.fillStyle = base;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  // Each organic color patch corresponds to one of the six submitted questions.
  const patches = [
    { x: -91, y: -100, r: 118 }, { x: 112, y: -76, r: 130 },
    { x: -21, y: 10, r: 102 }, { x: -144, y: 102, r: 110 },
    { x: 97, y: 103, r: 118 }, { x: -20, y: 180, r: 106 },
  ];
  patches.forEach((patch, index) => {
    const active = index < lights;
    ctx.fillStyle = active ? chapterPreviews[index].hex : ['#ccd7d1', '#c7d3d5', '#e1e6df', '#c1ceca', '#d2dbd8', '#bacac6'][index];
    ctx.globalAlpha = active ? .8 : .75;
    ctx.beginPath();
    for (let step = 0; step <= 45; step++) {
      const angle = step / 45 * Math.PI * 2;
      const wobble = 1 + Math.sin(angle * 4 + index) * .13 + Math.cos(angle * 7) * .04;
      const px = x + patch.x + Math.cos(angle) * patch.r * wobble;
      const py = y + patch.y + Math.sin(angle) * patch.r * .68 * wobble;
      if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  for (let dot = 0; dot < 2300; dot++) {
    const dx = random() * radius * 2 - radius;
    const dy = random() * radius * 2 - radius;
    ctx.fillStyle = random() > .5 ? 'rgba(248, 250, 245, .2)' : 'rgba(72, 104, 117, .035)';
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, random() * 3.5 + .6, 0, Math.PI * 2);
    ctx.fill();
  }
  const shade = ctx.createRadialGradient(x - 100, y - 120, 20, x + 30, y + 30, radius * 1.3);
  shade.addColorStop(0, 'rgba(253, 253, 245, .4)');
  shade.addColorStop(.62, 'rgba(249, 249, 239, 0)');
  shade.addColorStop(1, 'rgba(61, 91, 114, .22)');
  ctx.fillStyle = shade;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();

  // A familiar, quiet face makes the visualization feel like a listening world.
  ctx.fillStyle = '#334f5f';
  [x - 34, x + 34].forEach((eyeX) => {
    ctx.beginPath(); ctx.ellipse(eyeX, y + 15, 5.5, 8, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#334f5f';
  ctx.beginPath();
  if (lights) ctx.arc(x, y + 35, 15, .12, Math.PI - .12);
  else { ctx.moveTo(x - 7, y + 40); ctx.quadraticCurveTo(x, y + 37, x + 7, y + 40); }
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 - Math.PI * .78;
    const sx = x + Math.cos(angle) * radius * 1.45;
    const sy = y + Math.sin(angle) * radius * 1.24;
    ctx.fillStyle = i < lights ? chapterPreviews[i].hex : '#b9c7cc';
    ctx.beginPath(); ctx.arc(sx, sy, i < lights ? 8 : 4, 0, Math.PI * 2); ctx.fill();
    if (i < lights) {
      ctx.strokeStyle = chapterPreviews[i].hex;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - 14, sy); ctx.lineTo(sx + 14, sy); ctx.moveTo(sx, sy - 14); ctx.lineTo(sx, sy + 14); ctx.stroke();
    }
  }
}

function showQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question) {
    error.textContent = '先写下一个小问题，再让它亮起来。';
    error.hidden = false;
    questionInput.setAttribute('aria-invalid', 'true');
    questionInput.focus();
    return;
  }
  error.hidden = true;
  questionInput.removeAttribute('aria-invalid');
  lights = Math.min(6, lights + 1);
  document.querySelector('#light-count').textContent = String(lights);
  canvas.setAttribute('aria-label', `你的问题已点亮小星球的 ${lights} 种颜色，共 6 种`);
  responseLabel.textContent = lights === 6 ? '六种颜色都亮了。带着好奇心，去第一章见见 MOMO 吧。' : `叮！${chapterPreviews[lights - 1].color}亮起来了。`;
  responseQuestion.textContent = `你的问题：“${question}”`;
  responseQuestion.hidden = false;
  resetButton.hidden = false;
  drawPlanet();
  clearTimeout(sparkTimer);
  planetStage.classList.remove('is-lighting');
  if (!reducedMotion.matches) {
    void planetStage.offsetWidth;
    planetStage.classList.add('is-lighting');
    sparkTimer = setTimeout(() => planetStage.classList.remove('is-lighting'), 900);
  }
}

form.addEventListener('submit', (event) => { event.preventDefault(); showQuestion(questionInput.value); });
questionInput.addEventListener('input', () => {
  if (questionInput.value.trim()) { error.hidden = true; questionInput.removeAttribute('aria-invalid'); }
});
document.querySelectorAll('[data-question]').forEach((button) => {
  button.addEventListener('click', () => { questionInput.value = button.dataset.question; showQuestion(button.dataset.question); });
});
resetButton.addEventListener('click', () => {
  lights = 0;
  questionInput.value = '';
  error.hidden = true;
  questionInput.removeAttribute('aria-invalid');
  responseLabel.textContent = '星球在等你的第一句。';
  responseQuestion.hidden = true;
  responseQuestion.textContent = '';
  document.querySelector('#light-count').textContent = '0';
  canvas.setAttribute('aria-label', '还没有点亮的小星球，等待你的第一个问题');
  resetButton.hidden = true;
  planetStage.classList.remove('is-lighting');
  clearTimeout(sparkTimer);
  drawPlanet();
  questionInput.focus();
});
drawPlanet();
