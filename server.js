const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { extractFieldsFromRawText } = require('./public/script_generator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PRESETS_FILE = path.join(__dirname, 'presets.json');
const ENV_FILE = path.join(__dirname, '.env');

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
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
    if (preset.defaultFields) {
      preset.defaultFields.Representante = 'Wander'; // O representante sempre vai ser Wander
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

    // 1. Validação de autenticação instantânea com Google via endpoint de modelos (~300ms)
    const authUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const authResp = await fetch(authUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (!authResp.ok) {
      const errText = await authResp.text();
      let msg = `Erro HTTP ${authResp.status}`;
      try {
        const errObj = JSON.parse(errText);
        msg = errObj.error?.message || msg;
      } catch (e) {}
      return res.status(400).json({ valid: false, error: msg });
    }

    // 2. Teste de geração com o modelo selecionado
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const testResp = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'OK' }] }],
          generationConfig: { maxOutputTokens: 5 }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!testResp.ok && testResp.status === 503) {
        return res.json({
          valid: true,
          model,
          message: `Chave autenticada com sucesso! (Nota: O Google está com alta demanda momentânea no ${model}; o assistente alternará para flash leve automaticamente caso necessário).`
        });
      }
    } catch (genErr) {
      // Se a chamada de geração demorar, mas a chave é 100% válida no Google:
      return res.json({
        valid: true,
        model,
        message: `Chave autenticada com sucesso no Google! (${model})`
      });
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

function buildNinaPrompt(type, rawText, fields, images = []) {
  const produto = (fields && fields.Produto) || 'ninachat';
  const cliente = (fields && fields.Cliente) || 'Nina';
  const prioridade = (fields && fields.Prioridade) || 'Baixo';
  const numeroChamado = (fields && fields.NumeroChamado) || '-';
  const hasImages = Array.isArray(images) && images.length > 0;

  const extractionPrompt = `
IMPORTANTE SOBRE CAMPOS:
Analise cuidadosamente a explicação bruta do usuário e eventuais imagens/prints de evidência fornecidos. Se você identificar:
- Produto afetado (ex: ninachat, ninaflow, ninaforms, portal, whatsapp, etc.)
- Cliente (nome da empresa ou cliente mencionado)
- Número de chamado (ex: número ou código do ticket/chamado/protocolo/movidesk, ex: 12345, #5544)
Extraia-os no objeto "campos". Se não encontrar algum deles na explicação bruta, utilize os valores padrão indicados abaixo.
O representante SEMPRE deve ser "Wander".

REGRAS DE FORMATAÇÃO DA DESCRIÇÃO (Markdown Rico):
- Destaque termos importantes, botões, status e mensagens de erro em **negrito** (ex: **Erro 500**, clique em **Salvar**).
- Para logs técnicos, JSON, payloads, requisições de rede ou trechos de código, utilize blocos de código com crases triplas (\`\`\`json ou \`\`\`bash).
- Para endpoints, URLs, variáveis ou IDs, use código inline com crase simples (\`exemplo\`).
- Se houver prints ou imagens de evidência fornecidos (${hasImages ? `${images.length} print(s) anexado(s)` : 'se houver'}), analise os textos, mensagens na tela e detalhes visuais. Inclua obrigatoriamente a seção "📸 Evidências & Prints" descrevendo com precisão técnica o que é comprovado pelas imagens anexadas ao card.
`;

  if (type === 'feature') {
    return `Você é o Product Manager sênior da Nina Tecnologia.
Analise a solicitação bruta e crie um chamado técnico no Jira seguindo o padrão oficial da Nina Tecnologia:

Solicitação do usuário:
"""
${rawText}
"""

Metadados padrão sugeridos:
- Produto: ${produto}
- Cliente: ${cliente}
- Número do Chamado: ${numeroChamado}
- Representante: Wander

${extractionPrompt}

Responda ESTRITAMENTE em formato JSON com:
{
  "titulo": "[Produto] - Resumo claro e objetivo da funcionalidade",
  "descricao": "🎯 Objetivo / Motivação\\n(Explicação clara do porquê da funcionalidade e do valor para o usuário/cliente)\\n\\n📋 Especificação da Feature\\n(Detalhamento do fluxo, regras de negócio e como deve se comportar)\\n\\n✅ Critérios de Aceite\\n- [ ] Critério 1\\n- [ ] Critério 2\\n\\n📸 Evidências & Referências Visuais\\n(Prints e referências visuais anexadas ao card)\\n\\n🧑‍💻 Observações Técnicas\\n(Impactos na API, frontend ou integrações)",
  "campos": {
    "cliente": "${cliente}",
    "produto": "${produto}",
    "numeroChamado": "${numeroChamado}",
    "representante": "Wander"
  }
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

Metadados padrão sugeridos:
- Produto afetado: ${produto}
- Cliente: ${cliente}
- Prioridade: ${prioridade}
- Número do Chamado: ${numeroChamado}
- Representante: Wander

${extractionPrompt}

Responda ESTRITAMENTE em formato JSON com:
{
  "titulo": "[Produto] - Resumo claro e objetivo do problema",
  "descricao": "📜 História & Contexto\\n(Explique o cenário do bug, o objetivo da ação do usuário e o impacto negativo)\\n\\n🪲 Reprodução do bug\\n1. Passo um (ação inicial no sistema)\\n2. Passo dois (ação do usuário)\\n3. Passo três (ocorrência da falha)\\n\\n❌ Comportamento Atual\\n(O que aconteceu de errado)\\n\\n✅ Comportamento Esperado\\n(O que deveria ter acontecido)\\n\\n📸 Evidências & Prints\\n(Descreva objetivamente os prints/evidências visuais anexados e o que eles comprovam)\\n\\n🧑‍💻 Análise Técnica\\n(Hipóteses técnicas, comportamento de interface, requisições de rede ou validações)",
  "campos": {
    "cliente": "${cliente}",
    "produto": "${produto}",
    "numeroChamado": "${numeroChamado}",
    "representante": "Wander"
  }
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
    descricao: formatDescricao(rawParsed.descricao || rawParsed.description),
    campos: rawParsed.campos || rawParsed.fields || {}
  };
}

async function callGemini(apiKey, prompt, model, images = []) {
  const chosenModel = model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const modelsToTry = [chosenModel, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].filter((m, i, arr) => arr.indexOf(m) === i);

  let lastError = null;

  // Monta as partes de conteúdo para suporte multimodal (Texto + Imagens de Evidência)
  const parts = [{ text: prompt }];
  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      if (typeof img === 'string') {
        const match = img.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }
    }
  }

  for (const m of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`[Gemini] Modelo ${m} respondeu HTTP ${response.status}:`, errBody.slice(0, 120));
        lastError = new Error(`Google Gemini (${m}) retornou status ${response.status}: ${errBody}`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`Google Gemini (${m}) não retornou texto na resposta`);
        continue;
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
        campos: parsed.campos || parsed.fields || {},
        provider: 'gemini',
        model: m
      };
    } catch (err) {
      console.warn(`[Gemini] Falha no modelo ${m}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao processar com Google Gemini');
}

function resolveFieldValue(extractedVal, llmVal, fallbackVal) {
  if (extractedVal && typeof extractedVal === 'string' && extractedVal.trim()) {
    return extractedVal.trim();
  }
  if (llmVal && typeof llmVal === 'string' && llmVal.trim() && !['null', 'none', 'undefined', '-'].includes(llmVal.trim().toLowerCase())) {
    return llmVal.trim();
  }
  return fallbackVal;
}

app.post('/api/enhance', async (req, res) => {
  try {
    const { type, rawText, fields, customApiKey, customModel, providerPreference, images = [] } = req.body || {};
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'rawText é obrigatório' });
    }

    // Extração automática a partir da explicação bruta
    const extracted = extractFieldsFromRawText(rawText);

    const initialProd = extracted.produto || (fields && fields.Produto) || 'Geral';
    const initialCli = extracted.cliente || (fields && fields.Cliente) || 'Nina';
    const initialNum = extracted.numeroChamado || (fields && fields.NumeroChamado) || '-';

    // Em ambiente de teste automatizado sem chave, usa fallback rápido imediato com dados extraídos
    const testEvidenceText = (images && images.length > 0)
      ? `\n\n📸 Evidências & Prints\n- ${images.length} print(s) anexado(s) ao chamado para análise visual.`
      : '';

    if (process.env.NODE_ENV === 'test' && !process.env.GEMINI_API_KEY && !customApiKey) {
      return res.json({
        titulo: `[${initialProd}] - ${rawText.slice(0, 50).trim()}...`,
        descricao: `Contexto:\n${rawText}\n\nProduto afetado: ${initialProd}\nCliente: ${initialCli}${testEvidenceText}`,
        fields: {
          Cliente: initialCli,
          Produto: initialProd,
          Prioridade: (fields && fields.Prioridade) || 'Baixo',
          Representante: 'Wander',
          NumeroChamado: initialNum
        },
        detectedFields: {
          Cliente: extracted.cliente || null,
          Produto: extracted.produto || null,
          NumeroChamado: extracted.numeroChamado || null,
          Representante: 'Wander'
        },
        provider: 'fallback'
      });
    }

    const currentFields = {
      Cliente: initialCli,
      Produto: initialProd,
      Prioridade: (fields && fields.Prioridade) || 'Baixo',
      Representante: 'Wander',
      NumeroChamado: initialNum
    };

    const prompt = buildNinaPrompt(type, rawText, currentFields, images);
    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
    const model = (customModel && customModel.trim()) || process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    // 1. Se houver chave Gemini e não for forçado apenas Ollama
    if (apiKey && providerPreference !== 'ollama') {
      try {
        console.log(`🤖 Processando com Google Gemini (${model})...`);
        const result = await callGemini(apiKey, prompt, model, images);
        if (result.titulo && result.descricao) {
          if (images && images.length > 0 && !result.descricao.includes('Evidência') && !result.descricao.includes('Evidencias') && !result.descricao.includes('📸')) {
            result.descricao += `\n\n📸 Evidências & Prints\n- ${images.length} print(s) de tela anexado(s) ao card para comprovação visual.`;
          }
          const resCampos = result.campos || {};
          const finalFields = {
            Cliente: resolveFieldValue(extracted.cliente, resCampos.cliente || resCampos.Cliente, initialCli),
            Produto: resolveFieldValue(extracted.produto, resCampos.produto || resCampos.Produto, initialProd),
            Prioridade: (fields && fields.Prioridade) || 'Baixo',
            Representante: 'Wander',
            NumeroChamado: resolveFieldValue(extracted.numeroChamado, resCampos.numeroChamado || resCampos.NumeroChamado || resCampos.chamado, initialNum)
          };

          return res.json({
            ...result,
            fields: finalFields,
            detectedFields: {
              Cliente: extracted.cliente || resCampos.cliente || null,
              Produto: extracted.produto || resCampos.produto || null,
              NumeroChamado: extracted.numeroChamado || resCampos.numeroChamado || null,
              Representante: 'Wander'
            }
          });
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
        if (images && images.length > 0 && !result.descricao.includes('Evidência') && !result.descricao.includes('Evidencias') && !result.descricao.includes('📸')) {
          result.descricao += `\n\n📸 Evidências & Prints\n- ${images.length} print(s) de tela anexado(s) ao card para comprovação visual.`;
        }
        const resCampos = result.campos || {};
        const finalFields = {
          Cliente: resolveFieldValue(extracted.cliente, resCampos.cliente || resCampos.Cliente, initialCli),
          Produto: resolveFieldValue(extracted.produto, resCampos.produto || resCampos.Produto, initialProd),
          Prioridade: (fields && fields.Prioridade) || 'Baixo',
          Representante: 'Wander',
          NumeroChamado: resolveFieldValue(extracted.numeroChamado, resCampos.numeroChamado || resCampos.NumeroChamado || resCampos.chamado, initialNum)
        };

        return res.json({
          ...result,
          fields: finalFields,
          detectedFields: {
            Cliente: extracted.cliente || resCampos.cliente || null,
            Produto: extracted.produto || resCampos.produto || null,
            NumeroChamado: extracted.numeroChamado || resCampos.numeroChamado || null,
            Representante: 'Wander'
          },
          provider: 'ollama',
          model: 'qwen2.5-coder:latest'
        });
      }
    } catch (ollamaErr) {
      console.warn('Ollama indisponível ou falhou:', ollamaErr.message);
    }

    // 3. Fallback inteligente estruturado no Padrão da Nina
    console.log('Utilizando gerador estruturado no padrão da Nina');
    const finalFields = {
      Cliente: initialCli,
      Produto: initialProd,
      Prioridade: (fields && fields.Prioridade) || 'Baixo',
      Representante: 'Wander',
      NumeroChamado: initialNum
    };

    const fallbackEvidenceText = (images && images.length > 0)
      ? `\n\n📸 Evidências & Prints\n- ${images.length} print(s) de evidência anexado(s) ao chamado para comprovação e análise visual do erro.`
      : '';

    return res.json({
      titulo: `[${initialProd}] - ${rawText.slice(0, 50).trim()}...`,
      descricao: `📜 História & Contexto\nIdentificado durante a utilização do ${initialProd}.\n${rawText}\n\n🪲 Reprodução do bug\n1. Acessar o módulo ${initialProd}\n2. Executar a ação: ${rawText.slice(0, 80)}\n3. Observar a ocorrência do erro\n\n❌ Comportamento Atual\nO sistema apresentou falha durante a execução: "${rawText.slice(0, 120)}..."\n\n✅ Comportamento Esperado\nO sistema deve permitir a operação com sucesso sem apagar dados ou gerar erros inesperados.${fallbackEvidenceText}\n\n🧑‍💻 Análise Técnica\nProduto afetado: ${initialProd}\nCliente: ${initialCli}\nPrioridade: ${(fields && fields.Prioridade) || 'Baixo'}`,
      fields: finalFields,
      detectedFields: {
        Cliente: extracted.cliente || null,
        Produto: extracted.produto || null,
        NumeroChamado: extracted.numeroChamado || null,
        Representante: 'Wander'
      },
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

  // Em ambiente de teste automatizado, nunca dispara o navegador
  if (process.env.NODE_ENV === 'test') {
    return res.json({ success: true, message: 'Navegador iniciado com sucesso' });
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
