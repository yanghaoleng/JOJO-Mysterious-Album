const PROTOCOL = 'cyberjojo.activity.v1';
const HOST_ORIGIN = 'https://cyberjojo.mikeywa.site';

// Only explicit target completion counts; text recognition is not pronunciation grading.
export function createActivityLedger(now = Date.now) {
  const started = now(), completed = new Set(), lessons = new Map(), words = new Set(), independentWords = new Set(), guidedWords = new Set();
  let voiceAttempts = 0, menuAttempts = 0, chapter = '', status = 'playing';
  return {
    start({ chapterId, title, lessonIds }) {
      chapter = title;
      for (const id of lessonIds) lessons.set(`${chapterId}:${id}`, true);
      status = 'playing';
    },
    attempt({ chapterId, lessonId, fromMenu, targetComplete, knownWords = [], spokenText = '', defaultPrompt = '' }) {
      if (fromMenu) menuAttempts++; else voiceAttempts++;
      if (targetComplete) completed.add(`${chapterId}:${lessonId}`);
      if (!fromMenu) {
        const tokens = text => String(text).toLowerCase().normalize('NFKC').match(/[a-z]+(?:'[a-z]+)?/g) || [];
        const defaults = new Set(tokens(defaultPrompt));
        for (const word of tokens(spokenText)) {
          if (word.length > 40 || (!words.has(word) && words.size >= 200)) continue;
          words.add(word);
          if (!defaults.has(word)) { independentWords.add(word); guidedWords.delete(word); }
          else if (!independentWords.has(word)) guidedWords.add(word);
        }
      }
      for (const word of knownWords) if (typeof word === 'string' && word.length <= 40 && words.size < 200) words.add(word);
    },
    snapshot(nextStatus = status) {
      status = nextStatus;
      return { status, chapter, voiceAttempts, menuAttempts, completedLessons: [...completed].filter(id => lessons.has(id)).length, totalLessons: lessons.size, words: [...words], wordGroupsVersion: 1, independentWords: [...independentWords], guidedWords: [...guidedWords], durationSeconds: Math.min(86400, Math.max(0, Math.floor((now() - started) / 1000))) };
    },
  };
}

export function createActivityBridge({ stop }) {
  const params = new URLSearchParams(location.search), sessionId = params.get('session');
  let host = '';
  try { host = new URL(document.referrer).origin; } catch {}
  if (params.get('host') !== 'cyberjojo' || !/^[a-zA-Z0-9-]{1,80}$/.test(sessionId || '') || host !== HOST_ORIGIN || window.parent === window) return { start() {}, attempt() {}, complete() {} };
  const ledger = createActivityLedger();
  let ended = false;
  const send = (type, report) => window.parent.postMessage({ protocol: PROTOCOL, activityId: 'words', sessionId, type, ...(report ? { report } : {}) }, HOST_ORIGIN);
  const exit = () => {
    if (ended) return;
    ended = true; stop(); send('result', ledger.snapshot(ledger.snapshot().status === 'completed' ? 'completed' : 'exited'));
  };
  window.addEventListener('message', event => {
    if (event.origin !== HOST_ORIGIN || event.source !== window.parent || event.data?.protocol !== PROTOCOL || event.data?.sessionId !== sessionId || event.data?.activityId !== 'words') return;
    if (event.data.type === 'exit') exit();
  });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); exit(); } });
  send('ready');
  return {
    start(metadata) { ledger.start(metadata); send('progress', ledger.snapshot()); },
    attempt(result) { ledger.attempt(result); send('progress', ledger.snapshot()); },
    complete() {
      send('progress', ledger.snapshot('completed'));
      const button = document.getElementById('explore-next');
      if (!button) return;
      button.textContent = '返回绿豆 · 收好练习记录';
      button.onclick = exit;
    },
  };
}
