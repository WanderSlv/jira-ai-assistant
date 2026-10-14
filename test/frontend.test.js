const test = require('node:test');
const assert = require('node:assert');
const app = require('../server.js');

let server;
let baseUrl;

test.before(async () => {
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

test('GET / deve servir index.html com Tailwind e elementos da interface', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.strictEqual(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('Jira Script Generator'));
  assert.ok(html.includes('Copiar Código para o Console'));
  assert.ok(html.includes('Aprimorar com IA'));
  assert.ok(html.includes('script_generator.js'));
  assert.ok(html.includes('app.js'));
});

test('GET /styles.css deve retornar folha de estilos', async () => {
  const res = await fetch(`${baseUrl}/styles.css`);
  assert.strictEqual(res.status, 200);
  const css = await res.text();
  assert.ok(css.includes('glow-emerald'));
});

test('GET /script_generator.js deve retornar o gerador de scripts', async () => {
  const res = await fetch(`${baseUrl}/script_generator.js`);
  assert.strictEqual(res.status, 200);
  const js = await res.text();
  assert.ok(js.includes('generateJiraScript'));
});

test('GET /app.js deve retornar o script da aplicação', async () => {
  const res = await fetch(`${baseUrl}/app.js`);
  assert.strictEqual(res.status, 200);
  const js = await res.text();
  assert.ok(js.includes('handleEnhanceWithAI'));
});
