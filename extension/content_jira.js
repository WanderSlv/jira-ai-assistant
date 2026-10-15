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

  // Disparo de sequência completa de ponteiro e mouse para simular clique real do usuário
  function dispatchMouseSequence(element) {
    if (!element) return;
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    for (let i = 0; i < events.length; i++) {
      element.dispatchEvent(new MouseEvent(events[i], {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: 1
      }));
    }
  }

  function findLabel(text) {
    const elements = Array.from(document.querySelectorAll('label, div, span, p'));
    const t = text.toLowerCase();
    return elements.find(el => {
      const inner = (el.innerText || el.textContent || '').trim().toLowerCase();
      return inner === t ||
             inner === t + '*' ||
             (inner.startsWith(t) && inner.length <= t.length + 3);
    });
  }

  function findContainer(lbl) {
    let c = lbl ? lbl.parentElement : null;
    for (let i = 0; i < 6 && c; i++) {
      if (c.querySelector("input, textarea, [contenteditable='true'], [role='combobox'], [class*='control']")) {
        return c;
      }
      c = c.parentElement;
    }
    return lbl ? lbl.parentElement : null;
  }

  // 1. Preenchimento de campos de texto (Título, Número do chamado)
  function fillTextInput(labelName, value) {
    if (!value || value === '-') return false;
    try {
      const lbl = findLabel(labelName);
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
        console.log('✔ [Jira Assistant] Campo texto preenchido:', labelName, '=>', value);
        return true;
      }
    } catch (e) {
      console.warn('Erro ao preencher texto:', labelName, e);
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

    var lines = html.split("\n");
    var formatted = [];
    var inList = false;
    var inOrderedList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.includes("<pre>") || line.includes("</pre>")) {
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

  // 3. Fixação e clique real em seletores React (Produto, Prioridade, Cliente, Representante)
  async function selectReactOption(labelName, targetValue) {
    if (!targetValue || targetValue === '-') return false;
    try {
      const lbl = findLabel(labelName);
      const container = findContainer(lbl);
      if (!container) return false;

      const trigger = container.querySelector("[role='combobox'], [class*='control'], [class*='select__control'], button");
      const input = container.querySelector("input:not([type='hidden'])");

      // Abre o dropdown
      if (trigger) {
        trigger.focus?.();
        dispatchMouseSequence(trigger);
      } else if (input) {
        input.focus?.();
        dispatchMouseSequence(input);
      }

      await wait(300);

      // Digita o termo no input de busca para filtrar as opções
      if (input) {
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, targetValue);
        else input.value = targetValue;

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: targetValue[0] || 'a', bubbles: true }));
      }

      await wait(500);

      // Busca a opção em todo o DOM (incluindo o Portal no <body> do React)
      const tBusca = targetValue.toLowerCase().replace(/[\s_-]+/g, '');
      const optSelectors = [
        "[id*='react-select-'][id*='-option-']",
        "[role='option']",
        "[role='menuitem']",
        "div[class*='-option']",
        "div[class*='option']",
        "div[id*='react-select']",
        "li[role='option']"
      ];

      const allOptions = Array.from(document.querySelectorAll(optSelectors.join(', ')));
      const matching = allOptions.find(opt => {
        const txt = (opt.innerText || opt.textContent || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
        return txt === tBusca || txt.includes(tBusca) || tBusca.includes(txt);
      }) || allOptions[0];

      if (matching) {
        matching.scrollIntoView?.({ block: 'nearest' });
        dispatchMouseSequence(matching);
        console.log('✔ [Jira Assistant] Opção clicada com sucesso:', labelName, '=>', matching.innerText.trim());
      } else if (input) {
        // Fallback por tecla Enter
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }

      // Notifica o inpage_fiber para fallback de React Props
      window.postMessage({
        source: 'JIRA_ASSISTANT_CONTENT',
        action: 'SELECT_REACT_OPTION',
        targetLabel: labelName,
        searchValue: targetValue
      }, '*');

      await wait(350);
      return true;
    } catch (e) {
      console.warn('Erro ao selecionar opção React:', labelName, e);
      return false;
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

    // 1. Textos
    fillTextInput('Título', titulo);
    fillTextInput('Summary', titulo);
    fillDescription(descricao);
    if (numeroChamado && numeroChamado !== '-') {
      fillTextInput('Número do chamado', numeroChamado);
      fillTextInput('Numero chamado', numeroChamado);
      fillTextInput('Chamado', numeroChamado);
    }

    await wait(300);

    // 2. Seletores React com cliques reais
    await selectReactOption('Produto', produto);
    await selectReactOption('Prioridade', prioridade);
    await selectReactOption('Cliente', cliente);
    await selectReactOption('Representante', representante);

    showFloatingToast('✔ Chamado preenchido com sucesso! Pronto para revisão.', '🎉');
  }

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
    if (request.action === 'FILL_FORM') {
      executeFormFill(request.ticketData);
      sendResponse({ success: true });
    }
    return true;
  });

  // Tenta injetar o botão flutuante quando o DOM estiver pronto
  setTimeout(injectFloatingButton, 1200);
  // Re-tenta caso a página do Jira carregue componentes dinamicamente
  setInterval(injectFloatingButton, 3000);
})();
