/**
 * Recorded-input integration test; NEVER requests the user's microphone.
 *
 * Start the explicit API proxy:
 * DEV_API_BASE=https://jma.mikeywa.site node dev/tools/preview.mjs 8914
 * Then provide a mono PCM16 WAV saying "我想要一只小猫", with a silent tail:
 * node dev/tools/verify-real-voice.mjs /absolute/path/answer.wav
 *
 * Only getUserMedia is replaced with a clearly labelled prerecorded MediaStream.
 * Application AudioWorklet, VAD, PCM conversion, ASR requests, and story state are
 * real. Fetch instrumentation observes responses without replacing them.
 * Chromium fake-device flags additionally prevent accidental hardware access.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fixturePath = process.argv[2];
if (!fixturePath) throw new Error('Provide a prerecorded mono PCM16 WAV fixture; a live microphone is never used.');
const wav = await readFile(fixturePath);
assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
let format, samples;
for (let offset = 12; offset + 8 <= wav.length;) {
  const kind = wav.toString('ascii', offset, offset + 4), size = wav.readUInt32LE(offset + 4), start = offset + 8;
  if (kind === 'fmt ') format = { encoding: wav.readUInt16LE(start), channels: wav.readUInt16LE(start + 2), sampleRate: wav.readUInt32LE(start + 4), bits: wav.readUInt16LE(start + 14) };
  if (kind === 'data') samples = wav.subarray(start, start + size);
  offset = start + size + (size % 2);
}
assert.equal(format?.encoding, 1, 'fixture must use uncompressed PCM');
assert.equal(format.channels, 1, 'fixture must be mono');
assert.equal(format.bits, 16, 'fixture must be PCM16');
assert.ok(samples?.length);
let fixturePeak = 0;
for (let index = 0; index < samples.length; index += 2) fixturePeak = Math.max(fixturePeak, Math.abs(samples.readInt16LE(index) / 32768));
assert.ok(fixturePeak > .02, 'fixture is unexpectedly silent');

const browser = process.env.AGENT_BROWSER_BIN || '/Users/jojo/.npm-global/bin/agent-browser';
const session = process.env.DEV_QA_SESSION || `dev-recorded-voice-${process.pid}`;
const base = process.env.DEV_QA_BASE || 'http://127.0.0.1:8914/dev/';
const resultPath = new URL('./verify-real-voice-results.json', import.meta.url);
const log = [];
const record = (event, detail) => { const value = { event, ...detail }; log.push(value); console.log(JSON.stringify(value)); };
const command = (...args) => execFileSync(browser, ['--session', session, ...args], { encoding: 'utf8', timeout: 25000, maxBuffer: 4 * 1024 * 1024 }).trim();
const evaluate = code => JSON.parse(command('eval', code));
const inputScript = code => execFileSync(browser, ['--session', session, 'eval', '--stdin'], { input: code, encoding: 'utf8', timeout: 25000, maxBuffer: 4 * 1024 * 1024 }).trim();
const click = selector => { command('scrollintoview', selector); return command('click', selector); };
const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
const observe = () => evaluate(`(()=>{
  const qa=window.__QA_RECORDED_AUDIO__;
  return {state:window.__DEV_STORY__.status, speech:document.querySelector('#speech-text').textContent,
    micState:document.querySelector('#mic-button').dataset.state,
    fixture:qa?{calls:qa.calls,requests:qa.requests,streams:qa.streams.map(s=>({id:s.id,trackState:s.track.readyState,trackEnabled:s.track.enabled,contextState:s.context.state,peak:s.peak,played:s.played,stopped:s.stopped}))}:null};
})()`);
async function waitFor(label, accept, { timeout = 45000, skipSpeech = false } = {}) {
  const deadline = Date.now() + timeout;
  let current;
  while (Date.now() < deadline) {
    current = observe();
    if (accept(current)) return current;
    if (skipSpeech) evaluate(`(()=>{const card=document.querySelector('#speech-card');if(!card.hidden&&card.dataset.speaking==='true')card.click();return true;})()`);
    await sleep(220);
  }
  throw new Error(`${label} timed out: ${JSON.stringify(current)}`);
}

let opened = false;
try {
  command('--args', '--use-fake-ui-for-media-stream,--use-fake-device-for-media-stream,--autoplay-policy=no-user-gesture-required', 'open', `${base}?story=doudou`);
  opened = true;
  command('set', 'viewport', '390', '844');
  command('snapshot', '-i');
  inputScript(`(() => {
    const encoded=${JSON.stringify(wav.toString('base64'))};
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const qa={kind:'PRERECORDED WAV MEDIASTREAM; NO HARDWARE MICROPHONE',calls:0,streams:[],requests:[]};
    window.__QA_RECORDED_AUDIO__=qa;
    const originalFetch=window.fetch.bind(window);
    window.fetch=async (...args)=>{
      const url=new URL(typeof args[0]==='string'?args[0]:args[0].url,location.href);
      if(!['/api/asr','/api/tts'].includes(url.pathname))return originalFetch(...args);
      const entry={path:url.pathname,startedAt:Date.now()};qa.requests.push(entry);
      if(url.pathname==='/api/asr'){
        const body=JSON.parse(args[1]?.body||'{}');entry.pcmBytes=atob(body.pcm||'').length;
      }
      try{
        const response=await originalFetch(...args);entry.status=response.status;
        if(url.pathname==='/api/asr')entry.response=await response.clone().json();
        entry.finishedAt=Date.now();return response;
      }catch(error){entry.error=error.name;throw error;}
    };
    navigator.mediaDevices.getUserMedia=async constraints=>{
      if(!constraints?.audio||constraints.video)throw Error('Fixture only supplies prerecorded audio');
      qa.calls++;
      const context=new AudioContext({sampleRate:${format.sampleRate}});
      await context.resume();
      const buffer=await context.decodeAudioData(bytes.buffer.slice(0));
      const destination=context.createMediaStreamDestination();
      const track=destination.stream.getAudioTracks()[0];
      const stream={id:qa.calls,context,track,destination,buffer,peak:0,played:false,stopped:false};
      const originalStop=track.stop.bind(track);
      track.stop=()=>{
        originalStop();stream.stopped=true;clearInterval(stream.meter);
        try{stream.source?.stop();}catch{}
        void context.close().catch(()=>{});
      };
      stream.play=()=>{
        if(stream.played||stream.stopped)throw Error('Fixture stream is not ready');
        const source=context.createBufferSource(),analyser=context.createAnalyser();
        analyser.fftSize=2048;source.buffer=buffer;source.connect(analyser);analyser.connect(destination);
        stream.source=source;stream.played=true;
        const frame=new Float32Array(analyser.fftSize);
        stream.meter=setInterval(()=>{
          analyser.getFloatTimeDomainData(frame);
          for(const value of frame)stream.peak=Math.max(stream.peak,Math.abs(value));
        },60);
        source.onended=()=>clearInterval(stream.meter);
        source.start(context.currentTime+.1);
      };
      qa.streams.push(stream);return destination.stream;
    };
    return {installed:true,kind:qa.kind};
  })()`);
  record('fixture', { path: fixturePath, sha256: createHash('sha256').update(wav).digest('hex'), ...format, duration: samples.length / 2 / format.sampleRate, peak: fixturePeak, hardwareMicrophone: false });
  click('#restart'); click('#start-story');
  const first = await waitFor('First partner question', value => value.state.phase === 'setup' && value.state.setupStep === 0 && !value.state.busy, { skipSpeech: true });
  record('first-question', { state: first.state, speech: first.speech });
  click('#mic-button');
  const enabled = await waitFor('Fixture microphone enable', value => value.state.voice.recording && value.fixture.streams.length === 1);
  assert.equal(enabled.fixture.streams[0].trackState, 'live');
  record('enabled', enabled);
  click('#mic-button');
  const paused = await waitFor('Pause releases fixture', value => !value.state.voice.enabled && value.fixture.streams[0].trackState === 'ended');
  assert.equal(paused.state.setupStep, 0);
  record('paused', paused);
  click('#mic-button');
  const resumed = await waitFor('New stream after resume', value => value.state.voice.recording && value.fixture.streams.length === 2);
  record('resumed', resumed);
  evaluate(`(()=>{window.__QA_RECORDED_AUDIO__.streams.at(-1).play();return true;})()`);
  const captured = await waitFor('Actual AudioWorklet voice frames', value => value.state.voice.voicedSeconds > .2 && value.fixture.streams.at(-1).peak > .02);
  record('captured-by-real-worklet', captured);
  const recognized = await waitFor('Real ASR response', value => value.fixture.requests.some(request => request.path === '/api/asr' && request.status === 200 && request.response?.transcript));
  const asr = recognized.fixture.requests.find(request => request.path === '/api/asr' && request.status === 200 && request.response?.transcript);
  assert.match(asr.response.transcript, /小猫|猫/);
  assert.ok(asr.pcmBytes > 16000);
  record('real-asr', { response: asr, fixture: recognized.fixture.streams });
  const advanced = await waitFor('Spoken answer advances the page and resumes listening', value => value.state.phase === 'setup' && value.state.setupStep === 1 && !value.state.busy && value.state.voice.recording, { timeout: 55000 });
  assert.match(advanced.speech, /颜色/);
  record('voice-advanced-page', advanced);
  command('screenshot', '/tmp/dev-recorded-voice-advanced.png');
  click('a[aria-label="返回故事工坊"]');
  const exited = await waitFor('Leaving releases capture and audio context', value => value.state.phase === 'home' && value.state.voice.contextState === 'closed' && value.fixture.streams.every(stream => stream.trackState === 'ended'));
  record('exited-and-released', exited);
  const errors = command('errors'); assert.equal(errors, '', `Unexpected page errors: ${errors}`);
  await writeFile(resultPath, `${JSON.stringify({ checkedAt: new Date().toISOString(), base, session, method: 'Explicit prerecorded MediaStream fixture; real AudioWorklet, VAD, PCM16, upstream ASR, UI response; no physical microphone', passed: true, log }, null, 2)}\n`);
  console.log('Recorded-input voice integration passed.');
} catch (error) {
  let finalObservation;
  if (opened) { try { finalObservation = observe(); } catch {} }
  await writeFile(resultPath, `${JSON.stringify({ checkedAt: new Date().toISOString(), base, session, passed: false, error: error.message, finalObservation, log }, null, 2)}\n`);
  throw error;
} finally {
  if (opened) { try { command('close'); } catch {} }
}
