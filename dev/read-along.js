/**
 * Paint-only read-along view. Offsets are half-open UTF-16 ranges in the exact
 * sentence passed to setText(), including punctuation and repeated characters.
 * The caller owns the audio clock and can compare the returned version before
 * delivering asynchronous updates. This class never schedules its own timer.
 */
export class ReadAlong {
  constructor(element) {
    if (!element?.ownerDocument || typeof element.replaceChildren !== 'function') {
      throw new TypeError('ReadAlong needs a DOM element.');
    }
    this.element = element;
    this.text = '';
    this.version = 0;
    this.spokenEnd = 0;
    this.segments = [];
    this.segmenter = typeof Intl?.Segmenter === 'function'
      ? new Intl.Segmenter('zh', { granularity: 'grapheme' })
      : null;
    element.classList.add('read-along');
  }

  setText(text) {
    this.text = String(text ?? '');
    this.version += 1;
    this.spokenEnd = 0;
    this.segments = [];
    const document = this.element.ownerDocument;

    // Only this unchanged, complete sentence is exposed to the parent's live
    // region. Timing updates below never change accessible text or live regions.
    const accessible = document.createElement('span');
    accessible.className = 'read-along__accessible sr-only';
    accessible.textContent = this.text;
    const visual = document.createElement('span');
    visual.className = 'read-along__visual';
    visual.setAttribute('aria-hidden', 'true');

    if (this.segmenter) {
      for (const { segment, index } of this.segmenter.segment(this.text)) {
        const node = document.createElement('span');
        node.className = 'read-along__char';
        node.textContent = segment;
        this.segments.push({ node, start: index, end: index + segment.length, state: 0 });
        visual.append(node);
      }
    } else {
      // Older browsers keep a fully readable sentence. Never split a surrogate,
      // combining mark or ZWJ emoji just to approximate a grapheme highlight.
      visual.textContent = this.text;
    }

    this.element.removeAttribute('data-reading');
    this.element.replaceChildren(accessible, visual);
    return this.version;
  }

  update({ start = -1, end = -1, spokenEnd = this.spokenEnd } = {}) {
    const length = this.text.length;
    this.spokenEnd = Number.isFinite(spokenEnd)
      ? Math.max(0, Math.min(length, Math.trunc(spokenEnd)))
      : this.spokenEnd;
    const hasRange = Number.isFinite(start) && Number.isFinite(end)
      && start >= 0 && end > start && start < length;
    const currentStart = hasRange ? Math.trunc(start) : -1;
    const currentEnd = hasRange ? Math.min(length, Math.trunc(end)) : -1;
    let active = false;

    for (const segment of this.segments) {
      // A partial UTF-16 overlap highlights the complete grapheme. Read progress
      // reaches a grapheme only once its full range has been spoken.
      const current = hasRange && segment.start < currentEnd && segment.end > currentStart;
      const read = !current && segment.end <= this.spokenEnd;
      const state = current ? 2 : read ? 1 : 0;
      active ||= current;
      if (segment.state === state) continue;
      segment.node.classList.toggle('is-read', read);
      segment.node.classList.toggle('is-current', current);
      segment.state = state;
    }

    if (active && !this.element.hasAttribute('data-reading')) {
      this.element.setAttribute('data-reading', 'true');
    } else if (!active && this.element.hasAttribute('data-reading')) {
      this.element.removeAttribute('data-reading');
    }
  }

  clear() {
    this.update({ start: -1, end: -1, spokenEnd: 0 });
  }

  finish() {
    this.update({ start: -1, end: -1, spokenEnd: this.text.length });
  }
}
