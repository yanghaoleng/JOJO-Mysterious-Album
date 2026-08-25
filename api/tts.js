const VOICES = {
  sprout: { referenceId: '57744207b298418194abd366d4596c8b', fishSpeed: 0.92, volcSpeed: 0.94 },
  bubble: { referenceId: '35e4dae87120478ea72d3eef6ff77ba0', fishSpeed: 1.08, volcSpeed: 1.08 },
  moss: { referenceId: '943fc7f50e6245dabb8362a7e9ceca0a', fishSpeed: 0.82, volcSpeed: 0.86 },
  star: { referenceId: '0fa0c39f8c8849a482db9da1586d1888', fishSpeed: 1.04, volcSpeed: 1 },
};

async function volcTts(text, preset) {
  const appId = process.env.VOLC_SPEECH_APP_ID;
  const accessToken = process.env.VOLC_SPEECH_ACCESS_TOKEN;
  const speaker = process.env.VOLC_TTS_SPEAKER_ID;
  if (!appId || !accessToken || !speaker) throw new Error('tts_not_configured');
  const upstream = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer; ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app: { appid: appId, token: 'access_token', cluster: 'volcano_tts' },
      user: { uid: 'kindergrimm-story' },
      audio: { voice_type: speaker, encoding: 'mp3', speed_ratio: preset.volcSpeed },
      request: { reqid: crypto.randomUUID(), text, operation: 'query' },
    }),
    signal: AbortSignal.timeout(45000),
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
    const audio = provider === 'volc' ? await volcTts(text, preset) : await fishTts(text, preset);
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', String(audio.length));
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-TTS-Provider', provider);
    return response.status(200).send(audio);
  } catch (error) {
    const unavailable = error?.message === 'tts_not_configured';
    console.error('TTS request failed', error?.name || 'Error', error?.message || 'unknown');
    return response.status(unavailable ? 503 : 502).json({ error: unavailable ? 'tts_not_configured' : 'tts_unavailable' });
  }
}
