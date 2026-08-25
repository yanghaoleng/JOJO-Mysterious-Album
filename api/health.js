export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'method_not_allowed' });

  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json({
    ok: true,
    ai: Boolean(process.env.ARK_API_KEY),
    fish: Boolean(process.env.FISH_AUDIO_API_KEY),
    storyAi: Boolean(process.env.ARK_API_KEY),
    speechRecognition: Boolean(
      process.env.VOLC_SPEECH_APP_ID
      && process.env.VOLC_SPEECH_ACCESS_TOKEN
      && process.env.VOLC_SPEECH_RESOURCE_ID
    ),
    doubaoTts: Boolean(
      process.env.VOLC_SPEECH_APP_ID
      && process.env.VOLC_SPEECH_ACCESS_TOKEN
      && process.env.VOLC_TTS_SPEAKER_ID
    ),
    petTtsProvider: process.env.PET_TTS_PROVIDER || 'fish',
    aiModel: process.env.ARK_LLM_MODEL || 'doubao-seed-2-0-mini-260428',
    imageModel: process.env.ARK_IMAGE_MODEL || 'doubao-seedream-5-0-lite-260128',
    imageSize: process.env.ARK_IMAGE_SIZE || '4K',
    voice: 169,
  });
}
