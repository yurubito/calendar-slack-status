import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const html = await readFile('preview/index.html');
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(4173, '127.0.0.1', () =>
  console.log('Preview: http://127.0.0.1:4173 (offline; Ctrl+C to stop)'),
);
