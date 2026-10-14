const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PRESETS_FILE = path.join(__dirname, 'presets.json');
const ENV_FILE = path.join(__dirname, '.env');

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

app.get('/api/config', (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const maskedKey = hasGemini ? (process.env.GEMINI_API_KEY.slice(0, 6) + '...' + process.env.GEMINI_API_KEY.slice(-4)) : '';
  res.json({
    hasGeminiKey: hasGemini,
    maskedKey: maskedKey,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    activeProvider: hasGemini ? 'gemini' : 'ollama'
  });
});

app.post('/api/test-google-key', async (req, res) => {
  try {
    const { apiKey, model = 'gemini-3.8-flash' } = req.body || {};
    const key = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(400).json({ valid: false, error: 'Chave da API do Google não informada' });
    }

    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const testResp = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Responda apenas: OK' }] }]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!testResp.ok) {
      const errText = await testResp.text();
      let msg = `Erro HTTP ${testResp.status}`;
      try {
        const errObj = JSON.parse(errText);
        msg = errObj.error?.message || msg;
      } catch (e) {}
      return res.status(400).json({ valid: false, error: msg });
    }

    return res.json({
      valid: true,
      model,
      message: `Chave autenticada com sucesso no modelo Google (${model})!`
    });
  } catch (err) {
    return res.status(500).json({ valid: false, error: 'Falha de conexão com o Google: ' + err.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const { geminiApiKey, geminiModel, providerPreference } = req.body || {};

    if (geminiApiKey !== undefined) {
      const keyVal = geminiApiKey.trim();
      process.env.GEMINI_API_KEY = keyVal;

      let envContent = '';
      if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');
        if (envContent.includes('GEMINI_API_KEY=')) {
          envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${keyVal}`);
        } else {
          envContent += `\nGEMINI_API_KEY=${keyVal}`;
        }
      } else {
        envContent = `PORT=3000\nGEMINI_API_KEY=${keyVal}\n`;
      }

      if (geminiModel) {
        process.env.GEMINI_MODEL = geminiModel.trim();
        if (envContent.includes('GEMINI_MODEL=')) {
          envContent = envContent.replace(/GEMINI_MODEL=.*/g, `GEMINI_MODEL=${geminiModel.trim()}`);
        } else {
          envContent += `\nGEMINI_MODEL=${geminiModel.trim()}`;
        }
      }

      fs.writeFileSync(ENV_FILE, envContent.trim() + '\n', 'utf8');
    }

    if (geminiModel && !geminiApiKey) {
      process.env.GEMINI_MODEL = geminiModel.trim();
    }

    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    const maskedKey = hasGemini ? (process.env.GEMINI_API_KEY.slice(0, 6) + '...' + process.env.GEMINI_API_KEY.slice(-4)) : '';

    res.json({
      success: true,
      hasGeminiKey: hasGemini,
      maskedKey: maskedKey,
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      activeProvider: (providerPreference === 'ollama' || !hasGemini) ? 'ollama' : 'gemini'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configuração: ' + err.message });
  }
});

function formatDescricao(desc) {
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object' && desc !== null) {
    return Object.entries(desc).map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        const sub = Object.entries(v).map(([sk, sv]) => `${sk}: ${sv}`).join('\n');
        return `${k}\n${sub}`;
      }
      return `${k}\n${v}`;
    }).join('\n\n');
  }
  return String(desc);
}

function buildNinaPrompt(type, rawText, fields) {
  const produto = (fields && fields.Produto) || 'NinaChat';
  const cliente = (fields && fields.Cliente) || 'Nina';
  const prioridade = (fields && fields.Prioridade) || 'Baixo';

  if (type === 'feature') {
    return `Você é o Product Manager sênior da Nina Tecnologia.
Analise a solicitação bruta e crie um chamado técnico no Jira seguindo o padrão oficial da Nina Tecnologia:

Solicitação do usuário:
"""
${rawText}
"""

Produto: ${produto}
Cliente: ${cliente}

Responda ESTRITAMENTE em formato JSON com:
{
  "titulo": "[${produto}] - Resumo claro e objetivo da funcionalidade",
  "descricao": "🎯 Objetivo / Motivação\\n(Explicação clara do porquê da funcionalidade e do valor para o usuário/cliente)\\n\\n📋 Especificação da Feature\\n(Detalhamento do fluxo, regras de negócio e como deve se comportar)\\n\\n✅ Critérios de Aceite\\n- [ ] Critério 1\\n- [ ] Critério 2\\n\\n🧑‍💻 Observações Técnicas\\n(Impactos na API, frontend ou integrações)"
}`;
  }

  // Padrão oficial de Bugs da Nina Tecnologia
  return `Você é o Engenheiro de QA e Software sênior da Nina Tecnologia.
Analise a explicação bruta do usuário e construa um chamado de alta qualidade no Jira, seguindo rigorosamente a estrutura oficial do card de bugs da Nina Tecnologia.

NÃO repita apenas a mensagem do usuário: analise o problema tecnicamente, estruture o cenário e deduza os passos de reprodução.

Explicação bruta do usuário:
"""
${rawText}
"""

Metadados:
- Produto afetado: ${produto}
- Cliente: ${cliente}
- Prioridade: ${prioridade}

Responda ESTRITAMENTE em formato JSON com:
{
  "titulo": "[${produto}] - Resumo claro e objetivo do problema",
  "descricao": "📜 História & Contexto\\n(Explique o cenário do bug, o objetivo da ação do usuário e o impacto negativo)\\n\\n🪲 Reprodução do bug\\n1. Passo um (ação inicial no sistema)\\n2. Passo dois (ação do usuário)\\n3. Passo três (ocorrência da falha)\\n\\n❌ Comportamento Atual\\n(O que aconteceu de errado)\\n\\n✅ Comportamento Esperado\\n(O que deveria ter acontecido)\\n\\n🧑‍💻 Análise Técnica\\n(Hipóteses técnicas, comportamento de interface, requisições de rede ou validações)"
}`;
}

async function callOllama(prompt) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder:latest',
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
        num_predict: 600
      }
    }),
    signal: AbortSignal.timeout(180000)
  });

  if (!response.ok) {
    throw new Error(`Ollama retornou status ${response.status}`);
  }

  const data = await response.json();
  const rawParsed = JSON.parse(data.response);
  return {
    titulo: rawParsed.titulo || rawParsed.title,
    descricao: formatDescricao(rawParsed.descricao || rawParsed.description)
  };
}

async function callGemini(apiKey, prompt, model) {
  const chosenModel = model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google Gemini (${chosenModel}) retornou status ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Google Gemini não retornou texto na resposta');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (pe) {
    const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    parsed = JSON.parse(cleaned);
  }

  return {
    titulo: parsed.titulo || parsed.title,
    descricao: formatDescricao(parsed.descricao || parsed.description),
    provider: 'gemini',
    model: chosenModel
  };
}

app.post('/api/enhance', async (req, res) => {
  try {
    const { type, rawText, fields, customApiKey, customModel, providerPreference } = req.body || {};
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'rawText é obrigatório' });
    }

    const prod = (fields && fields.Produto) || 'Geral';
    const cli = (fields && fields.Cliente) || 'Nina';

    // Em ambiente de teste automatizado sem chave, usa fallback rápido imediato
    if (process.env.NODE_ENV === 'test' && !process.env.GEMINI_API_KEY && !customApiKey) {
      return res.json({
        titulo: `[${prod}] - ${rawText.slice(0, 50).trim()}...`,
        descricao: `Contexto:\n${rawText}\n\nProduto afetado: ${prod}\nCliente: ${cli}`,
        provider: 'fallback'
      });
    }

    const prompt = buildNinaPrompt(type, rawText, fields);
    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
    const model = (customModel && customModel.trim()) || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    // 1. Se houver chave Gemini e não for forçado apenas Ollama
    if (apiKey && providerPreference !== 'ollama') {
      try {
        console.log(`🤖 Processando com Google Gemini (${model})...`);
        const result = await callGemini(apiKey, prompt, model);
        if (result.titulo && result.descricao) {
          return res.json(result);
        }
      } catch (geminiErr) {
        console.warn('Falha no Gemini, tentando Ollama local:', geminiErr.message);
      }
    }

    // 2. Tenta Ollama local (qwen2.5-coder)
    try {
      console.log('🤖 Processando com Ollama local (qwen2.5-coder)...');
      const result = await callOllama(prompt);
      if (result.titulo && result.descricao) {
        return res.json({
          ...result,
          provider: 'ollama',
          model: 'qwen2.5-coder:latest'
        });
      }
    } catch (ollamaErr) {
      console.warn('Ollama indisponível ou falhou:', ollamaErr.message);
    }

    // 3. Fallback inteligente estruturado no Padrão da Nina
    console.log('Utilizando gerador estruturado no padrão da Nina');
    return res.json({
      titulo: `[${prod}] - ${rawText.slice(0, 50).trim()}...`,
      descricao: `📜 História & Contexto\nIdentificado durante a utilização do ${prod}.\n${rawText}\n\n🪲 Reprodução do bug\n1. Acessar o módulo ${prod}\n2. Executar a ação: ${rawText.slice(0, 80)}\n3. Observar a ocorrência do erro\n\n❌ Comportamento Atual\nO sistema apresentou falha durante a execução: "${rawText.slice(0, 120)}..."\n\n✅ Comportamento Esperado\nO sistema deve permitir a operação com sucesso sem apagar dados ou gerar erros inesperados.\n\n🧑‍💻 Análise Técnica\nProduto afetado: ${prod}\nCliente: ${cli}\nPrioridade: ${(fields && fields.Prioridade) || 'Baixo'}`,
      provider: 'fallback'
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

  try {
    const child = spawn('google-chrome', ['--auto-open-devtools-for-tabs', url], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    child.on('error', (err) => {
      console.warn('google-chrome indisponível, tentando xdg-open:', err.message);
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
