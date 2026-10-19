const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const { generateJiraScript, chunkString } = require('../public/script_generator.js');

test('chunkString divide texto longo em pedaços de até 50 caracteres', () => {
  const text = 'Esta é uma descrição longa que certamente deve ser quebrada em vários pedaços menores de até 50 caracteres para garantir que não haverá quebra de linha acidental.';
  const chunks = chunkString(text, 50);

  assert.ok(chunks.length > 1, 'Deve conter múltiplos pedaços');
  for (const chunkJson of chunks) {
    const raw = JSON.parse(chunkJson);
    assert.ok(raw.length <= 50, `Cada pedaço deve ter no máximo 50 caracteres (tamanho: ${raw.length})`);
  }

  // A junção de todos os pedaços deve reconstruir exatamente o texto original
  const reconstructed = chunks.map(c => JSON.parse(c)).join('');
  assert.strictEqual(reconstructed, text);
});

test('chunkString lida com strings vazias ou nulas com segurança', () => {
  const empty = chunkString('');
  assert.strictEqual(empty.length, 1);
  assert.strictEqual(JSON.parse(empty[0]), '');

  const nullVal = chunkString(null);
  assert.strictEqual(nullVal.length, 1);
  assert.strictEqual(JSON.parse(nullVal[0]), '');
});

test('generateJiraScript gera script com sintaxe JavaScript válida', () => {
  const script = generateJiraScript({
    titulo: '[Agendar Tarefa] - Erro de integração no fluxo',
    descricao: 'Contexto:\nTentando agendar tarefa no fluxo.\n\nPassos:\n1. Abrir tela\n2. Clicar no botão\n\nEsperado: sucesso.\nObtido: erro.',
    fields: {
      Cliente: 'Nina',
      Produto: 'ninachat',
      Prioridade: 'Baixa',
      Representante: 'Wander',
      NumeroChamado: '-'
    }
  });

  assert.ok(typeof script === 'string');
  assert.ok(script.includes('=== PREENCHIMENTO AUTOMÁTICO JIRA ==='));
  assert.ok(script.includes('simularCliqueReal'));
  assert.ok(script.includes('"pointerdown", "mousedown", "pointerup", "mouseup", "click"'));
  assert.ok(script.includes('ninachat'));
  assert.ok(script.includes('Baixa'));
  assert.ok(script.includes('Nina'));
  assert.ok(script.includes('Wander'));
  assert.ok(script.includes('pedacosDescricao'));
  assert.ok(script.includes('NUNCA clica em Enviar'));

  // Testa se a sintaxe é 100% válida no motor V8 do Node
  assert.doesNotThrow(() => {
    new vm.Script(script);
  }, 'O script gerado deve ter sintaxe JavaScript válida');
});

test('generateJiraScript lida com caracteres especiais, aspas e quebras de linha', () => {
  const script = generateJiraScript({
    titulo: 'Bug com "aspas duplas", \'aspas simples\' e `crases` & símbolos <tag>',
    descricao: 'Linha 1\nLinha 2 com "aspas" e \\ barra invertida\nLinha 3 com emoji 🐛 e acentuação: Ação, Configuração.',
    fields: {
      Cliente: 'Nina "Cliente"',
      Produto: 'ninachat',
      Prioridade: 'Baixa',
      Representante: 'Wander',
      NumeroChamado: 'CH-123/45'
    }
  });

  assert.doesNotThrow(() => {
    new vm.Script(script);
  }, 'O script gerado com caracteres especiais deve ter sintaxe JavaScript válida');
});

test('extractFieldsFromRawText extrai corretamente cliente, produto e numero de chamado por rótulos', () => {
  const { extractFieldsFromRawText } = require('../public/script_generator.js');
  const text = `
    Cliente: Hospital Santa Maria
    Produto: NinaFlow
    Chamado: #98432
    O fluxo de atendimento trava ao clicar em prosseguir.
  `;
  const result = extractFieldsFromRawText(text);
  assert.strictEqual(result.cliente, 'Hospital Santa Maria');
  assert.strictEqual(result.produto, 'NinaFlow');
  assert.strictEqual(result.numeroChamado, '98432');
  assert.strictEqual(result.representante, 'Wander');
});

test('extractFieldsFromRawText extrai corretamente a partir de texto corrido em linguagem natural', () => {
  const { extractFieldsFromRawText } = require('../public/script_generator.js');
  const text = 'Identificado bug no chamado 45120 do cliente Unimed no ninachat ao enviar template.';
  const result = extractFieldsFromRawText(text);
  assert.strictEqual(result.cliente, 'Unimed');
  assert.strictEqual(result.produto, 'ninachat');
  assert.strictEqual(result.numeroChamado, '45120');
  assert.strictEqual(result.representante, 'Wander');
});

