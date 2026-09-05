// Optional local UI verification with the existing, explicitly selected API.
// DEV_API_BASE=https://jma.mikeywa.site node dev/tools/preview.mjs 8914
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const apiBase = process.env.DEV_API_BASE;
const apiPaths = new Set(['/api/tts', '/api/asr', '/api/story-turn', '/api/moon-director']);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'POST' && apiPaths.has(url.pathname) && apiBase) {
      const chunks = []; let bytes = 0;
      for await (const chunk of request) { bytes += chunk.length; if (bytes > 1500000) throw new Error('Too large'); chunks.push(chunk); }
      const upstream = await fetch(new URL(url.pathname, apiBase), { method: 'POST', body: Buffer.concat(chunks), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(35000) });
      response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' });
      response.end(Buffer.from(await upstream.arrayBuffer())); return;
    }
    if (request.method !== 'GET' || !(url.pathname.startsWith('/dev/') || url.pathname.startsWith('/vendor/') || url.pathname === '/favicon.ico')) { response.writeHead(404); response.end(); return; }
    const name = decodeURIComponent(url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname);
    const path = resolve(root, `.${name}`);
    if (!path.startsWith(root + '/') || name.split('/').some(part => part.startsWith('.'))) throw new Error('Invalid path');
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data);
  } catch { response.writeHead(502); response.end('Preview request unavailable'); }
}).listen(Number(process.argv[2] || 8914), '127.0.0.1', () => console.log('Isolated /dev preview ready; API forwarding:', apiBase || 'off'));
