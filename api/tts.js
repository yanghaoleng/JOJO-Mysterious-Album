const VOICES = {
  sprout: { referenceId: '57744207b298418194abd366d4596c8b', speed: 0.92 },
  bubble: { referenceId: '35e4dae87120478ea72d3eef6ff77ba0', speed: 1.08 },
  moss: { referenceId: '943fc7f50e6245dabb8362a7e9ceca0a', speed: 0.82 },
  star: { referenceId: '0fa0c39f8c8849a482db9da1586d1888', speed: 1.04 },
};

export const maxDuration = 90;

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' });
  const text = String(request.body?.text || '').trim().replace(/[<>]/g, '').slice(0, 120);
  const voice = VOICES[request.body?.voice] ? request.body.voice : 'star';
  if (!text) return response.status(400).json({ error: 'text_required' });

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return response.status(503).json({ error: 'tts_not_configured' });

  try {
    const preset = VOICES[voice];
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
        prosody: { speed: preset.speed, volume: 0, normalize_loudness: true },
      }),
      signal: AbortSignal.timeout(75000),
    });
    if (!upstream.ok) {
      console.error('Fish Audio upstream status', upstream.status);
      return response.status(502).json({ error: 'tts_upstream_error' });
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', String(audio.length));
    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).send(audio);
  } catch (error) {
    console.error('Fish Audio request failed', error?.name || 'Error', error?.message || 'unknown');
    return response.status(502).json({ error: 'tts_unavailable' });
  }
}