test('extractFieldsFromRawText garante que o representante é sempre Wander mesmo sem outros campos', () => {
  const { extractFieldsFromRawText } = require('../public/script_generator.js');
  const result = extractFieldsFromRawText('Apenas uma explicação de erro qualquer sem metadados');
  assert.strictEqual(result.cliente, undefined);
  assert.strictEqual(result.produto, undefined);
  assert.strictEqual(result.numeroChamado, undefined);
  assert.strictEqual(result.representante, 'Wander');
});

test('extractFieldsFromRawText ignora palavras comuns como aberto/fechado para número de chamado', () => {
  const { extractFieldsFromRawText } = require('../public/script_generator.js');
  const result = extractFieldsFromRawText('Chamado aberto para verificação do sistema');
  assert.strictEqual(result.numeroChamado, undefined);
  assert.strictEqual(result.representante, 'Wander');
});

test('markdownToHtml converte negrito, itálico, código inline e blocos de código para HTML compatível com Jira', () => {
  const { markdownToHtml } = require('../public/script_generator.js');
  const md = '**Importante:** Ocorreu um erro no bloco `agendar_tarefa`.\n\n```json\n{"status": "erro"}\n```';
  const html = markdownToHtml(md);

  assert.ok(html.includes('<strong>Importante:</strong>'), 'Deve converter **texto** para <strong>');
  assert.ok(html.includes('<code>agendar_tarefa</code>'), 'Deve converter `código` para <code>');
  assert.ok(html.includes('<pre><code>'), 'Deve converter ```code``` para <pre><code>');
  assert.ok(html.includes('{"status": "erro"}'));
});

test('markdownToHtml converte listas com marcadores e listas ordenadas para <ul> e <ol>', () => {
  const { markdownToHtml } = require('../public/script_generator.js');
  const md = 'Passos para reproduzir:\n1. Acessar o módulo\n2. Clicar em salvar\n\nItens afetados:\n- Fila\n- Mensagem';
  const html = markdownToHtml(md);

  assert.ok(html.includes('<ol>'), 'Deve conter <ol>');
  assert.ok(html.includes('<li>Acessar o módulo</li>'));
  assert.ok(html.includes('<li>Clicar em salvar</li>'));
  assert.ok(html.includes('</ol>'));
  assert.ok(html.includes('<ul>'), 'Deve conter <ul>');
  assert.ok(html.includes('<li>Fila</li>'));
  assert.ok(html.includes('<li>Mensagem</li>'));
  assert.ok(html.includes('</ul>'));
});

test('htmlToMarkdown converte tags HTML de volta para Markdown limpo', () => {
  const { htmlToMarkdown } = require('../public/script_generator.js');
  const html = '<p><strong>Atenção:</strong> Ocorreu erro no <b>botão</b>.</p>' +
               '<p>Use o método <code>fetch()</code>.</p>' +
               '<pre><code>const a = 10;</code></pre>' +
               '<ol><li>Passo um</li><li>Passo dois</li></ol>' +
               '<ul><li>Item A</li><li>Item B</li></ul>';
  const md = htmlToMarkdown(html);

  assert.ok(md.includes('**Atenção:**'));
  assert.ok(md.includes('**botão**'));
  assert.ok(md.includes('`fetch()`'));
  assert.ok(md.includes('```\nconst a = 10;\n```'));
  assert.ok(md.includes('1. Passo um'));
  assert.ok(md.includes('2. Passo dois'));
  assert.ok(md.includes('- Item A'));
  assert.ok(md.includes('- Item B'));
});

test('markdownToHtml converte sintaxe de imagem ![alt](url) para tag <img>', () => {
  const { markdownToHtml } = require('../public/script_generator.js');
  const md = 'Visualização do erro na tela:\n![print_erro.png](data:image/png;base64,iVBORw0KGgo=)';
  const html = markdownToHtml(md);

  assert.ok(html.includes('<img src="data:image/png;base64,iVBORw0KGgo=" alt="print_erro.png"'));
});

test('htmlToMarkdown converte tags <img> de volta para ![alt](url)', () => {
  const { htmlToMarkdown } = require('../public/script_generator.js');
  const html = '<p>Print de evidência:</p><p><img src="data:image/png;base64,iVBORw0KGgo=" alt="evidencia.png" /></p>';
  const md = htmlToMarkdown(html);

  assert.ok(md.includes('![evidencia.png](data:image/png;base64,iVBORw0KGgo=)'));
});

test('generateJiraScript com array de imagens inclui anexarImagensNoJira e valida no V8', () => {
  const { generateJiraScript } = require('../public/script_generator.js');
  const script = generateJiraScript({
    titulo: '[ninachat] - Erro de renderização',
    descricao: 'Contexto do chamado',
    fields: { Cliente: 'Nina', Produto: 'ninachat', Prioridade: 'Baixo', Representante: 'Wander', NumeroChamado: '-' },
    images: [
      { name: 'print_modal.png', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
    ]
  });

  assert.ok(script.includes('anexarImagensNoJira'));
  assert.ok(script.includes('print_modal.png'));
  assert.ok(script.includes('listaEvidencias'));

  // Validação no V8
  assert.doesNotThrow(() => {
    new vm.Script(script);
  });
});

