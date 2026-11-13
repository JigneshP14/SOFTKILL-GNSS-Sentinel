/**
 * GNSS SENTINEL - Local Telemetry & Defense Server
 * 
 * Zero-dependency native Node.js server.
 * Run with: node server.js
 * Opens at: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  // API endpoint for health / telemetry check
  if (reqUrl === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      platform: 'GNSS SENTINEL',
      time: new Date().toISOString(),
      webSerialSupported: true
    }));
    return;
  }

  const filePath = path.join(PUBLIC_DIR, reqUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('\n=============================================================');
  console.log('   ✈ DATAV // GNSS SENTINEL TELEMETRY & DEFENSE SERVER     ');
  console.log('=============================================================');
  console.log(`[INFO] Server running live at: http://localhost:${PORT}`);
  console.log('[INFO] WebSerial direct link enabled for ESP32 USB COM ports.');
  console.log('[INFO] Serving files from:', PUBLIC_DIR);
  console.log('=============================================================\n');
});

