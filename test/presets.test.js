const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('presets.json deve ser um JSON válido com preset bug', () => {
  const filePath = path.join(__dirname, '..', 'presets.json');
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.ok(content.presets.bug);
  assert.strictEqual(content.presets.bug.defaultFields.Cliente, 'Nina');
  assert.strictEqual(content.presets.bug.defaultFields.Produto, 'ninachat');
});
