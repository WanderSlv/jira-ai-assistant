const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const app = require('../server.js');

let server;
let baseUrl;
const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
const ENV_FILE = path.join(__dirname, '..', '.env');
let originalEnvContent = null;

test.before(async () => {
  if (fs.existsSync(ENV_FILE)) {
    originalEnvContent = fs.readFileSync(ENV_FILE, 'utf8');
  }
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
  if (originalModel !== undefined) {
    process.env.GEMINI_MODEL = originalModel;
  }
  if (originalEnvContent !== null) {
    fs.writeFileSync(ENV_FILE, originalEnvContent, 'utf8');
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

test('POST /api/enhance extrai produto, cliente e número de chamado da explicação bruta e fixa representante Wander', async () => {
  const payload = {
    type: 'bug',
    rawText: 'Cliente: Hospital Alvorada\nProduto: NinaFlow\nChamado: #77881\nErro na fila de disparo.'
  };

  const response = await fetch(`${baseUrl}/api/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.fields.Cliente, 'Hospital Alvorada');
  assert.strictEqual(data.fields.Produto, 'NinaFlow');
  assert.strictEqual(data.fields.NumeroChamado, '77881');
  assert.strictEqual(data.fields.Representante, 'Wander');
  assert.strictEqual(data.detectedFields.Cliente, 'Hospital Alvorada');
  assert.strictEqual(data.detectedFields.Produto, 'NinaFlow');
  assert.strictEqual(data.detectedFields.NumeroChamado, '77881');
  assert.strictEqual(data.detectedFields.Representante, 'Wander');
  assert.ok(data.titulo.startsWith('[NinaFlow]'));
});

test('GET e POST /api/config gerenciam modelo e chave do Gemini com segurança', async () => {
  const resGet = await fetch(`${baseUrl}/api/config`);
  assert.strictEqual(resGet.status, 200);
  const dataGet = await resGet.json();
  assert.ok('hasGeminiKey' in dataGet);

  const resPost = await fetch(`${baseUrl}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      geminiApiKey: 'AIzaSyFakeKeyForTest123456789',
      geminiModel: 'gemini-2.0-flash'
    })
  });
  assert.strictEqual(resPost.status, 200);
  const dataPost = await resPost.json();
  assert.strictEqual(dataPost.hasGeminiKey, true);
  assert.strictEqual(dataPost.maskedKey.startsWith('AIzaSy'), true);
  assert.strictEqual(dataPost.geminiModel, 'gemini-2.0-flash');
  delete process.env.GEMINI_API_KEY;
});

test('POST /api/test-google-key valida chave ausente com 400', async () => {
  const response = await fetch(`${baseUrl}/api/test-google-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: '' })
  });
  assert.strictEqual(response.status, 400);
  const data = await response.json();
  assert.strictEqual(data.valid, false);
});

test('POST /api/enhance aceita evidências de imagens (prints em base64) no fallback e processamento', async () => {
  const fakePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const payload = {
    type: 'bug',
    rawText: 'Erro exibido na tela ao salvar formulário',
    images: [fakePngBase64]
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
  assert.ok(data.descricao.includes('📸 Evidências & Prints'), 'Deve incluir seção de evidências na descrição do card');
  assert.ok(data.descricao.includes('1 print(s)'), 'Deve indicar a quantidade de prints anexados');
  assert.strictEqual(data.fields.Representante, 'Wander');
});
