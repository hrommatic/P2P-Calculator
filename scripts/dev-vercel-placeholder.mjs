import http from 'http';

const port = Number(process.env.PORT);
if (!Number.isFinite(port) || port <= 0) {
  console.error('dev-vercel-placeholder: PORT must be set by Vercel CLI');
  process.exit(1);
}

http
  .createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('P2P Calculator API dev — open http://localhost:5173 for the UI.\n');
  })
  .listen(port, '127.0.0.1');
