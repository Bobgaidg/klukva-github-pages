// Local static preview with a repository prefix, like GitHub Pages. No packages needed.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const prefix = '/klukva-github-pages/';
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') { res.writeHead(302, { Location: prefix }).end(); return; }
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end('Not found'); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const parts = relative.split(/[\\/]/);
    const target = path.resolve(root, relative);
    if (parts.some((p) => p.startsWith('.')) || !target.startsWith(root)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404).end('Not found'); }
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${prefix}`));
