const VOICES = {
  sprout: { referenceId: '57744207b298418194abd366d4596c8b', fishSpeed: 0.92, volcSpeed: 0.94, pitch: 1.04, speaker: 'ICL_zh_female_keainvsheng_tob' },
  bubble: { referenceId: '35e4dae87120478ea72d3eef6ff77ba0', fishSpeed: 1.08, volcSpeed: 1.08, pitch: 1.08, speaker: 'ICL_zh_female_tiaopigongzhu_tob' },
  moss: { referenceId: '943fc7f50e6245dabb8362a7e9ceca0a', fishSpeed: 0.82, volcSpeed: 0.86, pitch: 0.94, speaker: 'zh_male_lanxiaoyang_mars_bigtts' },
  star: { referenceId: '0fa0c39f8c8849a482db9da1586d1888', fishSpeed: 1.04, volcSpeed: 1, pitch: 1, speaker: 'ICL_zh_male_shuanglangshaonian_tob' },
  clever: { referenceId: '0fa0c39f8c8849a482db9da1586d1888', fishSpeed: 1.04, volcSpeed: 1.04, pitch: 1.02, speaker: 'ICL_zh_male_tiancaitongzhuo_tob' },
  bright: { referenceId: '35e4dae87120478ea72d3eef6ff77ba0', fishSpeed: 1.06, volcSpeed: 1.05, pitch: 1.07, speaker: 'zh_male_dongmanhaimian_mars_bigtts' },
  lively: { referenceId: '35e4dae87120478ea72d3eef6ff77ba0', fishSpeed: 1.08, volcSpeed: 1.08, pitch: 1.06, speaker: 'ICL_zh_female_huoponvhai_tob' },
  sweet: { referenceId: '57744207b298418194abd366d4596c8b', fishSpeed: 0.98, volcSpeed: 0.98, pitch: 1.04, speaker: 'zh_female_tianmeixiaoyuan_moon_bigtts' },
  clear: { referenceId: '57744207b298418194abd366d4596c8b', fishSpeed: 0.96, volcSpeed: 0.96, pitch: 1, speaker: 'zh_female_qingchezizi_moon_bigtts' },
  neighbor: { referenceId: '0fa0c39f8c8849a482db9da1586d1888', fishSpeed: 1.02, volcSpeed: 1.02, pitch: 0.98, speaker: 'zh_male_linjiananhai_moon_bigtts' },
  youth: { referenceId: '0fa0c39f8c8849a482db9da1586d1888', fishSpeed: 1.04, volcSpeed: 1.04, pitch: 0.97, speaker: 'zh_male_shaonianzixin_moon_bigtts' },
  gentle: { referenceId: '943fc7f50e6245dabb8362a7e9ceca0a', fishSpeed: 0.88, volcSpeed: 0.9, pitch: 0.98, speaker: 'zh_female_wenrouxiaoya_moon_bigtts' },
  soft: { referenceId: '57744207b298418194abd366d4596c8b', fishSpeed: 0.92, volcSpeed: 0.92, pitch: 1, speaker: 'zh_female_linjianvhai_moon_bigtts' },
  smart: { referenceId: '0fa0c39f8c8849a482db9da1586d1888', fishSpeed: 1.06, volcSpeed: 1.06, pitch: 1.02, speaker: 'ICL_zh_male_shenmi_v1_tob' },
  caring: { referenceId: '57744207b298418194abd366d4596c8b', fishSpeed: 0.95, volcSpeed: 0.95, pitch: 1.03, speaker: 'ICL_zh_female_yilin_tob' },
};

