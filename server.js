const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PRESETS_FILE = path.join(__dirname, 'presets.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/presets', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler presets' });
  }
});

app.post('/api/presets', (req, res) => {
  try {
    const { key, preset } = req.body;
    if (!key || !preset) {
      return res.status(400).json({ error: 'Chave e dados do preset são obrigatórios' });
    }
    const data = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    data.presets[key] = preset;
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, presets: data.presets });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar preset' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Jira Assistant rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
