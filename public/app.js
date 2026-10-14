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
    currentScript: ''
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
    toastMsg: document.getElementById('toastMsg')
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

  async function handleEnhanceWithAI() {
    const raw = elements.rawText.value.trim();
    if (!raw) {
      showToast('Digite uma explicação bruta primeiro!', '⚠️');
      elements.rawText.focus();
      return;
    }

    syncFieldsFromInputs();

    // Estado visual de carregamento
    elements.btnEnhance.disabled = true;
    elements.btnEnhanceIcon.textContent = '⏳';
    elements.btnEnhanceText.textContent = 'Aprimorando com IA...';

    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: state.activePreset,
          rawText: raw,
          fields: state.currentFields
        })
      });

      if (!res.ok) throw new Error('Falha no aprimoramento');
      const data = await res.json();

      if (data.titulo) {
        elements.ticketTitle.value = data.titulo;
      }
      if (data.descricao) {
        elements.ticketDescription.value = data.descricao;
      }

      updateScriptPreview();
      showToast('Conteúdo aprimorado com sucesso!', '✨');
    } catch (err) {
      console.error('Erro no aprimoramento:', err);
      showToast('Erro ao chamar IA, usando fallback local', '⚠️');
      // Fallback amigável direto
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
      elements.btnEnhanceText.textContent = 'Aprimorar com IA';
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

  // Inicialização
  loadPresets();
})();
