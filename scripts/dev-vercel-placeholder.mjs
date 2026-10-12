import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

const MIME_BY_EXT = {
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

function safePublicFile(urlPathname) {
  const decoded = decodeURIComponent(urlPathname.split('?')[0]);
  if (!decoded.startsWith('/') || decoded.includes('..')) return null;
  const filePath = path.join(publicDir, decoded);
  const relative = path.relative(publicDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  return filePath;
}

const port = Number(process.env.PORT);
if (!Number.isFinite(port) || port <= 0) {
  console.error('dev-vercel-placeholder: PORT must be set by Vercel CLI');
  process.exit(1);
}

http
  .createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const filePath = safePublicFile(url.pathname);
    if (filePath) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end('P2P Calculator API dev — open http://localhost:5173 for the UI.\n');
  })
  .listen(port, '127.0.0.1');
