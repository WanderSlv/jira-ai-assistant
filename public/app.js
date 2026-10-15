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
    providerPreference: 'gemini',
    evidenceImages: []
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
    customModelContainer: document.getElementById('customModelContainer'),
    inputCustomGoogleModel: document.getElementById('inputCustomGoogleModel'),
    googleAuthFeedback: document.getElementById('googleAuthFeedback'),
    btnTestAndSaveKey: document.getElementById('btnTestAndSaveKey'),
    btnTestSaveIcon: document.getElementById('btnTestSaveIcon'),
    btnTestSaveText: document.getElementById('btnTestSaveText'),
    btnDisconnectGoogleKey: document.getElementById('btnDisconnectGoogleKey'),
    providerGeminiBtn: document.getElementById('providerGeminiBtn'),
    providerOllamaBtn: document.getElementById('providerOllamaBtn'),
    aiStatusBanner: document.getElementById('aiStatusBanner'),
    aiStatusText: document.getElementById('aiStatusText'),
    aiLatencyBadge: document.getElementById('aiLatencyBadge'),
    detectedFieldsBadge: document.getElementById('detectedFieldsBadge'),
    detectedFieldsText: document.getElementById('detectedFieldsText'),
    extensionStatusBadge: document.getElementById('extensionStatusBadge'),
    extensionStatusText: document.getElementById('extensionStatusText'),
    btnSyncExtension: document.getElementById('btnSyncExtension'),
    btnSyncExtensionText: document.getElementById('btnSyncExtensionText'),
    // Elementos de Evidências (Prints/Imagens)
    evidenceFileInput: document.getElementById('evidenceFileInput'),
    evidenceDropzone: document.getElementById('evidenceDropzone'),
    evidenceEmptyNotice: document.getElementById('evidenceEmptyNotice'),
    evidenceThumbnails: document.getElementById('evidenceThumbnails'),
    evidenceCountBadge: document.getElementById('evidenceCountBadge'),
    // Editor Rico da Descrição Estruturada e Ferramentas
    ticketDescriptionEditor: document.getElementById('ticketDescriptionEditor'),
    btnFmtUndo: document.getElementById('btnFmtUndo'),
    btnFmtRedo: document.getElementById('btnFmtRedo'),
    btnFmtBold: document.getElementById('btnFmtBold'),
    btnFmtItalic: document.getElementById('btnFmtItalic'),
    btnFmtCode: document.getElementById('btnFmtCode'),
    btnFmtCodeBlock: document.getElementById('btnFmtCodeBlock'),
    btnFmtBulletList: document.getElementById('btnFmtBulletList'),
    btnFmtOrderedList: document.getElementById('btnFmtOrderedList'),
    btnToggleExpand: document.getElementById('btnToggleExpand'),
    expandToggleIcon: document.getElementById('expandToggleIcon'),
    expandToggleText: document.getElementById('expandToggleText'),
    btnTogglePreview: document.getElementById('btnTogglePreview'),
    previewToggleIcon: document.getElementById('previewToggleIcon'),
    previewToggleText: document.getElementById('previewToggleText'),
    btnScrollBottom: document.getElementById('btnScrollBottom'),
    ticketDescriptionPreview: document.getElementById('ticketDescriptionPreview')
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
      Representante: 'Wander',
      NumeroChamado: elements.fieldNumeroChamado.value.trim() || '-'
    };
    elements.fieldRepresentante.value = 'Wander';

    const numInfo = state.currentFields.NumeroChamado && state.currentFields.NumeroChamado !== '-'
      ? ` | Chamado: ${state.currentFields.NumeroChamado}`
      : '';
    elements.summaryFields.textContent = 
      `Cliente: ${state.currentFields.Cliente} | Produto: ${state.currentFields.Produto} | Prioridade: ${state.currentFields.Prioridade} | Repr: Wander${numInfo}`;
  }

  function setInputsFromFields(fields) {
    if (!fields) return;
    elements.fieldCliente.value = fields.Cliente || 'Nina';
    elements.fieldProduto.value = fields.Produto || 'ninachat';
    elements.fieldPrioridade.value = fields.Prioridade || 'Baixo';
    elements.fieldRepresentante.value = 'Wander';
    elements.fieldNumeroChamado.value = fields.NumeroChamado || '-';
    syncFieldsFromInputs();
  }

  function tryExtractAndApplyFields(text, showToastOnDetect = false) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      if (elements.detectedFieldsBadge) elements.detectedFieldsBadge.classList.add('hidden');
      return null;
    }

    if (typeof extractFieldsFromRawText !== 'function') {
      return null;
    }

    const extracted = extractFieldsFromRawText(text);
    const detectedParts = [];
    let changed = false;

    if (extracted.cliente) {
      if (elements.fieldCliente.value !== extracted.cliente) {
        elements.fieldCliente.value = extracted.cliente;
        changed = true;
      }
      detectedParts.push(`Cliente: ${extracted.cliente}`);
    }

    if (extracted.produto) {
      if (elements.fieldProduto.value !== extracted.produto) {
        elements.fieldProduto.value = extracted.produto;
        changed = true;
      }
      detectedParts.push(`Produto: ${extracted.produto}`);
    }

    if (extracted.numeroChamado) {
      if (elements.fieldNumeroChamado.value !== extracted.numeroChamado) {
        elements.fieldNumeroChamado.value = extracted.numeroChamado;
        changed = true;
      }
      detectedParts.push(`Chamado: ${extracted.numeroChamado}`);
    }

    // O representante sempre vai ser Wander
    if (elements.fieldRepresentante.value !== 'Wander') {
      elements.fieldRepresentante.value = 'Wander';
      changed = true;
    }

    if (detectedParts.length > 0) {
      if (elements.detectedFieldsBadge && elements.detectedFieldsText) {
        elements.detectedFieldsText.textContent = `🎯 Identificado: ${detectedParts.join(' | ')}`;
        elements.detectedFieldsBadge.classList.remove('hidden');
      }
    } else {
      if (elements.detectedFieldsBadge) {
        elements.detectedFieldsBadge.classList.add('hidden');
      }
    }

    if (changed) {
      syncFieldsFromInputs();
      updateScriptPreview();
      if (showToastOnDetect && detectedParts.length > 0) {
        showToast(`Campos padrão pré-fixados atualizados: ${detectedParts.join(', ')}`, '🎯');
      }
    }

    return extracted;
  }

  function syncTicketWithExtension(showToastMsg = false) {
    const desc = getStructuredDescription();
    const payload = {
      titulo: elements.ticketTitle.value || state.title || '',
      descricao: desc || state.description || '',
      fields: state.currentFields,
      images: state.evidenceImages,
      updatedAt: Date.now()
    };

    window.postMessage({
      type: 'JIRA_ASSISTANT_SAVE_TICKET',
      payload: payload
    }, '*');

    if (showToastMsg) {
      showToast('Chamado sincronizado com a Extensão do Jira! Abra o Jira para preencher.', '⚡', 3500);
    }
  }

  function updateScriptPreview() {
    state.title = elements.ticketTitle.value;
    state.description = getStructuredDescription();

    const script = generateJiraScript({
      titulo: state.title,
      descricao: state.description,
      fields: state.currentFields
    });

    state.currentScript = script;
    elements.codeOutput.textContent = script;

    syncTicketWithExtension(false);
    updateMarkdownPreviewIfOpen();
  }

  // Manipulação de Evidências (Prints / Imagens)
  function addEvidenceFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Por favor, selecione apenas arquivos de imagem (PNG, JPEG, WebP)', '⚠️');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const newImg = {
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: file.name || 'print.png',
        size: (file.size / 1024).toFixed(0) + ' KB',
        dataUrl: dataUrl
      };
      state.evidenceImages.push(newImg);
      renderEvidenceThumbnails();
      syncTicketWithExtension(false);
      showToast(`Print "${newImg.name}" anexado com sucesso!`, '📸');
    };
    reader.readAsDataURL(file);
  }

  function removeEvidenceImage(id) {
    state.evidenceImages = state.evidenceImages.filter(img => img.id !== id);
    renderEvidenceThumbnails();
    syncTicketWithExtension(false);
  }

  function renderEvidenceThumbnails() {
    if (!elements.evidenceThumbnails) return;
    const count = state.evidenceImages.length;
    if (count === 0) {
      if (elements.evidenceEmptyNotice) elements.evidenceEmptyNotice.classList.remove('hidden');
      elements.evidenceThumbnails.classList.add('hidden');
      if (elements.evidenceCountBadge) elements.evidenceCountBadge.classList.add('hidden');
      elements.evidenceThumbnails.innerHTML = '';
      return;
    }

    if (elements.evidenceEmptyNotice) elements.evidenceEmptyNotice.classList.add('hidden');
    elements.evidenceThumbnails.classList.remove('hidden');
    if (elements.evidenceCountBadge) {
      elements.evidenceCountBadge.classList.remove('hidden');
      elements.evidenceCountBadge.textContent = `${count} print${count > 1 ? 's' : ''}`;
    }

    elements.evidenceThumbnails.innerHTML = state.evidenceImages.map(img => `
      <div class="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
        <img src="${img.dataUrl}" alt="${img.name}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
          <span class="text-[9px] text-slate-200 truncate font-mono">${img.name} (${img.size})</span>
          <button type="button" data-remove-id="${img.id}" class="btn-remove-evidence self-end bg-rose-600/90 hover:bg-rose-500 text-white rounded p-1 text-[10px] transition-colors" title="Remover print">
            ✕
          </button>
        </div>
      </div>
    `).join('');

    elements.evidenceThumbnails.querySelectorAll('.btn-remove-evidence').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-remove-id');
        removeEvidenceImage(id);
      });
    });
  }

  // Obtém o conteúdo da Descrição Estruturada sempre convertido em Markdown limpo para o Jira
  function getStructuredDescription() {
    if (elements.ticketDescriptionEditor && !elements.ticketDescriptionEditor.classList.contains('hidden')) {
      const html = elements.ticketDescriptionEditor.innerHTML || '';
      if (typeof htmlToMarkdown === 'function') {
        return htmlToMarkdown(html);
      }
      return elements.ticketDescriptionEditor.innerText || '';
    }
    return (elements.ticketDescription && elements.ticketDescription.value) || '';
  }

  // Define o conteúdo da Descrição Estruturada e atualiza tanto o editor rico quanto o textarea
  function setStructuredDescription(mdText, shouldScrollBottom = false) {
    const rawVal = mdText || '';
    if (elements.ticketDescription) {
      elements.ticketDescription.value = rawVal;
    }
    if (elements.ticketDescriptionEditor) {
      if (typeof markdownToHtml === 'function') {
        elements.ticketDescriptionEditor.innerHTML = markdownToHtml(rawVal);
      } else {
        elements.ticketDescriptionEditor.textContent = rawVal;
      }
      if (shouldScrollBottom) {
        setTimeout(() => {
          autoScrollEditorDown(true);
        }, 80);
      }
    }
    updateScriptPreview();
  }

  // Rola suavemente a barra de rolagem do editor para o final para leitura confortável
  function autoScrollEditorDown(smooth = true) {
    const ed = elements.ticketDescriptionEditor;
    if (!ed) return;
    ed.scrollTo({
      top: ed.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  // Alterna a altura expandida para leitura completa sem scrollbars internos
  let isEditorExpanded = false;
  function toggleExpandEditor() {
    isEditorExpanded = !isEditorExpanded;
    const ed = elements.ticketDescriptionEditor;
    const ta = elements.ticketDescription;

    if (ed) {
      if (isEditorExpanded) {
        ed.classList.add('is-expanded');
      } else {
        ed.classList.remove('is-expanded');
      }
    }
    if (ta) {
      if (isEditorExpanded) {
        ta.classList.add('is-expanded');
        ta.style.maxHeight = 'none';
        ta.style.minHeight = '480px';
      } else {
        ta.classList.remove('is-expanded');
        ta.style.maxHeight = '520px';
        ta.style.minHeight = '220px';
      }
    }
    if (elements.expandToggleIcon) elements.expandToggleIcon.textContent = isEditorExpanded ? '⬆' : '↕';
    if (elements.expandToggleText) elements.expandToggleText.textContent = isEditorExpanded ? 'Compactar' : 'Expandir';
  }

  // Aplica comandos de formatação rica que entram nativamente no histórico de Undo (Ctrl+Z)
  function applyRichFormatting(command, value = null) {
    const ed = elements.ticketDescriptionEditor;
    if (!ed) return;
    ed.focus();
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.warn('Erro ao executar comando de formatação:', command, e);
    }
    syncEditorToState();
  }

  // Sincroniza o editor rico com o estado global e a geração de script do Jira
  function syncEditorToState() {
    const md = getStructuredDescription();
    if (elements.ticketDescription) {
      elements.ticketDescription.value = md;
    }
    state.description = md;
    updateScriptPreview();
  }

  // Insere código inline com tag <code> preservando desfazer (Ctrl+Z)
  function insertInlineCode() {
    const ed = elements.ticketDescriptionEditor;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    let text = 'código';
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      text = sel.toString();
    }
    document.execCommand('insertHTML', false, `<code>${text}</code>`);
    syncEditorToState();
  }

  // Insere bloco de código com <pre><code> preservando desfazer (Ctrl+Z)
  function insertCodeBlock() {
    const ed = elements.ticketDescriptionEditor;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    let text = '// Insira seu código aqui';
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      text = sel.toString();
    }
    document.execCommand('insertHTML', false, `<pre><code>${text}</code></pre><p><br></p>`);
    syncEditorToState();
  }

  let isMarkdownMode = false;
  function toggleMarkdownPreview() {
    isMarkdownMode = !isMarkdownMode;
    const ed = elements.ticketDescriptionEditor;
    const ta = elements.ticketDescription;

    if (isMarkdownMode) {
      // Modo código Markdown cru
      const md = getStructuredDescription();
      if (ta) {
        ta.value = md;
        ta.classList.remove('hidden');
      }
      if (ed) ed.classList.add('hidden');
      if (elements.previewToggleIcon) elements.previewToggleIcon.textContent = '✏️';
      if (elements.previewToggleText) elements.previewToggleText.textContent = 'Visual';
    } else {
      // Modo Visual Rico (com negrito, listas e código de fato)
      const md = (ta && ta.value) || '';
      if (ed) {
        ed.innerHTML = typeof markdownToHtml === 'function' ? markdownToHtml(md) : md;
        ed.classList.remove('hidden');
      }
      if (ta) ta.classList.add('hidden');
      if (elements.previewToggleIcon) elements.previewToggleIcon.textContent = '👁️';
      if (elements.previewToggleText) elements.previewToggleText.textContent = 'Markdown';
    }
    updateScriptPreview();
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
      state.googleModel = data.geminiModel || 'gemini-3.8-flash';
      if (elements.selectGoogleModel) {
        const standardModels = ['gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        if (standardModels.includes(state.googleModel)) {
          elements.selectGoogleModel.value = state.googleModel;
          if (elements.customModelContainer) elements.customModelContainer.classList.add('hidden');
        } else {
          elements.selectGoogleModel.value = 'custom';
          if (elements.customModelContainer) elements.customModelContainer.classList.remove('hidden');
          if (elements.inputCustomGoogleModel) elements.inputCustomGoogleModel.value = state.googleModel;
        }
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
    let model = elements.selectGoogleModel.value;
    if (model === 'custom') {
      model = (elements.inputCustomGoogleModel && elements.inputCustomGoogleModel.value.trim()) || 'gemini-3.8-flash';
    }

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

    tryExtractAndApplyFields(raw, false);
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
          customModel: state.googleModel,
          images: state.evidenceImages.map(img => img.dataUrl)
        })
      });

      if (!res.ok) throw new Error('Falha no aprimoramento');
      const data = await res.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Atualiza campos detectados retornados pela API
      if (data.fields) {
        if (data.fields.Cliente) elements.fieldCliente.value = data.fields.Cliente;
        if (data.fields.Produto) elements.fieldProduto.value = data.fields.Produto;
        if (data.fields.NumeroChamado && data.fields.NumeroChamado !== '-') {
          elements.fieldNumeroChamado.value = data.fields.NumeroChamado;
        }
        elements.fieldRepresentante.value = 'Wander';
        syncFieldsFromInputs();
      }

      if (data.detectedFields) {
        const parts = [];
        if (data.detectedFields.Cliente) parts.push(`Cliente: ${data.detectedFields.Cliente}`);
        if (data.detectedFields.Produto) parts.push(`Produto: ${data.detectedFields.Produto}`);
        if (data.detectedFields.NumeroChamado && data.detectedFields.NumeroChamado !== '-') {
          parts.push(`Chamado: ${data.detectedFields.NumeroChamado}`);
        }
        if (parts.length > 0 && elements.detectedFieldsBadge && elements.detectedFieldsText) {
          elements.detectedFieldsText.textContent = `🎯 Identificado: ${parts.join(' | ')}`;
          elements.detectedFieldsBadge.classList.remove('hidden');
        }
      }

      if (data.titulo) {
        elements.ticketTitle.value = data.titulo;
      }
      if (data.descricao) {
        setStructuredDescription(data.descricao, true);
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
      if (!getStructuredDescription()) {
        const fallbackDesc = `Contexto:\n${raw}\n\nProduto afetado: ${state.currentFields.Produto}\nCliente: ${state.currentFields.Cliente}`;
        setStructuredDescription(fallbackDesc, true);
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

  function autoResizeTextarea(el, minHeight = 96) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, minHeight) + 'px';
  }

  elements.btnClearRaw.addEventListener('click', () => {
    elements.rawText.value = '';
    if (elements.detectedFieldsBadge) elements.detectedFieldsBadge.classList.add('hidden');
    autoResizeTextarea(elements.rawText, 96);
    elements.rawText.focus();
  });

  if (elements.rawText) {
    elements.rawText.addEventListener('input', () => {
      autoResizeTextarea(elements.rawText, 96);
      tryExtractAndApplyFields(elements.rawText.value, false);
    });

    elements.rawText.addEventListener('paste', () => {
      setTimeout(() => {
        autoResizeTextarea(elements.rawText, 96);
        tryExtractAndApplyFields(elements.rawText.value, true);
      }, 50);
    });
  }

  elements.btnEnhance.addEventListener('click', handleEnhanceWithAI);

  elements.ticketTitle.addEventListener('input', updateScriptPreview);

  if (elements.ticketDescription) {
    elements.ticketDescription.addEventListener('input', updateScriptPreview);
  }

  if (elements.ticketDescriptionEditor) {
    // Sincroniza em tempo real com o script do Jira ao digitar ou colar
    elements.ticketDescriptionEditor.addEventListener('input', () => {
      syncEditorToState();
    });

    // Atalhos de teclado: Ctrl+B (Negrito), Ctrl+I (Itálico), Ctrl+Z (Desfazer nativo)
    elements.ticketDescriptionEditor.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl + B: Negrito de fato
      if (isCtrlOrCmd && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        applyRichFormatting('bold');
        return;
      }

      // Ctrl + I: Itálico de fato
      if (isCtrlOrCmd && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        applyRichFormatting('italic');
        return;
      }

      // Ctrl + Z: Desfazer com sincronização do estado
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        setTimeout(() => syncEditorToState(), 20);
      } else if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        setTimeout(() => syncEditorToState(), 20);
      }
    });

    // Acompanha a digitação mantendo o scroll descendo suavemente caso esteja no fim
    elements.ticketDescriptionEditor.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.key.length === 1) {
        const ed = elements.ticketDescriptionEditor;
        const scrollDelta = ed.scrollHeight - ed.scrollTop - ed.clientHeight;
        if (scrollDelta < 100) {
          ed.scrollTo({ top: ed.scrollHeight, behavior: 'smooth' });
        }
      }
    });
  }

  if (elements.btnSyncExtension) {
    elements.btnSyncExtension.addEventListener('click', () => {
      updateScriptPreview();
      syncTicketWithExtension(true);
    });
  }

  elements.btnBigCopy.addEventListener('click', copyScriptToClipboard);
  elements.btnSmallCopy.addEventListener('click', copyScriptToClipboard);

  // Ouve notificações da extensão do Chrome
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'JIRA_ASSISTANT_EXTENSION_STATUS' && e.data.installed) {
      if (elements.extensionStatusBadge) {
        elements.extensionStatusBadge.classList.remove('hidden');
      }
    }
  });

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
  if (elements.selectGoogleModel) {
    elements.selectGoogleModel.addEventListener('change', () => {
      if (elements.selectGoogleModel.value === 'custom') {
        elements.customModelContainer.classList.remove('hidden');
        elements.inputCustomGoogleModel.focus();
      } else {
        elements.customModelContainer.classList.add('hidden');
      }
    });
  }
  if (elements.providerGeminiBtn) {
    elements.providerGeminiBtn.addEventListener('click', () => setProviderPreference('gemini'));
  }
  if (elements.providerOllamaBtn) {
    elements.providerOllamaBtn.addEventListener('click', () => setProviderPreference('ollama'));
  }

  // Listeners de Evidências (Prints / Imagens)
  if (elements.evidenceFileInput) {
    elements.evidenceFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(f => addEvidenceFile(f));
      elements.evidenceFileInput.value = '';
    });
  }

  if (elements.evidenceDropzone) {
    elements.evidenceDropzone.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-remove-evidence')) {
        elements.evidenceFileInput.click();
      }
    });

    elements.evidenceDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.evidenceDropzone.classList.add('border-emerald-500', 'bg-emerald-500/10');
    });

    elements.evidenceDropzone.addEventListener('dragleave', () => {
      elements.evidenceDropzone.classList.remove('border-emerald-500', 'bg-emerald-500/10');
    });

    elements.evidenceDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.evidenceDropzone.classList.remove('border-emerald-500', 'bg-emerald-500/10');
      const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        files.forEach(f => addEvidenceFile(f));
      } else {
        showToast('Nenhuma imagem detectada no arquivo solto', '⚠️');
      }
    });
  }

  // Listener global de Ctrl+V para colar prints de qualquer lugar da tela
  document.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(it => it.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      imageItems.forEach(item => {
        const blob = item.getAsFile();
        if (blob) {
          const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
          const file = new File([blob], `print_${timestamp}.png`, { type: blob.type || 'image/png' });
          addEvidenceFile(file);
        }
      });
    }
  });

  // Listeners da Barra de Formatação Rica (Negrito de fato, Desfazer, Listas e Código)
  if (elements.btnFmtUndo) {
    elements.btnFmtUndo.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtUndo.addEventListener('click', () => applyRichFormatting('undo'));
  }
  if (elements.btnFmtRedo) {
    elements.btnFmtRedo.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtRedo.addEventListener('click', () => applyRichFormatting('redo'));
  }
  if (elements.btnFmtBold) {
    elements.btnFmtBold.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtBold.addEventListener('click', () => applyRichFormatting('bold'));
  }
  if (elements.btnFmtItalic) {
    elements.btnFmtItalic.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtItalic.addEventListener('click', () => applyRichFormatting('italic'));
  }
  if (elements.btnFmtCode) {
    elements.btnFmtCode.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtCode.addEventListener('click', insertInlineCode);
  }
  if (elements.btnFmtCodeBlock) {
    elements.btnFmtCodeBlock.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtCodeBlock.addEventListener('click', insertCodeBlock);
  }
  if (elements.btnFmtBulletList) {
    elements.btnFmtBulletList.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtBulletList.addEventListener('click', () => applyRichFormatting('insertUnorderedList'));
  }
  if (elements.btnFmtOrderedList) {
    elements.btnFmtOrderedList.addEventListener('mousedown', (e) => e.preventDefault());
    elements.btnFmtOrderedList.addEventListener('click', () => applyRichFormatting('insertOrderedList'));
  }
  if (elements.btnToggleExpand) {
    elements.btnToggleExpand.addEventListener('click', toggleExpandEditor);
  }
  if (elements.btnTogglePreview) {
    elements.btnTogglePreview.addEventListener('click', toggleMarkdownPreview);
  }
  if (elements.btnScrollBottom) {
    elements.btnScrollBottom.addEventListener('click', () => autoScrollEditorDown(true));
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
