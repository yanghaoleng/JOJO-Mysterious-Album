class DevPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(2048); this.offset = 0;
    this.enabled = false; this.token = 0;
    this.port.onmessage = ({ data }) => {
      if (data?.type !== 'capture') return;
      this.enabled = Boolean(data.enabled); this.token = data.token;
      this.samples = new Float32Array(2048); this.offset = 0;
    };
  }
  process(inputs) {
    if (!this.enabled) return true;
    const channel = inputs[0]?.[0];
    if (channel) for (const sample of channel) {
      this.samples[this.offset++] = sample;
      if (this.offset === this.samples.length) {
        this.port.postMessage({ samples: this.samples, token: this.token }, [this.samples.buffer]);
        this.samples = new Float32Array(2048); this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('dev-pcm-capture', DevPcmCapture);
