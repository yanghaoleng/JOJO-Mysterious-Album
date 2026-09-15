// Match provider timestamps to the displayed sentence, retaining UTF-16 offsets.
// Punctuation has no spoken duration; unmatched/normalized words stay unmarked.
const spoken = value => Array.from(value.normalize('NFKC').toLowerCase()).filter(char => /[\p{L}\p{N}]/u.test(char)).join('');

export function speechTimeline(text, alignment, duration = Infinity) {
  const letters = [];
  let offset = 0;
  for (const char of text) {
    for (const normalized of spoken(char).split('')) letters.push({ char: normalized, start: offset, end: offset + char.length });
    offset += char.length;
  }
  const normalized = letters.map(item => item.char).join('');
  const result = [];
  let cursor = 0, lastTime = 0;
  for (const item of Array.isArray(alignment) ? alignment : []) {
    const word = spoken(String(item?.text || ''));
    const startTime = Number(item?.start), endTime = Number(item?.end);
    if (!word || !Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime < lastTime || endTime <= startTime || endTime > duration + .15) continue;
    // Search forward only: repeated words must never jump back in the sentence.
    const index = normalized.indexOf(word, cursor);
    if (index < 0) continue;
    const start = letters[index]?.start, end = letters[index + word.length - 1]?.end;
    if (start == null || end == null) continue;
    result.push({ start, end, startTime, endTime });
    cursor = index + word.length; lastTime = startTime;
  }
  return result;
}

export function readingAt(timeline, elapsed) {
  let spokenEnd = 0;
  for (const cue of timeline) {
    if (elapsed < cue.startTime) break;
    if (elapsed < cue.endTime) return { start: cue.start, end: cue.end, spokenEnd };
    spokenEnd = cue.end;
  }
  return { start: -1, end: -1, spokenEnd };
}

// Keep punctuation with its preceding short clause; cap unpunctuated passages
// without splitting graphemes. UTF-16 ranges still match the provider timeline.
export function phraseRanges(text) {
  const glyphs = [...new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(text)];
  const phrases = [];
  let start = 0, count = 0, pendingBoundary = false;
  for (let i = 0; i < glyphs.length; i++) {
    const { segment, index } = glyphs[i]; count++;
    const punctuation = /[，,。！？!?；;：:\n]/u.test(segment);
    pendingBoundary ||= punctuation;
    const next = glyphs[i + 1]?.segment || '';
    const closing = /[”’」』"）)]/u.test(next);
    const wordContinues = /[a-zA-Z0-9]/u.test(segment) && /[a-zA-Z0-9]/u.test(next);
    if (i === glyphs.length - 1 || (!closing && (pendingBoundary || (count >= 16 && !wordContinues)))) {
      const end = index + segment.length;
      phrases.push({ text: text.slice(start, end), start, end }); start = end; count = 0; pendingBoundary = false;
    }
  }
  return phrases;
}
