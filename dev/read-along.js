import { createTextMotion } from '../vendor/calligraph-bubble.js?v=20260910-lyric-motion';
import { phraseRanges } from './speech-timing.js';

/** Audio offsets select whole short clauses; Calligraph handles text entrance. */
export class ReadAlong {
  constructor(element) {
    if (!element?.ownerDocument) throw new TypeError('ReadAlong needs a DOM element.');
    this.element = element; this.text = ''; this.version = 0; this.spokenEnd = 0; this.segments = [];
    element.classList.add('read-along');
  }
  setText(text) {
    this.segments.forEach(segment => segment.motion.destroy());
    this.text = String(text ?? ''); this.version++; this.spokenEnd = 0;
    const document = this.element.ownerDocument;
    const accessible = document.createElement('span');
    accessible.className = 'read-along__accessible sr-only'; accessible.textContent = this.text;
    const visual = document.createElement('span'); visual.className = 'read-along__visual'; visual.setAttribute('aria-hidden', 'true');
    this.element.replaceChildren(accessible, visual);
    let glyphIndex = 0;
    const step = Math.min(22, 600 / Math.max(1, [...this.text].length));
    this.segments = phraseRanges(this.text).map(phrase => {
      const node = document.createElement('span'); node.className = 'read-along__phrase'; visual.append(node);
      const motion = createTextMotion(node); motion.setText(phrase.text, { delay: glyphIndex * step, step });
      glyphIndex += [...phrase.text].length;
      return { ...phrase, node, motion, state: 0 };
    });
    this.element.removeAttribute('data-reading'); return this.version;
  }
  update({ start = -1, end = -1, spokenEnd = this.spokenEnd } = {}) {
    this.spokenEnd = Number.isFinite(spokenEnd) ? Math.max(0, Math.min(this.text.length, Math.trunc(spokenEnd))) : this.spokenEnd;
    const valid = Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && start < this.text.length;
    const activePhrase = valid ? this.segments.find(segment => segment.start < end && segment.end > start)
      : this.segments.find(segment => segment.start < this.spokenEnd && segment.end > this.spokenEnd);
    for (const segment of this.segments) {
      const current = segment === activePhrase;
      const read = !current && (segment.end <= this.spokenEnd || (valid && segment.end <= start));
      const state = current ? 2 : read ? 1 : 0;
      if (segment.state === state) continue;
      segment.node.classList.toggle('is-read', read); segment.node.classList.toggle('is-current', current); segment.state = state;
    }
    if (Boolean(activePhrase) !== this.element.hasAttribute('data-reading')) {
      this.element.toggleAttribute('data-reading', Boolean(activePhrase));
    }
  }
  clear() { this.segments.forEach(segment => segment.motion.finish()); this.update({ spokenEnd: 0 }); }
  finish() { this.segments.forEach(segment => segment.motion.finish()); this.update({ spokenEnd: this.text.length }); }
}
