import { gzipSync, gunzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

export const maxDuration = 60;

function header(messageType, flags = 0, serialization = 1, compression = 1) {
  return Buffer.from([0x11, (messageType << 4) | flags, (serialization << 4) | compression, 0]);
}

function fullRequest(payload, sequence = 1) {
  const body = gzipSync(Buffer.from(JSON.stringify(payload)));
  const prefix = Buffer.alloc(8);
  prefix.writeInt32BE(sequence, 0);
  prefix.writeUInt32BE(body.length, 4);
  return Buffer.concat([header(0x1, 0x1), prefix, body]);
}

function audioRequest(audio, sequence, final = false) {
  const prefix = Buffer.alloc(8);
  prefix.writeInt32BE(final ? -Math.abs(sequence) : sequence, 0);
  prefix.writeUInt32BE(audio.length, 4);
  return Buffer.concat([header(0x2, final ? 0x3 : 0x1, 0, 0), prefix, audio]);
}

function parseResponse(raw) {
  const message = Buffer.from(raw);
  if (message.length < 4) throw new Error('asr_short_response');
  const headerBytes = (message[0] & 0x0f) * 4;
  const messageType = message[1] >> 4;
  const flags = message[1] & 0x0f;
  const serialization = message[2] >> 4;
  const compression = message[2] & 0x0f;
  let payload = message.subarray(headerBytes);
  const result = { last: Boolean(flags & 0x2) };
  if (flags & 0x1) {
    const sequence = payload.readInt32BE(0);
    result.last ||= sequence < 0;
    payload = payload.subarray(4);
  }
  let body;
  if (messageType === 0x9) {
    const size = payload.readUInt32BE(0);
    body = payload.subarray(4, 4 + size);
  } else if (messageType === 0xb) {
    if (payload.length >= 4) {
      const sequence = payload.readInt32BE(0);
      result.last ||= sequence < 0;
      payload = payload.subarray(4);
    }
    if (payload.length >= 4) {
      const size = payload.readUInt32BE(0);
      body = payload.subarray(4, 4 + size);
    }
  } else if (messageType === 0xf) {
    result.code = payload.readUInt32BE(0);
    const size = payload.readUInt32BE(4);
    body = payload.subarray(8, 8 + size);
  }
  if (body) {
    if (compression === 1) body = gunzipSync(body);
    result.message = serialization === 1 ? JSON.parse(body.toString('utf8')) : body;
  }
  return result;
}

function extractText(value) {
  if (Array.isArray(value)) return value.map(extractText).join('');
  if (!value || typeof value !== 'object') return '';
  for (const key of ['text', 'Text', 'transcript', 'Transcript']) {
    if (value[key]) return String(value[key]);
  }
  for (const key of ['result', 'Result', 'utterances', 'Utterances', 'message']) {
    const text = extractText(value[key]);
    if (text) return text;
  }
  return '';
}

function transcribePcm(pcm) {
  const appId = process.env.VOLC_SPEECH_APP_ID;
  const accessToken = process.env.VOLC_SPEECH_ACCESS_TOKEN;
  const resourceId = process.env.VOLC_SPEECH_RESOURCE_ID;
  if (!appId || !accessToken || !resourceId) throw new Error('asr_not_configured');
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      process.env.VOLC_SPEECH_ENDPOINT || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream',
      {
        perMessageDeflate: false,
        headers: {
          'X-Api-App-Key': appId,
          'X-Api-Access-Key': accessToken,
          'X-Api-Resource-Id': resourceId,
          'X-Api-Request-Id': randomUUID(),
        },
      },
    );
    let transcript = '';
    let settled = false;
    const finish = (error, value = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* already closed */ }
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('asr_timeout')), 30000);
    socket.on('open', () => {
      socket.send(fullRequest({
        user: { uid: 'kindergrimm-story' },
        audio: { format: 'pcm', codec: 'raw', rate: 16000, bits: 16, channel: 1 },
        request: { model_name: 'bigmodel', enable_itn: true, enable_punc: true, result_type: 'full' },
      }));
      let sequence = 1;
      for (let offset = 0; offset < pcm.length; offset += 3200) {
        sequence += 1;
        socket.send(audioRequest(pcm.subarray(offset, offset + 3200), sequence));
      }
      sequence += 1;
      socket.send(audioRequest(Buffer.alloc(0), sequence, true));
    });
    socket.on('message', raw => {
      try {
        const result = parseResponse(raw);
        if (result.code) return finish(new Error(`asr_upstream_${result.code}`));
        transcript = extractText(result.message) || transcript;
        if (result.last) finish(null, transcript.trim());
      } catch (error) {
        finish(error);
      }
    });
    socket.on('error', error => finish(error));
    socket.on('close', () => {
      if (!settled) finish(transcript ? null : new Error('asr_closed'), transcript.trim());
    });
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' });
  const encoded = typeof request.body?.pcm === 'string' ? request.body.pcm : '';
  if (!encoded || encoded.length > 1_300_000) return response.status(400).json({ error: 'audio_invalid' });
  const pcm = Buffer.from(encoded, 'base64');
  if (pcm.length < 1600 || pcm.length > 960000) return response.status(400).json({ error: 'audio_invalid' });
  try {
    const transcript = await transcribePcm(pcm);
    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ transcript, provider: 'volc' });
  } catch (error) {
    const unavailable = error?.message === 'asr_not_configured';
    console.error('ASR request failed', error?.name || 'Error', unavailable ? 'not_configured' : 'upstream_error');
    return response.status(unavailable ? 503 : 502).json({ error: unavailable ? 'asr_not_configured' : 'asr_unavailable' });
  }
}
