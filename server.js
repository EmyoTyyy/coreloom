// EmyoT.Fun static server. Zero dependencies. Serves site/ the way Pages does.
// Usage: node server.js [port]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const PORT = Number(process.argv[2] || process.env.PORT || 7331);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

const send = (res, code, body, type = 'text/plain; charset=utf-8') =>
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-cache' }).end(body);

const serveFile = (res, filePath) => {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, '404 not found');
    return send(res, 200, data, MIME[path.extname(filePath)] || 'application/octet-stream');
  });
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'forbidden');

  // Mirror GitHub Pages: a directory serves its index.html, and a directory
  // requested without a trailing slash redirects so that relative asset paths
  // inside the page resolve against the directory rather than its parent.
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      if (!urlPath.endsWith('/')) {
        res.writeHead(301, { location: `${urlPath}/` }).end();
        return;
      }
      return serveFile(res, path.join(filePath, 'index.html'));
    }
    return serveFile(res, filePath);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  port ${PORT} is already in use. Try: node server.js ${PORT + 1}\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`\n  CORELOOM running -> http://localhost:${PORT}\n`);
});
