// Aplicação Frontend do Jira Script Generator

(function() {
  // Estado local
  const state = {
    activePreset: 'bug',
    presets: {},
    currentFields: {
      Cliente: 'Nina',
      Produto: 'ninachat',
      Prioridade: 'Baixo',
      Representante: 'Wander',
      NumeroChamado: '-'
    },
    title: '',
    description: '',
    currentScript: '',
    hasGoogleKey: false,
    googleModel: 'gemini-2.0-flash',
    providerPreference: 'gemini'
  };

  // Elementos do DOM
  const elements = {
    typeButtons: document.querySelectorAll('.preset-btn'),
    summaryFields: document.getElementById('summaryFields'),
    fieldCliente: document.getElementById('fieldCliente'),
    fieldProduto: document.getElementById('fieldProduto'),
    fieldPrioridade: document.getElementById('fieldPrioridade'),
    fieldRepresentante: document.getElementById('fieldRepresentante'),
    fieldNumeroChamado: document.getElementById('fieldNumeroChamado'),
    btnSavePreset: document.getElementById('btnSavePreset'),
    rawText: document.getElementById('rawText'),
    btnClearRaw: document.getElementById('btnClearRaw'),
    btnEnhance: document.getElementById('btnEnhance'),
    btnEnhanceIcon: document.getElementById('btnEnhanceIcon'),
    btnEnhanceText: document.getElementById('btnEnhanceText'),
    ticketTitle: document.getElementById('ticketTitle'),
    ticketDescription: document.getElementById('ticketDescription'),
    btnBigCopy: document.getElementById('btnBigCopy'),
    bigCopyIcon: document.getElementById('bigCopyIcon'),
    bigCopyText: document.getElementById('bigCopyText'),
    btnSmallCopy: document.getElementById('btnSmallCopy'),
    smallCopyIcon: document.getElementById('smallCopyIcon'),
    smallCopyText: document.getElementById('smallCopyText'),
    codeOutput: document.getElementById('codeOutput'),
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMsg: document.getElementById('toastMsg'),
    // Elementos de Autenticação Google e Provedor IA
    btnOpenGoogleModal: document.getElementById('btnOpenGoogleModal'),
    googleAuthDot: document.getElementById('googleAuthDot'),
    googleAuthText: document.getElementById('googleAuthText'),
    googleModelBadge: document.getElementById('googleModelBadge'),
    googleAuthModal: document.getElementById('googleAuthModal'),
    googleAuthModalBox: document.getElementById('googleAuthModalBox'),
    btnCloseGoogleModal: document.getElementById('btnCloseGoogleModal'),
    btnCancelGoogleModal: document.getElementById('btnCancelGoogleModal'),
    inputGoogleApiKey: document.getElementById('inputGoogleApiKey'),
    btnToggleKeyVisibility: document.getElementById('btnToggleKeyVisibility'),
    selectGoogleModel: document.getElementById('selectGoogleModel'),
    googleAuthFeedback: document.getElementById('googleAuthFeedback'),
    btnTestAndSaveKey: document.getElementById('btnTestAndSaveKey'),
    btnTestSaveIcon: document.getElementById('btnTestSaveIcon'),
    btnTestSaveText: document.getElementById('btnTestSaveText'),
    btnDisconnectGoogleKey: document.getElementById('btnDisconnectGoogleKey'),
    providerGeminiBtn: document.getElementById('providerGeminiBtn'),
    providerOllamaBtn: document.getElementById('providerOllamaBtn'),
    aiStatusBanner: document.getElementById('aiStatusBanner'),
    aiStatusText: document.getElementById('aiStatusText'),
    aiLatencyBadge: document.getElementById('aiLatencyBadge')
  };

  let toastTimeout = null;

  function showToast(message, icon = '✅', duration = 3000) {
    if (toastTimeout) clearTimeout(toastTimeout);
    elements.toastMsg.textContent = message;
    elements.toastIcon.textContent = icon;
    elements.toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    elements.toast.classList.add('translate-y-0', 'opacity-100');

    toastTimeout = setTimeout(() => {
      elements.toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
      elements.toast.classList.remove('translate-y-0', 'opacity-100');
    }, duration);
  }

  function syncFieldsFromInputs() {
    state.currentFields = {
      Cliente: elements.fieldCliente.value.trim() || 'Nina',
      Produto: elements.fieldProduto.value.trim() || 'ninachat',
      Prioridade: elements.fieldPrioridade.value || 'Baixo',
      Representante: elements.fieldRepresentante.value.trim() || 'Wander',
      NumeroChamado: elements.fieldNumeroChamado.value.trim() || '-'
    };

    elements.summaryFields.textContent = 
      `Cliente: ${state.currentFields.Cliente} | Produto: ${state.currentFields.Produto} | Prioridade: ${state.currentFields.Prioridade} | Repr: ${state.currentFields.Representante}`;
  }

  function setInputsFromFields(fields) {
    if (!fields) return;
    elements.fieldCliente.value = fields.Cliente || 'Nina';
    elements.fieldProduto.value = fields.Produto || 'ninachat';
    elements.fieldPrioridade.value = fields.Prioridade || 'Baixo';
    elements.fieldRepresentante.value = fields.Representante || 'Wander';
    elements.fieldNumeroChamado.value = fields.NumeroChamado || '-';
    syncFieldsFromInputs();
  }

  function updateScriptPreview() {
    state.title = elements.ticketTitle.value;
    state.description = elements.ticketDescription.value;

    const script = generateJiraScript({
      titulo: state.title,
      descricao: state.description,
      fields: state.currentFields
    });

    state.currentScript = script;
    elements.codeOutput.textContent = script;
  }

  async function loadPresets() {
    try {
      const res = await fetch('/api/presets');
      if (!res.ok) throw new Error('Falha ao obter presets');
      const data = await res.json();
      state.presets = data.presets || {};
      const initialKey = data.activePreset || 'bug';
      selectPreset(initialKey);
    } catch (err) {
      console.warn('Erro ao carregar presets da API:', err);
      // Fallback local caso falhe a chamada inicial
      syncFieldsFromInputs();
      updateScriptPreview();
    }
  }

  function selectPreset(presetKey) {
    state.activePreset = presetKey;

    // Atualiza botões
    elements.typeButtons.forEach(btn => {
      const isCurrent = btn.dataset.preset === presetKey;
      if (isCurrent) {
        btn.className = 'preset-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all-fast flex items-center gap-1.5 bg-emerald-500 text-white shadow-sm';
      } else {
        btn.className = 'preset-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all-fast flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50';
      }
    });

    // Aplica campos do preset se existirem
    const preset = state.presets[presetKey];
    if (preset && preset.defaultFields) {
      setInputsFromFields(preset.defaultFields);
    }

    updateScriptPreview();
  }

  async function savePresetDefaults() {
    syncFieldsFromInputs();
    const key = state.activePreset;
    const currentPreset = state.presets[key] || {
      name: key,
      icon: key === 'bug' ? '🐛' : key === 'feature' ? '✨' : '⚡',
      defaultFields: {}
    };

    currentPreset.defaultFields = { ...state.currentFields };

    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, preset: currentPreset })
      });

      if (!res.ok) throw new Error('Erro ao salvar no servidor');
      const data = await res.json();
      state.presets = data.presets || state.presets;
      showToast(`Padrões de "${key.toUpperCase()}" salvos com sucesso!`, '💾');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar configurações padrão', '❌');
    }
  }

  // Funções de Autenticação e Configuração do Google Gemini
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return;
      const data = await res.json();
      state.hasGoogleKey = Boolean(data.hasGeminiKey);
      state.googleModel = data.geminiModel || 'gemini-2.0-flash';
      if (elements.selectGoogleModel) {
        elements.selectGoogleModel.value = state.googleModel;
      }

      if (state.hasGoogleKey) {
        state.providerPreference = 'gemini';
        elements.googleAuthDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        elements.googleAuthText.textContent = 'Google Gemini Ativo';
        elements.googleModelBadge.textContent = state.googleModel;
        elements.googleModelBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        elements.btnOpenGoogleModal.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white text-xs font-semibold transition-all shadow-sm';
        elements.btnDisconnectGoogleKey.classList.remove('hidden');
        if (data.maskedKey) {
          elements.inputGoogleApiKey.placeholder = `Chave configurada: ${data.maskedKey}`;
        }
      } else {
        elements.googleAuthDot.className = 'w-2 h-2 rounded-full bg-slate-400';
        elements.googleAuthText.textContent = 'Conectar Google AI';
        elements.googleModelBadge.textContent = '⚡ ~1s';
        elements.googleModelBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
        elements.btnOpenGoogleModal.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-xs font-semibold transition-all shadow-sm';
        elements.btnDisconnectGoogleKey.classList.add('hidden');
        state.providerPreference = 'ollama';
      }
      updateProviderButtons();
    } catch (err) {
      console.warn('Erro ao carregar config:', err);
    }
  }

  function updateProviderButtons() {
    if (state.providerPreference === 'gemini') {
      elements.providerGeminiBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 bg-indigo-600/40 text-indigo-200 border border-indigo-500/50 shadow-sm';
      elements.providerOllamaBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 text-slate-400 hover:text-slate-200';
      elements.btnEnhanceText.textContent = state.hasGoogleKey ? 'Aprimorar com Google Gemini' : 'Conectar Google & Aprimorar';
    } else {
      elements.providerOllamaBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 bg-amber-600/40 text-amber-200 border border-amber-500/50 shadow-sm';
      elements.providerGeminiBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 text-slate-400 hover:text-slate-200';
      elements.btnEnhanceText.textContent = 'Aprimorar com Ollama';
    }
  }

  function setProviderPreference(prov) {
    if (prov === 'gemini' && !state.hasGoogleKey) {
      openGoogleModal();
      return;
    }
    state.providerPreference = prov;
    updateProviderButtons();
    showToast(`Motor de IA alterado para: ${prov === 'gemini' ? 'Google Gemini' : 'Ollama Local'}`, prov === 'gemini' ? '⚡' : '🦙');
  }

  function openGoogleModal() {
    elements.googleAuthFeedback.className = 'hidden text-xs p-3 rounded-xl border';
    elements.googleAuthFeedback.textContent = '';
    elements.googleAuthModal.classList.remove('opacity-0', 'pointer-events-none');
    elements.googleAuthModal.classList.add('opacity-100');
    elements.googleAuthModalBox.classList.remove('scale-95');
    elements.googleAuthModalBox.classList.add('scale-100');
    elements.inputGoogleApiKey.focus();
  }

  function closeGoogleModal() {
    elements.googleAuthModal.classList.add('opacity-0', 'pointer-events-none');
    elements.googleAuthModal.classList.remove('opacity-100');
    elements.googleAuthModalBox.classList.add('scale-95');
    elements.googleAuthModalBox.classList.remove('scale-100');
  }

  async function testAndSaveGoogleKey() {
    const key = elements.inputGoogleApiKey.value.trim();
    const model = elements.selectGoogleModel.value;

    if (!key && !state.hasGoogleKey) {
      elements.googleAuthFeedback.className = 'text-xs p-3 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 block';
      elements.googleAuthFeedback.textContent = 'Por favor, insira uma chave de API válida do Google.';
      return;
    }

    elements.btnTestAndSaveKey.disabled = true;
    elements.btnTestSaveIcon.textContent = '⏳';
    elements.btnTestSaveText.textContent = 'Testando conexão...';
    elements.googleAuthFeedback.className = 'text-xs p-3 rounded-xl border bg-slate-800 border-slate-700 text-slate-300 block';
    elements.googleAuthFeedback.textContent = `Validando chave com a API do Google (${model})...`;

    try {
      const testRes = await fetch('/api/test-google-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, model })
      });

      const testData = await testRes.json();
      if (!testRes.ok || !testData.valid) {
        throw new Error(testData.error || 'Chave rejeitada pela API do Google.');
      }

      // Se validada, salva a chave no backend
      const saveRes = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: key || undefined,
          geminiModel: model,
          providerPreference: 'gemini'
        })
      });

      if (!saveRes.ok) throw new Error('Falha ao salvar configuração no servidor.');

      elements.googleAuthFeedback.className = 'text-xs p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 block';
      elements.googleAuthFeedback.textContent = `✔ Conexão com Google Gemini (${model}) validada e salva com sucesso!`;

      await loadConfig();
      state.providerPreference = 'gemini';
      updateProviderButtons();

      setTimeout(() => {
        closeGoogleModal();
        showToast('Google Gemini conectado com sucesso! Respostas em ~1s ativadas.', '⚡');
      }, 1200);
    } catch (err) {
      elements.googleAuthFeedback.className = 'text-xs p-3 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 block';
      elements.googleAuthFeedback.textContent = `❌ ${err.message}`;
    } finally {
      elements.btnTestAndSaveKey.disabled = false;
      elements.btnTestSaveIcon.textContent = '⚡';
      elements.btnTestSaveText.textContent = 'Testar & Salvar';
    }
  }

  async function disconnectGoogleKey() {
    if (!confirm('Deseja realmente desconectar sua chave Google e voltar ao Ollama local?')) return;
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: '', providerPreference: 'ollama' })
      });
      elements.inputGoogleApiKey.value = '';
      elements.inputGoogleApiKey.placeholder = 'Cole sua chave AIzaSy...';
      await loadConfig();
      state.providerPreference = 'ollama';
      updateProviderButtons();
      closeGoogleModal();
      showToast('Chave Google desconectada. Ollama local ativo.', '🦙');
    } catch (err) {
      showToast('Erro ao desconectar chave', '❌');
    }
  }

  async function handleEnhanceWithAI() {
    const raw = elements.rawText.value.trim();
    if (!raw) {
      showToast('Digite uma explicação bruta primeiro!', '⚠️');
      elements.rawText.focus();
      return;
    }

    if (state.providerPreference === 'gemini' && !state.hasGoogleKey) {
      openGoogleModal();
      return;
    }

    syncFieldsFromInputs();

    // Estado visual de carregamento
    const isGemini = state.providerPreference === 'gemini';
    elements.btnEnhance.disabled = true;
    elements.btnEnhanceIcon.textContent = '⏳';
    elements.btnEnhanceText.textContent = isGemini ? 'Processando com Google AI...' : 'Processando com Ollama...';
    elements.aiStatusBanner.classList.add('hidden');

    const startTime = Date.now();

    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: state.activePreset,
          rawText: raw,
          fields: state.currentFields,
          providerPreference: state.providerPreference,
          customModel: state.googleModel
        })
      });

      if (!res.ok) throw new Error('Falha no aprimoramento');
      const data = await res.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (data.titulo) {
        elements.ticketTitle.value = data.titulo;
      }
      if (data.descricao) {
        elements.ticketDescription.value = data.descricao;
      }

      updateScriptPreview();

      // Exibe banner de status da geração
      elements.aiStatusBanner.classList.remove('hidden');
      if (data.provider === 'gemini') {
        elements.aiStatusText.textContent = `⚡ Aprimorado com Google Gemini (${data.model || state.googleModel})`;
        elements.aiLatencyBadge.textContent = `${elapsed}s`;
        showToast(`Card gerado com sucesso via Google Gemini em ${elapsed}s!`, '⚡');
      } else if (data.provider === 'ollama') {
        elements.aiStatusText.textContent = `🦙 Aprimorado com Ollama Local (qwen2.5-coder)`;
        elements.aiLatencyBadge.textContent = `${elapsed}s`;
        showToast(`Card gerado com sucesso via Ollama local em ${elapsed}s!`, '🦙');
      } else {
        elements.aiStatusText.textContent = `📋 Estruturado no Padrão Oficial da Nina`;
        elements.aiLatencyBadge.textContent = `${elapsed}s`;
        showToast('Card estruturado no padrão da Nina!', '✨');
      }
    } catch (err) {
      console.error('Erro no aprimoramento:', err);
      showToast('Erro ao chamar IA, usando fallback local', '⚠️');
      if (!elements.ticketTitle.value) {
        elements.ticketTitle.value = `[${state.currentFields.Produto}] - ${raw.slice(0, 50)}...`;
      }
      if (!elements.ticketDescription.value) {
        elements.ticketDescription.value = `Contexto:\n${raw}\n\nProduto afetado: ${state.currentFields.Produto}\nCliente: ${state.currentFields.Cliente}`;
      }
      updateScriptPreview();
    } finally {
      elements.btnEnhance.disabled = false;
      elements.btnEnhanceIcon.textContent = '✨';
      updateProviderButtons();
    }
  }

  async function copyScriptToClipboard() {
    updateScriptPreview();
    const script = state.currentScript;

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(script);
        copied = true;
      } catch (e) {
        copied = false;
      }
    }

    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = script;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        copied = true;
      } catch (e) {}
      document.body.removeChild(textarea);
    }

    if (copied) {
      // Feedback no botão grande
      elements.bigCopyIcon.textContent = '✅';
      elements.bigCopyText.textContent = 'Código Copiado!';
      elements.btnBigCopy.classList.add('scale-[0.98]', 'ring-4', 'ring-emerald-400/50');

      // Feedback no botão pequeno
      elements.smallCopyIcon.textContent = '✅';
      elements.smallCopyText.textContent = 'Copiado!';

      showToast('Código copiado! Cole no Console do Jira (F12) e dê Enter.', '📋', 4000);

      setTimeout(() => {
        elements.bigCopyIcon.textContent = '📋';
        elements.bigCopyText.textContent = 'Copiar Código para o Console';
        elements.btnBigCopy.classList.remove('scale-[0.98]', 'ring-4', 'ring-emerald-400/50');

        elements.smallCopyIcon.textContent = '📋';
        elements.smallCopyText.textContent = 'Copiar';
      }, 2500);
    } else {
      showToast('Falha ao copiar automaticamente. Selecione o código manualmente.', '❌');
    }
  }

  // Event Listeners
  elements.typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectPreset(btn.dataset.preset);
    });
  });

  const fieldInputs = [
    elements.fieldCliente,
    elements.fieldProduto,
    elements.fieldPrioridade,
    elements.fieldRepresentante,
    elements.fieldNumeroChamado
  ];

  fieldInputs.forEach(input => {
    input.addEventListener('input', () => {
      syncFieldsFromInputs();
      updateScriptPreview();
    });
    input.addEventListener('change', () => {
      syncFieldsFromInputs();
      updateScriptPreview();
    });
  });

  elements.btnSavePreset.addEventListener('click', savePresetDefaults);

  elements.btnClearRaw.addEventListener('click', () => {
    elements.rawText.value = '';
    elements.rawText.focus();
  });

  elements.btnEnhance.addEventListener('click', handleEnhanceWithAI);

  elements.ticketTitle.addEventListener('input', updateScriptPreview);
  elements.ticketDescription.addEventListener('input', updateScriptPreview);

  elements.btnBigCopy.addEventListener('click', copyScriptToClipboard);
  elements.btnSmallCopy.addEventListener('click', copyScriptToClipboard);

  // Listeners de Autenticação Google e Provedores
  if (elements.btnOpenGoogleModal) {
    elements.btnOpenGoogleModal.addEventListener('click', openGoogleModal);
  }
  if (elements.btnCloseGoogleModal) {
    elements.btnCloseGoogleModal.addEventListener('click', closeGoogleModal);
  }
  if (elements.btnCancelGoogleModal) {
    elements.btnCancelGoogleModal.addEventListener('click', closeGoogleModal);
  }
  if (elements.btnTestAndSaveKey) {
    elements.btnTestAndSaveKey.addEventListener('click', testAndSaveGoogleKey);
  }
  if (elements.btnDisconnectGoogleKey) {
    elements.btnDisconnectGoogleKey.addEventListener('click', disconnectGoogleKey);
  }
  if (elements.btnToggleKeyVisibility) {
    elements.btnToggleKeyVisibility.addEventListener('click', () => {
      const isPass = elements.inputGoogleApiKey.type === 'password';
      elements.inputGoogleApiKey.type = isPass ? 'text' : 'password';
      elements.btnToggleKeyVisibility.textContent = isPass ? '🔒' : '👁️';
    });
  }
  if (elements.providerGeminiBtn) {
    elements.providerGeminiBtn.addEventListener('click', () => setProviderPreference('gemini'));
  }
  if (elements.providerOllamaBtn) {
    elements.providerOllamaBtn.addEventListener('click', () => setProviderPreference('ollama'));
  }

  // Fechar modal ao clicar fora da caixa
  if (elements.googleAuthModal) {
    elements.googleAuthModal.addEventListener('click', (e) => {
      if (e.target === elements.googleAuthModal) {
        closeGoogleModal();
      }
    });
  }

  // Inicialização
  loadPresets();
  loadConfig();
})();
