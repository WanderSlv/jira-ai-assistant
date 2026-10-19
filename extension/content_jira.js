// Content Script que executa nas páginas do Jira (incluindo todos os iframes)
(function() {
  // Evita reinicializações duplicadas no mesmo contexto
  if (window.__JIRA_ASSISTANT_INJECTED__) return;
  window.__JIRA_ASSISTANT_INJECTED__ = true;

  console.log('⚡ [Jira AI Assistant] Engine injetado no contexto:', window.location.href);

  // Injeta o script auxiliar no contexto MAIN (para acesso ao React Fiber)
  function injectMainWorldScript() {
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('inpage_fiber.js');
      s.onload = function() { this.remove(); };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {
      // Ignora erro se não tiver permissão
    }
  }
  injectMainWorldScript();

  // Utilitários de espera
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function normalizeStr(s) {
    if (!s) return '';
    return s.toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\s_\-\.\,]+/g, '');
  }

  // Disparo de sequência completa e realista de ponteiro e mouse para simular clique do usuário
  function dispatchMouseSequence(element) {
    if (!element) return;
    try {
      const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      const clientX = rect.left + Math.max(1, rect.width / 2);
      const clientY = rect.top + Math.max(1, rect.height / 2);

      const baseInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: clientX,
        clientY: clientY,
        screenX: clientX,
        screenY: clientY,
        button: 0
      };

      // 1. Hover
      element.dispatchEvent(new MouseEvent('mouseenter', baseInit));
      element.dispatchEvent(new MouseEvent('mouseover', baseInit));

      // 2. Pointer down & mouse down (buttons: 1)
      if (typeof window.PointerEvent === 'function') {
        element.dispatchEvent(new PointerEvent('pointerdown', {
          ...baseInit,
          buttons: 1,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true
        }));
      }
      element.dispatchEvent(new MouseEvent('mousedown', { ...baseInit, buttons: 1 }));

      // 3. Pointer up & mouse up & click (buttons: 0)
      if (typeof window.PointerEvent === 'function') {
        element.dispatchEvent(new PointerEvent('pointerup', {
          ...baseInit,
          buttons: 0,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true
        }));
      }
      element.dispatchEvent(new MouseEvent('mouseup', { ...baseInit, buttons: 0 }));
      element.dispatchEvent(new MouseEvent('click', { ...baseInit, buttons: 0 }));

      // 4. Invocação de método nativo se existir
      if (typeof element.click === 'function') {
        element.click();
      }
    } catch (e) {
      console.warn('Erro ao disparar clique:', e);
    }
  }

  function findLabel(textOrList) {
    const targets = (Array.isArray(textOrList) ? textOrList : [textOrList])
      .map(s => normalizeStr(s))
      .filter(Boolean);

    const elements = Array.from(document.querySelectorAll('label, div, span, p, h1, h2, h3, h4, strong, b'));

    // 1. Prioridade absoluta para match exato (com ou sem asterisco)
    for (const t of targets) {
      const found = elements.find(el => {
        const raw = (el.innerText || el.textContent || '').trim();
        if (raw.length > 80) return false;
        const norm = normalizeStr(raw);
        if (!norm) return false;
        return norm === t ||
               norm === t + '*' ||
               norm.replace(/\*+$/, '') === t;
      });
      if (found) return found;
    }

    // 2. Match por inclusão do rótulo (ex: "representantedocliente" contém "representante")
    for (const t of targets) {
      if (t.length < 3) continue;
      const found = elements.find(el => {
        const raw = (el.innerText || el.textContent || '').trim();
        if (raw.length > 80) return false;
        const norm = normalizeStr(raw);
        if (!norm) return false;
        const clean = norm.replace(/\*+$/, '');
        return clean === t || clean.includes(t) || t.includes(clean);
      });
      if (found) return found;
    }

    return null;
  }

  function findContainer(lbl) {
    if (!lbl) return null;

    // Se o elemento possui o atributo 'for', procura o input associado diretamente pelo ID
    const forAttr = lbl.getAttribute && (lbl.getAttribute('for') || lbl.getAttribute('htmlfor'));
    if (forAttr) {
      const targetEl = document.getElementById(forAttr);
      if (targetEl) {
        return targetEl.closest("div[class*='field'], div[class*='form-group'], div") || targetEl.parentElement;
      }
    }

    // Busca subindo na árvore hierárquica pelo container de formulário
    let c = lbl.parentElement;
    for (let i = 0; i < 7 && c; i++) {
      if (c.querySelector("input:not([type='hidden']), textarea, [contenteditable='true'], [role='combobox'], [class*='control'], [class*='select']")) {
        return c;
      }
      c = c.parentElement;
    }

    // Se o input estiver num elemento irmão (ex: label em uma coluna, controle na coluna ao lado)
    if (lbl.parentElement && lbl.parentElement.nextElementSibling) {
      const sibling = lbl.parentElement.nextElementSibling;
      if (sibling.querySelector("input:not([type='hidden']), textarea, [role='combobox'], [class*='control']")) {
        return sibling;
      }
    }

    return lbl.parentElement;
  }

  // 1. Preenchimento de campos de texto (Título, Número do chamado)
  function fillTextInput(labelNames, value) {
    if (!value || value === '-') return false;
    try {
      const lbl = findLabel(labelNames);
      const container = findContainer(lbl);
      const sel = "input:not([type='hidden']):not([type='file']), textarea";
      const input = container ? container.querySelector(sel) : null;
      if (input) {
        input.focus();
        const proto = input instanceof HTMLTextAreaElement ?
          HTMLTextAreaElement.prototype :
          HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(input, value);
        } else {
          input.value = value;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const labelDisplay = Array.isArray(labelNames) ? labelNames[0] : labelNames;
        console.log('✔ [Jira Assistant] Campo texto preenchido:', labelDisplay, '=>', value);
        return true;
      }
    } catch (e) {
      console.warn('Erro ao preencher texto:', labelNames, e);
    }
    return false;
  }

  function markdownToHtml(md) {
    if (!md || typeof md !== "string") return "";
    var html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, function(m, c) {
      return "<pre><code>" + c.trim() + "</code></pre>";
    });
    html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

    // Imagens Markdown: ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(_, alt, src) {
      return '<img src="' + src + '" alt="' + (alt || 'print') + '" class="evidence-card-img" style="max-width:100%; border-radius:8px; margin:8px 0;">';
    });

    var lines = html.split("\n");
    var formatted = [];
    var inList = false;
    var inOrderedList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.includes("<pre>") || line.includes("</pre>") || line.includes("<img")) {
        formatted.push(line);
        continue;
      }
      var ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (ulMatch) {
        if (!inList) { formatted.push("<ul>"); inList = true; }
        formatted.push("<li>" + ulMatch[1] + "</li>");
        continue;
      } else if (inList) {
        formatted.push("</ul>");
        inList = false;
      }
      var olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (olMatch) {
        if (!inOrderedList) { formatted.push("<ol>"); inOrderedList = true; }
        formatted.push("<li>" + olMatch[1] + "</li>");
        continue;
      } else if (inOrderedList) {
        formatted.push("</ol>");
        inOrderedList = false;
      }
      if (!line.trim()) {
        formatted.push("<p><br></p>");
      } else {
        formatted.push("<p>" + line + "</p>");
      }
    }
    if (inList) formatted.push("</ul>");
    if (inOrderedList) formatted.push("</ol>");
    return formatted.join("");
  }

  // 2. Preenchimento da Descrição (Editor Atlaskit / ProseMirror com negrito, código e listas)
  function fillDescription(value) {
    if (!value) return false;
    try {
      const lbl = findLabel('Descrição') || findLabel('Description');
      const container = findContainer(lbl);
      let editor = container ? container.querySelector("[contenteditable='true']") : null;
      if (!editor) {
        editor = document.querySelector(".ProseMirror[contenteditable='true'], [contenteditable='true']");
      }

      const html = markdownToHtml(value);

      if (editor) {
        editor.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);

        const ok = document.execCommand('insertHTML', false, html);
        if (!ok || !editor.innerText.trim()) {
          editor.innerHTML = html;
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
        console.log('✔ [Jira Assistant] Descrição formatada preenchida (negrito/código)');
        return true;
      } else {
        // Fallback para textarea comum se o editor não for contenteditable
        const textarea = container ? container.querySelector('textarea') : document.querySelector('textarea');
        if (textarea) {
          textarea.value = value;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    } catch (e) {
      console.warn('Erro ao preencher Descrição:', e);
    }
    return false;
  }

  // Aguarda assincronamente as opções aparecerem no DOM (polling ativo até 3.5s)
  async function waitForMatchingOption(targetValue, maxWaitMs = 3500) {
    const startTime = Date.now();
    const normTarget = normalizeStr(targetValue);
    const optSelectors = [
      "[id*='-option-']",
      "[role='option']",
      "div[class*='-option']:not([class*='container']):not([class*='menu'])",
      "div[class*='__option']:not([class*='container']):not([class*='menu'])",
      "[role='menuitem']",
      "li[role='option']",
      "div[data-testid*='option']"
    ];

    let fallbackCandidate = null;

    while (Date.now() - startTime < maxWaitMs) {
      const allElements = Array.from(document.querySelectorAll(optSelectors.join(', ')));

      for (const el of allElements) {
        const rawText = (el.innerText || el.textContent || '').trim();
        const normText = normalizeStr(rawText);

        // Ignora opções desabilitadas, indicadores de carregamento ou "nenhuma opção"
        if (el.getAttribute('aria-disabled') === 'true') continue;
        if (normText.includes('carregando') || normText.includes('loading') || normText.includes('pesquisando') || normText.includes('searching')) continue;
        if (normText.includes('nenhumaopcao') || normText.includes('nooptions') || normText.includes('nenhumresultado')) continue;
        if (!normText) continue;

        // Se encontrou texto válido, guarda como fallback caso não ache match exato
        if (!fallbackCandidate) {
          fallbackCandidate = el;
        }

        // Match exato ou início
        if (normText === normTarget || normText.startsWith(normTarget) || normTarget.startsWith(normText)) {
          console.log('🎯 [Jira Assistant] Match exato de opção encontrado:', rawText);
          return el;
        }

        // Match por inclusão mútua
        if (normText.includes(normTarget) || normTarget.includes(normText)) {
          console.log('🎯 [Jira Assistant] Match por inclusão de opção encontrado:', rawText);
          return el;
        }
      }

      await wait(80);
    }

    if (fallbackCandidate) {
      console.log('⚠️ [Jira Assistant] Usando primeira opção válida como fallback:', fallbackCandidate.innerText?.trim());
      return fallbackCandidate;
    }

    return null;
  }

  // 3. Fixação e clique real em seletores React (Produto, Prioridade, Cliente, Representante)
  async function selectReactOption(labelNames, targetValue) {
    if (!targetValue || targetValue === '-') return false;
    try {
      const lbl = findLabel(labelNames);
      const container = findContainer(lbl);
      if (!container) return false;

      const trigger = container.querySelector("[role='combobox'], [class*='control'], [class*='select__control'], button");
      const input = container.querySelector("input:not([type='hidden'])");

      // Se o container não possui dropdown/combobox, é um campo de texto convencional
      if (!trigger && input && !container.querySelector("[role='combobox'], [class*='control'], [class*='select']")) {
        input.focus();
        const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(input, targetValue);
        else input.value = targetValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const displayLbl = Array.isArray(labelNames) ? labelNames[0] : labelNames;
        console.log('✔ [Jira Assistant] Campo texto direto preenchido:', displayLbl, '=>', targetValue);
        return true;
      }

      // 1. Abre o dropdown clicando no trigger ou focando o input
      if (trigger) {
        trigger.focus?.();
        dispatchMouseSequence(trigger);
      } else if (input) {
        input.focus?.();
        dispatchMouseSequence(input);
      }

      await wait(250);

      // 2. Digita o termo no input de busca para filtrar as opções
      if (input) {
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, targetValue);
        else input.value = targetValue;

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: targetValue[0] || 'a', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: targetValue[0] || 'a', bubbles: true }));
      }

      // 3. Aguarda ativamente o Jira buscar e renderizar a opção no DOM (polling ativo até 3.5s)
      const matchingOption = await waitForMatchingOption(targetValue, 3500);

      if (matchingOption) {
        // Encontra o container da opção caso o elemento seja um span/label interno
        const optionContainer = matchingOption.closest("[role='option'], [id*='-option-'], [class*='-option'], [class*='__option']") || matchingOption;

        // Rola até o elemento
        optionContainer.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
        await wait(60);

        // Executa clique realista em ambos os níveis (container e elemento interno)
        dispatchMouseSequence(matchingOption);
        if (optionContainer !== matchingOption) {
          dispatchMouseSequence(optionContainer);
        }

        const displayLbl = Array.isArray(labelNames) ? labelNames[0] : labelNames;
        console.log('✔ [Jira Assistant] Opção clicada com sucesso:', displayLbl, '=>', matchingOption.innerText?.trim());
      }

      // 4. Teclado como garantia e confirmação (Enter e Tab no input)
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      }

      // 5. Notifica o script MAIN inpage_fiber para invocar SyntheticEvents do React
      const primaryLabel = Array.isArray(labelNames) ? labelNames[0] : labelNames;
      window.postMessage({
        source: 'JIRA_ASSISTANT_CONTENT',
        action: 'SELECT_REACT_OPTION',
        targetLabel: primaryLabel,
        searchValue: targetValue
      }, '*');

      await wait(200);

      // 6. Verificação: se o menu ainda estiver aberto, envia ArrowDown + Enter
      const isMenuStillOpen = document.querySelector("[role='listbox'], div[class*='-menu'], div[data-ds--menu--container]");
      if (isMenuStillOpen && input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true }));
        await wait(50);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }

      await wait(250);
      return true;
    } catch (e) {
      console.warn('Erro ao selecionar opção React:', labelNames, e);
      return false;
    }
  }

  // 3. Anexação de imagens de evidência ao chamado no Jira
  async function attachImagesToJira(images) {
    if (!Array.isArray(images) || images.length === 0) return 0;
    try {
      console.log(`📸 [Jira Assistant] Processando ${images.length} imagem(ns) de evidência...`);
      const files = [];
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const dataUrl = typeof item === 'string' ? item : (item.dataUrl || '');
        const fname = (typeof item === 'object' && item.name) ? item.name : `evidencia_${i + 1}.png`;
        if (!dataUrl || !dataUrl.includes(',')) continue;

        try {
          const parts = dataUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const byteCharacters = atob(parts[1]);
          const byteArrays = new Uint8Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            byteArrays[j] = byteCharacters.charCodeAt(j);
          }
          files.push(new File([byteArrays], fname, { type: mime }));
        } catch (err) {
          console.warn('Erro ao decodificar imagem:', fname, err);
        }
      }

      if (files.length === 0) return 0;

      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));

      let attached = false;

      // A. Injeta no input[type='file'] de anexo do Jira
      const fileInputs = Array.from(document.querySelectorAll("input[type='file']"));
      const attachmentInput = fileInputs.find(inp => {
        const name = (inp.name || inp.id || inp.getAttribute('data-testid') || '').toLowerCase();
        return name.includes('attach') || name.includes('file') || name.includes('media') || inp.multiple;
      }) || fileInputs[0];

      if (attachmentInput) {
        try {
          attachmentInput.files = dt.files;
          attachmentInput.dispatchEvent(new Event('change', { bubbles: true }));
          attachmentInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('✔ [Jira Assistant] Arquivos anexados ao input[type=file]');
          attached = true;
        } catch (e) {
          console.warn('Erro ao definir input de arquivo:', e);
        }
      }

      // B. Dispara drop em dropzones de anexo do Jira
      const dropzones = Array.from(document.querySelectorAll("[data-testid*='attachment'], [data-testid*='media-picker'], [data-testid*='drop'], .issue-drop-zone, .dropzone, [class*='attachment'], [class*='drop-zone']"));
      for (const dz of dropzones) {
        try {
          dz.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
          dz.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
          dz.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
          attached = true;
        } catch (e) {}
      }

      // C. Dispara evento de paste no editor ProseMirror da Descrição (Jira intercepta e anexa)
      try {
        const editor = document.querySelector(".ProseMirror[contenteditable='true'], [contenteditable='true']");
        if (editor) {
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
          });
          editor.dispatchEvent(pasteEvent);
          console.log('✔ [Jira Assistant] Evento paste de evidência enviado ao editor ProseMirror');
          attached = true;
        }
      } catch (e) {}

      console.log('✔ [Jira Assistant] Evidências anexadas com sucesso!');
      return files.length;
    } catch (e) {
      console.warn('Erro ao anexar imagens:', e);
      return 0;
    }
  }

  // Execução do preenchimento completo
  async function executeFormFill(ticketData) {
    if (!ticketData) {
      showFloatingToast('Nenhum dado de chamado encontrado. Gere no assistente primeiro!', '⚠️');
      return;
    }

    showFloatingToast('⚡ Preenchendo campos e selecionando opções...', '⏳');

    const fields = ticketData.fields || {};
    const titulo = ticketData.titulo || '';
    const descricao = ticketData.descricao || '';
    const cliente = fields.Cliente || 'Nina';
    const produto = fields.Produto || 'ninachat';
    const prioridade = fields.Prioridade || 'Baixo';
    const representante = 'Wander'; // O representante sempre vai ser Wander
    const numeroChamado = fields.NumeroChamado || '-';
    const images = ticketData.images || [];

    // 1. Textos
    fillTextInput(['Título', 'Summary', 'Titulo', 'Assunto'], titulo);
    fillDescription(descricao);
    if (numeroChamado && numeroChamado !== '-') {
      fillTextInput(['Número do chamado', 'Numero chamado', 'Chamado', 'Ticket', 'Protocolo'], numeroChamado);
    }

    await wait(300);

    // 2. Seletores React / Dropdowns com cliques reais e aliases
    await selectReactOption(['Produto', 'Product', 'Sistema', 'Módulo'], produto);
    await selectReactOption(['Prioridade', 'Priority', 'Urgência'], prioridade);
    await selectReactOption(['Cliente', 'Client', 'Empresa', 'Conta'], cliente);

    // Representante do Cliente (suporte explícito a "Representante do Cliente*")
    const reprAliases = [
      'Representante do Cliente',
      'Representante do cliente',
      'Representante do Cliente*',
      'Representante Cliente',
      'Representante',
      'Representative',
      'Responsável pelo Cliente'
    ];
    const reprOk = await selectReactOption(reprAliases, representante);
    if (!reprOk) {
      fillTextInput(reprAliases, representante);
    }

    // 3. Anexo de Prints e Evidências ao Chamado
    if (Array.isArray(images) && images.length > 0) {
      await wait(250);
      await attachImagesToJira(images);
    }

    const toastMsg = images && images.length > 0
      ? `✔ Chamado preenchido e ${images.length} print(s) anexado(s)! Pronto para revisão.`
      : '✔ Chamado preenchido com sucesso! Pronto para revisão.';

    showFloatingToast(toastMsg, '🎉');
  }

  // Exponibiliza no escopo global para invocação direta do popup via executeScript
  window.__JIRA_ASSISTANT_FILL__ = executeFormFill;

  // Toast flutuante visual na tela do Jira
  function showFloatingToast(msg, icon = '⚡') {
    let toast = document.getElementById('jira-ai-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'jira-ai-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 2147483647;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #10b981;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(16,185,129,0.3);
        padding: 12px 18px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span> <span>${msg}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(window.__jiraToastTimer);
    window.__jiraToastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
    }, 4500);
  }

  // Cria o botão flutuante discreto na tela do Jira
  function injectFloatingButton() {
    // Só injeta se a página contiver algum indício de formulário ou labels
    if (document.getElementById('jira-ai-floating-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'jira-ai-floating-btn';
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      background: linear-gradient(135deg, #059669, #0d9488);
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 30px;
      box-shadow: 0 8px 20px rgba(5,150,105,0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      transition: all 0.2s ease;
      border: 1px solid rgba(255,255,255,0.2);
    `;

    btn.innerHTML = `
      <span style="font-size: 15px;">⚡</span>
      <span>Preencher com Jira AI</span>
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 12px 24px rgba(5,150,105,0.5)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 8px 20px rgba(5,150,105,0.4)';
    });

    btn.addEventListener('click', () => {
      chrome.storage.local.get(['currentTicket'], (res) => {
        if (res.currentTicket) {
          executeFormFill(res.currentTicket);
        } else {
          showFloatingToast('Nenhum chamado no assistente. Abra http://localhost:3000 e gere um chamado!', 'ℹ️');
        }
      });
    });

    document.body.appendChild(btn);
  }

  // Monitora requisições vindas do popup da extensão
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'FILL_FORM') {
      executeFormFill(request.ticketData)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(err => {
          console.warn('Erro ao executar preenchimento:', err);
          sendResponse({ success: false, error: err?.message });
        });
      return true; // Mantém o canal aberto para resposta assíncrona
    }
  });

  // Tenta injetar o botão flutuante quando o DOM estiver pronto
  setTimeout(injectFloatingButton, 1200);
  // Re-tenta caso a página do Jira carregue componentes dinamicamente
  setInterval(injectFloatingButton, 3000);
})();
