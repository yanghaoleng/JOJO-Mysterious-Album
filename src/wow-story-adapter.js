import { WOW_STORY } from './wow-story-data.js';
import { storyCharacterTemplateById } from './story-character-templates.js';
import { localResult, SHAPES, PRIVATE } from './wow-local-turn.js';

export const wowVisibleWords = value => PRIVATE.test(String(value)) ? '个人信息不用说出来，我们只聊故事里的发现。' : String(value);

export const WOW_PROGRESS_KEY = 'wow-first-light-v1';
export const WOW_CAST = [
  { templateId: 'honey-bear', sceneId: 'meadow', entrance: 'bush', voice: 'moss' },
  { templateId: 'pond-frog', sceneId: 'underwater', entrance: 'water', voice: 'bubble' },
  { templateId: 'cloud-alpaca', sceneId: 'clouds', entrance: 'cloud', voice: 'bubble' },
  { templateId: 'book-owl', sceneId: 'library', entrance: 'door', voice: 'moss' },
  { templateId: 'moon-cat', sceneId: 'rooftop', entrance: 'left', voice: 'star' },
  { templateId: 'snow-rabbit', sceneId: 'space', entrance: 'cloud', voice: 'star' },
];

// The actors are the project's existing animal recipes. Only these physical
// descriptions change; the confirmed 41 beats, actions and causal arc remain.
const actorCopy = {
  'sea-window': '海螺通向哗啦啦海洋星。灰灰从一只空瓶后探头，身边的蓝色淡了。海底有片地方，被杂物盖得严严的。',
  'sea-color': '你的钥匙打开门，小车慢慢搬走杂物。贝壳的歌响起来，深深蓝回到灰灰身边，也落进你的颜色罐。',
  'cloud-arrival': '水光领你来到呼呼呼天气星。住在云里的憋憋把自己抱得紧紧的，肚子一抖一抖。身旁的小风也放轻了声音。',
  'time-arrival': '风铃下是嘀嗒嘀嗒时间星。乱乱一手抱枕头，一手端早餐：“咦，星星亮着，我怎么又准备起床啦？”',
  'shadow-arrival': '门边的影子通向影子影子星。躲躲贴在墙边，看自己的影子忽长忽短：“我的样子总在变，好像怎么站都不对。”',
  'shadow-listen': '我怕别人只喜欢又直又整齐的影子，所以带着自己的影子躲了起来。你愿意听我说，而不是催我走出来吗？',
  'star-arrival': '你来到好大好大小星星。点点抱着一点星光，缩在星图边：“大家都那么亮，我只有一点点光，是不是还不够呀？”',
};

const items = {
  torch: { id: 'torch', name: '好奇手电筒', mark: '光', color: '#d1a44b', short: '你的一句话点亮了它。', description: '先听见声音，再看见好奇光。停下来时，已经亮起的光不会减少。', use: '照着眼前的线索，慢慢说出你的发现。' },
  radio: { id: 'radio', name: '唔姆收音机', mark: '听', color: '#6d9d9e', short: '问候可以寄到MOMO身边。', description: '听不清小毛球的话时，才发现这台用来互相倾听的收音机。', use: '先听一听，再把你的问题和想法说给朋友。' },
  jar: { id: 'jar', name: '颜色罐', mark: '彩', color: '#bd8e87', short: '收藏每一次相遇的颜色。', description: '陪鼓鼓完成第一次相遇后，得到用来收藏颜色的小罐子。', use: '点亮一章后，这一种颜色会留在背包和旅程里。' },
};
for (const chapter of WOW_STORY.chapters) {
  items[`wow-color-${chapter.id}`] = { id: `wow-color-${chapter.id}`, name: chapter.colorName, mark: chapter.colorName.slice(-1), color: chapter.color, short: chapter.ability, description: `你在${chapter.world}陪${chapter.momo}留下的颜色。`, use: '它属于这次相遇，休息时也不会消失。' };
}

