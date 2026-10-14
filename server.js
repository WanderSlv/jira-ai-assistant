const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
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

app.post('/api/enhance', async (req, res) => {
  try {
    const { type, rawText, fields } = req.body || {};
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'rawText é obrigatório' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        titulo: `[${(fields && fields.Produto) || 'Geral'}] - ${rawText.slice(0, 50).trim()}...`,
        descricao: `Contexto:\n${rawText}\n\nProduto afetado: ${(fields && fields.Produto) || 'Geral'}\nCliente: ${(fields && fields.Cliente) || 'Nina'}`
      });
    }

    const prompt = `Você é um especialista em Jira e gerenciamento ágil de projetos de software.
Melhore o relato bruto abaixo para criar um chamado de alta qualidade no Jira.
Tipo de chamado: ${type || 'Bug'}
Campos/Metadados: ${JSON.stringify(fields || {})}
Relato bruto:
"""
${rawText}
"""

Instruções:
- Crie um título claro, conciso e profissional no formato "[Produto] - Resumo objetivo da ação ou problema".
- Crie uma descrição bem estruturada e limpa em texto/markdown, contendo:
  - Contexto / Objetivo
  - Passos para Reprodução (se aplicável ao tipo) ou Critérios de Aceite
  - Comportamento Esperado vs Obtido (se aplicável)
  - Informações Adicionais relevantes
- Responda OBRIGATORIAMENTE em formato JSON válido contendo exatamente as chaves:
{
  "titulo": "string",
  "descricao": "string"
}
Não inclua nenhum texto explicativo fora do bloco JSON.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro na API do Gemini:', errText);
      return res.json({
        titulo: `[${(fields && fields.Produto) || 'Geral'}] - ${rawText.slice(0, 50).trim()}...`,
        descricao: `Contexto:\n${rawText}\n\nProduto afetado: ${(fields && fields.Produto) || 'Geral'}\nCliente: ${(fields && fields.Cliente) || 'Nina'}`
      });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      try {
        const parsed = JSON.parse(candidateText);
        if (parsed.titulo && parsed.descricao) {
          return res.json({
            titulo: parsed.titulo,
            descricao: parsed.descricao
          });
        }
      } catch (parseErr) {
        const cleaned = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.titulo && parsed.descricao) {
          return res.json({
            titulo: parsed.titulo,
            descricao: parsed.descricao
          });
        }
      }
    }

    return res.json({
      titulo: `[${(fields && fields.Produto) || 'Geral'}] - ${rawText.slice(0, 50).trim()}...`,
      descricao: `Contexto:\n${rawText}\n\nProduto afetado: ${(fields && fields.Produto) || 'Geral'}\nCliente: ${(fields && fields.Cliente) || 'Nina'}`
    });
  } catch (err) {
    console.error('Erro no endpoint /api/enhance:', err);
    res.status(500).json({ error: 'Erro ao processar aprimoramento com IA' });
  }
});

app.post('/api/open-jira', (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return res.status(400).json({ error: 'URL do Jira inválida' });
  }

  // Tenta abrir com google-chrome com DevTools ativo
  try {
    const child = spawn('google-chrome', ['--auto-open-devtools-for-tabs', url], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    child.on('error', (err) => {
      console.warn('google-chrome não pôde ser iniciado, tentando xdg-open:', err.message);
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    });
    return res.json({ success: true, message: 'Navegador iniciado com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao iniciar navegador: ' + err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Jira Assistant rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
