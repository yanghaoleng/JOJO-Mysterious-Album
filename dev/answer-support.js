// Give children a concrete starting point without interrupting ongoing speech.
export function isVagueAnswer(text) {
  const words = String(text || '').replace(/[\s，。！？、,.!?…]/gu, '');
  return !words || /^(嗯+|啊+|哦+|呃+|那个|这个|然后|就是|我|我想|我想要|我觉得|不知道|我不知道|不太知道|没想好|还没想好|我想想|等一下)+$/u.test(words);
}

export class AnswerSupport {
  constructor({ available, reveal, now = () => performance.now() }) {
    Object.assign(this, { available, reveal, now });
  }
  start() {
    this.stop(); this.elapsed = 0; this.started = false; this.last = this.now();
    this.timer = setInterval(() => this.tick(), 100);
  }
  capture(update) {
    if (['receiving', 'transcribing', 'transcript'].includes(update.state)) this.started = true;
  }
  tick() {
    const time = this.now(), delta = time - this.last; this.last = time;
    if (!this.available()) return;
    this.elapsed += delta;
    if ((!this.started && this.elapsed >= 4000) || this.elapsed >= 8000) {
      this.stop(); this.reveal();
    }
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}