export const WOW_BLUEPRINT = {
  slug: 'wow', id: 'wow-first-light', title: WOW_STORY.title, analytics: 'wow', onboarding: 'direct',
  intro: '一声轻轻的咚咚，从窗里传来。你的第一句话，会走多远？',
  cover: './assets/story/covers/moon-plan.webp?v=20260901-moon',
  guide: { id: 'river-otter', name: '星星窗', voice: 'moss', template: storyCharacterTemplateById('river-otter'), entrance: 'door' },
  initialPet: { templateId: 'honey-bear', name: '鼓鼓', palette: 'moss', feature: 'soft-tail', intro: '', entrance: 'left' },
  interviewQuestions: [],
  chapters: WOW_STORY.chapters.map(ch => ({ id: `wow-${ch.id}`, number: ch.id, title: ch.title, promise: ch.summary })),
  items,
  scenes: WOW_STORY.chapters.flatMap(chapter => chapter.scenes.map((beat, beatIndex) => {
    const actor = WOW_CAST[chapter.id - 1];
    const sceneId = chapter.id === 1 ? beatIndex < 3 ? 'castle-window' : beatIndex < 7 ? 'meadow' : beatIndex < 9 ? 'breakfast-table' : 'seaside' : actor.sceneId;
    return {
      id: beat.id, chapter: chapter.id, name: chapter.id === 1 && beatIndex < 3 ? ['窗里的咚咚声', '一句话，一格光', '雾后的小耳朵'][beatIndex] : chapter.world, place: sceneId, sceneId, mode: 'wow',
      objective: beat.prompt,
      npc: { ...actor, name: chapter.id === 1 && beatIndex < 3 ? '星星窗' : chapter.id === 1 && beatIndex === 3 ? 'MOMO' : chapter.momo, intro: '' },
      cast: [], conversation: [{ speaker: 'npc', text: actorCopy[beat.id] || beat.text }],
      dialogue: beat.prompt, choices: [], reward: beat.reward ? `wow-color-${chapter.id}` : null,
      final: chapter.id === 6 && beatIndex === chapter.scenes.length - 1,
      wow: { ...beat, text: actorCopy[beat.id] || beat.text, beatIndex, beatCount: chapter.scenes.length, color: chapter.color, colorName: chapter.colorName, momo: chapter.momo, ability: chapter.ability },
    };
  })),
  ending: { label: '六次相遇，都被记得', title: '你的话，回来了', petLine: '想回来时，我们再一起听听新问题。' },
};

export function readWowProgress(storage) {
  const empty = { version: 1, chapter: 0, scene: 0, entries: [], props: [], colors: [], firstWords: '', pending: null, done: false };
  try {
    const target = storage || globalThis.localStorage;
    const saved = JSON.parse(target.getItem(WOW_PROGRESS_KEY));
    if (!saved || saved.version !== 1 || !Array.isArray(saved.entries)) return empty;
    if (!Number.isInteger(saved.chapter) || saved.chapter < 0 || !Number.isInteger(saved.scene) || saved.scene < 0) return empty;
    const chapter = WOW_STORY.chapters[saved.chapter];
    if (!chapter?.scenes[saved.scene]) return empty;
    const ids = new Set(WOW_BLUEPRINT.scenes.map(scene => scene.id));
    const entries = saved.entries.filter(e => e && ids.has(e.id) && typeof e.answer === 'string' && typeof e.reaction === 'string');
    const unique = [...new Map(entries.map(entry => [entry.id, entry])).values()];
    return {
      ...empty, ...saved, entries: unique,
      props: [...new Set((saved.props || []).filter(id => ['torch', 'radio', 'jar'].includes(id)))],
      colors: (saved.colors || []).filter(c => WOW_STORY.chapters.some(ch => ch.id === c?.id && ch.color === c?.color)),
      firstWords: String(saved.firstWords || unique[0]?.answer || ''),
      pending: saved.pending ? unique.find(e => e.id === chapter.scenes[saved.scene].id) || null : null,
      done: saved.done === true && unique.length === WOW_BLUEPRINT.scenes.length,
    };
  } catch { return empty; }
}

export function wowSceneIndex(progress) {
  return WOW_STORY.chapters.slice(0, progress.chapter).reduce((sum, chapter) => sum + chapter.scenes.length, 0) + progress.scene;
}