async function volcSeedTts(text, preset, voice) {
  const appId = process.env.VOLC_SPEECH_APP_ID;
  const accessToken = process.env.VOLC_SPEECH_ACCESS_TOKEN;
  const resourceId = process.env.VOLC_TTS_RESOURCE_ID || 'volc.service_type.10029';
  const voiceEnv = `VOLC_TTS_SPEAKER_${voice.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const speaker = process.env[voiceEnv] || preset.speaker || process.env.VOLC_TTS_SPEAKER_ID;
  if (!appId || !accessToken || !resourceId || !speaker) throw new Error('tts_not_configured');
  const requestId = crypto.randomUUID();
  const speechRate = Math.max(-50, Math.min(100, Math.round((preset.volcSpeed - 1) * 100)));
  const pitch = Math.max(-12, Math.min(12, Math.round((preset.pitch - 1) * 100)));
  const upstream = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'X-Api-App-Id': appId,
      'X-Api-Access-Key': accessToken,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Request-Id': requestId,
    },
    body: JSON.stringify({
      user: { uid: 'kindergrimm-story' },
      req_params: {
        text,
        speaker,
        sample_rate: 24000,
        audio_params: { format: 'mp3', bit_rate: 64000, speech_rate: speechRate, loudness_rate: 0 },
        additions: JSON.stringify({ post_process: { pitch } }),
      },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!upstream.ok) throw new Error(`volc_http_${upstream.status}`);
  const reader = upstream.body?.getReader();
  if (!reader) throw new Error('volc_stream_unavailable');
  const decoder = new TextDecoder();
  let buffer = '';
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = JSON.parse(line.slice(5).trim());
      if (![0, 20000000].includes(payload.code || 0)) throw new Error(`volc_code_${payload.code || 'unknown'}`);
      if (payload.data) chunks.push(Buffer.from(payload.data, 'base64'));
    }
    if (done) break;
  }
  if (!chunks.length) throw new Error('volc_empty');
  return Buffer.concat(chunks);
}

async function volcTtsV1(text, preset, voice) {
  const appId = process.env.VOLC_SPEECH_APP_ID;
  const accessToken = process.env.VOLC_SPEECH_ACCESS_TOKEN;
  const voiceEnv = `VOLC_TTS_SPEAKER_${voice.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const speaker = process.env[voiceEnv] || preset.speaker || process.env.VOLC_TTS_SPEAKER_ID;
  if (!appId || !accessToken || !speaker) throw new Error('tts_not_configured');
  const upstream = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST', headers: { 'Authorization': `Bearer; ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app: { appid: appId, token: 'access_token', cluster: 'volcano_tts' }, user: { uid: 'kindergrimm-story' },
      audio: { voice_type: speaker, encoding: 'mp3', speed_ratio: preset.volcSpeed, pitch_ratio: preset.pitch },
      request: { reqid: crypto.randomUUID(), text, operation: 'query' },
    }), signal: AbortSignal.timeout(45000),
  });
  if (!upstream.ok) throw new Error(`volc_http_${upstream.status}`);
  const payload = await upstream.json();
  if (payload.code !== 3000 || !payload.data) throw new Error(`volc_code_${payload.code || 'unknown'}`);
  return Buffer.from(payload.data, 'base64');
}

async function fishTts(text, preset) {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) throw new Error('tts_not_configured');
  const upstream = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'model': 's2.1-pro-free',
    },
    body: JSON.stringify({
      text,
      reference_id: preset.referenceId,
      format: 'mp3',
      sample_rate: 44100,
      mp3_bitrate: 128,
      normalize: true,
      temperature: 0.7,
      top_p: 0.7,
      prosody: { speed: preset.fishSpeed, volume: 0, normalize_loudness: true },
    }),
    signal: AbortSignal.timeout(75000),
  });
  if (!upstream.ok) throw new Error(`fish_http_${upstream.status}`);
  return Buffer.from(await upstream.arrayBuffer());
}

export const maxDuration = 90;

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' });
  const text = String(request.body?.text || '').trim().replace(/[<>]/g, '').slice(0, 120);
  const voice = VOICES[request.body?.voice] ? request.body.voice : 'star';
  if (!text) return response.status(400).json({ error: 'text_required' });

  try {
    const preset = VOICES[voice];
    const provider = (process.env.PET_TTS_PROVIDER || 'fish').toLowerCase();
    let audio;
    let actualProvider = provider;
    if (provider === 'volc') {
      try {
        audio = await volcSeedTts(text, preset, voice);
        actualProvider = 'volc-seed-v3';
      } catch (error) {
        console.warn('Seed V3 TTS unavailable; using legacy voice fallback', error?.message || 'unknown');
        audio = await volcTtsV1(text, preset, voice);
        actualProvider = 'volc-v1-fallback';
      }
    } else audio = await fishTts(text, preset);
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', String(audio.length));
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-TTS-Provider', actualProvider);
    return response.status(200).send(audio);
  } catch (error) {
    const unavailable = error?.message === 'tts_not_configured';
    console.error('TTS request failed', error?.name || 'Error', error?.message || 'unknown');
    return response.status(unavailable ? 503 : 502).json({ error: unavailable ? 'tts_not_configured' : 'tts_unavailable' });
  }
}
