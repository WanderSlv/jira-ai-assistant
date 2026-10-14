const test = require('node:test');
const assert = require('node:assert');
const app = require('../server.js');

let server;
let baseUrl;
const originalApiKey = process.env.GEMINI_API_KEY;

test.before(async () => {
  // Garantir que a chave está vazia para testar o fallback local
  process.env.NODE_ENV = 'test';
  delete process.env.GEMINI_API_KEY;
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (originalApiKey !== undefined) {
    process.env.GEMINI_API_KEY = originalApiKey;
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/enhance deve retornar 400 se rawText não for fornecido', async () => {
  const response = await fetch(`${baseUrl}/api/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'bug' })
  });

  assert.strictEqual(response.status, 400);
  const data = await response.json();
  assert.ok(data.error);
  assert.match(data.error, /rawText/i);
});

test('POST /api/enhance deve retornar fallback local quando não há GEMINI_API_KEY', async () => {
  const payload = {
    type: 'bug',
    rawText: 'Bot travando no fluxo de autenticação ao digitar CPF inválido',
    fields: {
      Produto: 'ninachat',
      Cliente: 'Nina'
    }
  };

  const response = await fetch(`${baseUrl}/api/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.ok(data.titulo);
  assert.ok(data.descricao);
  assert.ok(data.titulo.startsWith('[ninachat]'));
  assert.ok(data.descricao.includes('Bot travando no fluxo de autenticação'));
  assert.ok(data.descricao.includes('ninachat'));
  assert.ok(data.descricao.includes('Nina'));
});

test('POST /api/enhance fallback deve lidar com campos ausentes usando valores padrão', async () => {
  const payload = {
    type: 'melhoria',
    rawText: 'Adicionar exportação em CSV na listagem de atendimentos'
  };

  const response = await fetch(`${baseUrl}/api/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.ok(data.titulo.startsWith('[Geral]'));
  assert.ok(data.descricao.includes('Contexto:'));
  assert.ok(data.descricao.includes('Adicionar exportação em CSV'));
  assert.ok(data.descricao.includes('Nina'));
});