export function writeWowProgress(progress, storage) {
  try { const target = storage || globalThis.localStorage; target.setItem(WOW_PROGRESS_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}

export function wowFogProgress(progress, chapterNumber) {
  const chapter = WOW_STORY.chapters[chapterNumber - 1];
  const chapterIds = new Set(chapter.scenes.map(scene => scene.id));
  const answered = new Set(progress.entries.filter(e => chapterIds.has(e.id)).map(e => e.id));
  return Math.min(1, answered.size / chapter.scenes.length);
}

export function wowInvention(visual, chapterNumber) {
  const shape = Object.hasOwn(SHAPES, visual?.shape) ? visual.shape : 'star';
  return { kind: 'key', shape, name: `${SHAPES[shape]}钥匙`, primary: /^#[0-9a-f]{6}$/i.test(visual?.color || '') ? visual.color : WOW_STORY.chapters[chapterNumber - 1].color, accent: '#5f718c', motion: 'float' };
}

export async function requestWowTurn(scene, answer, signal) {
  const payload = { chapter: scene.chapter, kind: scene.wow.kind, answer, prompt: scene.dialogue, momo: scene.wow.momo };
  const fallback = localResult(payload);
  if (!fallback.accepted) return fallback;
  try {
    const response = await fetch('/api/wow-turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
    if (!response.ok) return fallback;
    const result = await response.json();
    if (typeof result.accepted !== 'boolean' || typeof result.reaction !== 'string') return fallback;
    return {
      accepted: result.accepted, reaction: result.reaction.slice(0, 160), source: result.source === 'ai' ? 'ai' : 'local',
      visual: { shape: Object.hasOwn(SHAPES, result.visual?.shape) ? result.visual.shape : fallback.visual.shape, color: /^#[0-9a-f]{6}$/i.test(result.visual?.color || '') ? result.visual.color : fallback.visual.color },
    };
  } catch { return fallback; }
}

export function wowJourneyHtml(progress) {
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const content = WOW_STORY.chapters.map(chapter => {
    const entries = progress.entries.filter(entry => entry.chapter === chapter.id);
    if (!entries.length) return '';
    return `<section><h2>${chapter.id}. ${escape(chapter.title)}</h2><p>${escape(chapter.world)} · ${escape(chapter.momo)}${progress.colors.some(color => color.id === chapter.id) ? ` · ${escape(chapter.colorName)}` : ' · 旅程进行中'}</p>${entries.map(entry => `<article><h3>${escape(chapter.scenes.find(beat => beat.id === entry.id)?.prompt)}</h3><blockquote>${escape(entry.answer)}</blockquote><p>${escape(entry.reaction)}</p>${entry.kind === 'create' ? `<p>你的钥匙：${escape(SHAPES[entry.visual?.shape] || '想象')} · ${escape(entry.visual?.color || chapter.color)}</p>` : ''}</article>`).join('')}</section>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>我的哇呜旅程</title><style>body{max-width:760px;margin:60px auto;padding:0 24px;background:#fffefa;color:#293028;font-family:system-ui,sans-serif;line-height:1.9}h1{font-size:38px}h2{margin-top:60px}h3{font-size:16px}blockquote{margin:12px 0;padding:10px 20px;border-left:3px solid #d1a44b;background:#faf5e5;white-space:pre-wrap;overflow-wrap:anywhere}article{break-inside:avoid;border-bottom:1px solid #ddd;padding:15px 0}p{overflow-wrap:anywhere}small{color:#697064}@media print{body{margin:0}section{break-before:page}}</style><h1>我的哇呜旅程</h1><p>${escape(WOW_STORY.title)}</p><p>这一切，从你的一句话开始：</p><blockquote>${escape(progress.firstWords)}</blockquote><small>${progress.entries.length}段回应 · ${progress.colors.length}种颜色 · ${progress.done ? '六章旅程已完成' : '旅程还在继续'}<br>这是根据本次记录整理的纪念册，可以在浏览器阅读或打印。不是成长测评。</small>${content}<footer><h2>小灯会留着光，等你回来。</h2><p>谢谢你愿意问，也愿意听。</p></footer></html>`;
}

export function downloadWowJourney(progress) {
  const url = URL.createObjectURL(new Blob([wowJourneyHtml(progress)], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = '我的哇呜旅程.html'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
