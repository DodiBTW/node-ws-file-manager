const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const http = require('http');

let httpServer, wsServer;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startServer(cmd, args, readyText) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', args, { cwd: process.cwd() });
    const onData = data => {
      if (data.toString().includes(readyText)) resolve(proc);
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
  });
}

async function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

before(async () => {
  wsServer = await startServer('node', ['src/server/websocket.js'], 'WebSocket server started');
  httpServer = await startServer('node', ['src/server/server.js'], 'Serveur démarré');
  await wait(500); // Give servers a moment to be ready
});

after(() => {
  if (httpServer) httpServer.kill();
  if (wsServer) wsServer.kill();
});

test('Login with valid credentials', async () => {
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'alice', password: 'password123' }));

  assert.strictEqual(res.status, 200);
  const body = JSON.parse(res.data);
  assert.ok(body.token);
});

test('Upload and list file', async () => {
  const loginRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'alice', password: 'password123' }));
  const token = JSON.parse(loginRes.data).token;

  const uploadRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/upload',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ token, filename: 'test.txt', content: Buffer.from('hello').toString('base64') }));

  assert.strictEqual(uploadRes.status, 200);

  const listRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/files',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });

  assert.strictEqual(listRes.status, 200);
  const files = JSON.parse(listRes.data);
  assert.ok(files.some(f => f.name === 'test.txt'));
});

test('Delete file', async () => {
  const loginRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'alice', password: 'password123' }));
  const token = JSON.parse(loginRes.data).token;

  const delRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/files/test.txt',
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });

  assert.strictEqual(delRes.status, 204);
});

test('Compress directory', async () => {
  const loginRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'alice', password: 'password123' }));
  const token = JSON.parse(loginRes.data).token;

  const compressRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/compress',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ token }));

  assert.strictEqual(compressRes.status, 200);
  const body = JSON.parse(compressRes.data);
  assert.ok(body.archive);
});