const test = require('node:test');
const assert = require('node:assert');
const app = require('../server.js');

let server;
let baseUrl;

test.before(async () => {
  process.env.NODE_ENV = 'test';
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/open-jira deve retornar 400 se url não for informada', async () => {
  const response = await fetch(`${baseUrl}/api/open-jira`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  assert.strictEqual(response.status, 400);
  const data = await response.json();
  assert.strictEqual(data.error, 'URL do Jira inválida');
});

test('POST /api/open-jira deve retornar 400 se url não começar com http:// ou https://', async () => {
  const response = await fetch(`${baseUrl}/api/open-jira`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'javascript:alert(1)' })
  });

  assert.strictEqual(response.status, 400);
  const data = await response.json();
  assert.strictEqual(data.error, 'URL do Jira inválida');
});

test('POST /api/open-jira deve retornar 200 e mensagem de sucesso para URL válida com https', async () => {
  const response = await fetch(`${baseUrl}/api/open-jira`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/chamado-teste' })
  });

  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.message, 'Navegador iniciado com sucesso');
});

test('POST /api/open-jira deve retornar 200 e mensagem de sucesso para URL válida com http', async () => {
  const response = await fetch(`${baseUrl}/api/open-jira`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://localhost:8080/jira' })
  });

  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.message, 'Navegador iniciado com sucesso');
});
