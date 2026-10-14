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
