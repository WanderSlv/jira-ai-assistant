/**
 * Gerador de scripts JavaScript para preenchimento ágil e seguro no console do Jira.
 */

/**
 * Extrai produto, cliente e número de chamado da explicação bruta caso existam.
 * O representante sempre será 'Wander'.
 */
function extractFieldsFromRawText(rawText) {
  const result = {
    cliente: undefined,
    produto: undefined,
    numeroChamado: undefined,
    representante: 'Wander'
  };

  if (!rawText || typeof rawText !== 'string') {
    return result;
  }

  const text = rawText.trim();
  if (!text) {
    return result;
  }

  // 1. Extração do Número do Chamado
  // Padrões com rótulo: "chamado: 1234", "ticket #456", "número do chamado: 789", "protocolo: 999", "movidesk: 123"
  const ticketLabelRegex = /(?:n[úu]mero\s+(?:do\s+)?chamado|n[úu]m(?:ero|\.)?\s*(?:do\s+)?chamado|n[º°]\s*(?:do\s+)?chamado|chamado|ticket|protocolo|issue|card|movidesk)\s*[:#º°\s=-]*\s*([A-Za-z0-9_-]+)/i;
  const hashTicketRegex = /#([0-9]{3,})/;

  const invalidTickets = new Set([
    'aberto', 'fechado', 'novo', 'urgente', 'critico', 'crítico', 'duvida', 'dúvida',
    'de', 'da', 'do', 'em', 'para', 'no', 'na', 'que', 'erro', 'bug', 'teste', 'falha'
  ]);

  const ticketMatch = text.match(ticketLabelRegex);
  if (ticketMatch && ticketMatch[1]) {
    const rawVal = ticketMatch[1].replace(/^#+/, '').replace(/[.,;:]+$/, '').trim();
    const isInvalid = invalidTickets.has(rawVal.toLowerCase()) && !/\d/.test(rawVal);
    if (rawVal && !isInvalid) {
      result.numeroChamado = rawVal;
    }
  }

  if (!result.numeroChamado) {
    const hashMatch = text.match(hashTicketRegex);
    if (hashMatch && hashMatch[1]) {
      result.numeroChamado = hashMatch[1].trim();
    }
  }

  // 2. Extração do Produto
  // A. Rótulo explícito: "produto: ninachat", "produto - ninaflow", "módulo: portal"
  const prodLabelRegex = /(?:produto|product|m[óo]dulo|sistema)\s*[:=–-]\s*([^\n,;]+)/i;
  const prodMatch = text.match(prodLabelRegex);

  if (prodMatch && prodMatch[1]) {
    const p = prodMatch[1].replace(/^["']+|["']+$/g, '').replace(/[.,;:]+$/, '').trim();
    if (p.length >= 2 && p.length <= 40) {
      result.produto = p;
    }
  }

  // B. Se não encontrou por rótulo, busca por produtos conhecidos da Nina Tecnologia
  if (!result.produto) {
    const knownProducts = [
      { pattern: /\b(?:nina\s*chat|ninachat)\b/i, value: 'ninachat' },
      { pattern: /\b(?:nina\s*flow|ninaflow)\b/i, value: 'ninaflow' },
      { pattern: /\b(?:nina\s*forms?|ninaforms?)\b/i, value: 'ninaforms' },
      { pattern: /\b(?:nina\s*studio|ninastudio)\b/i, value: 'ninastudio' },
      { pattern: /\bportal(?:\s+do\s+cliente)?\b/i, value: 'portal' },
      { pattern: /\b(?:whatsapp|waba)\b/i, value: 'whatsapp' },
      { pattern: /\bcrm\b/i, value: 'crm' },
      { pattern: /\b(?:bot|chatbot)\b/i, value: 'ninachat' }
    ];

    for (const kp of knownProducts) {
      if (kp.pattern.test(text)) {
        result.produto = kp.value;
        break;
      }
    }
  }

  // 3. Extração do Cliente
  // A. Rótulo explícito: "cliente: Hospital ABC", "cliente = Unimed", "empresa: Renner"
  const clientLabelRegex = /(?:cliente|client|empresa|conta)\s*[:=–-]\s*([^\n,;]+)/i;
  const clientMatch = text.match(clientLabelRegex);

  const invalidClients = new Set([
    'que', 'ele', 'ela', 'o', 'a', 'os', 'as', 'um', 'uma', 'novo', 'antigo', 'teste', 'geral', 'padrão'
  ]);

  if (clientMatch && clientMatch[1]) {
    const c = clientMatch[1].replace(/^["']+|["']+$/g, '').replace(/[.,;:]+$/, '').trim();
    if (c.length >= 2 && c.length <= 60 && !invalidClients.has(c.toLowerCase())) {
      result.cliente = c;
    }
  }

  // B. Frases naturais: "do cliente Unimed...", "cliente Renner relatou..."
  if (!result.cliente) {
    const clientPhrasesRegex = /(?:do|da|pro|para o|para a)\s+cliente\s+([A-Za-z0-9À-ÿ\s.'"-]+?)(?=(?:\s+no|\s+na|\s+com|\s+para|\s+relatou|\s+abriu|\s+informou|\s+reclamou|\s+chamado|[,\.\n]|$))/i;
    const clientPhraseMatch = text.match(clientPhrasesRegex);

    if (clientPhraseMatch && clientPhraseMatch[1]) {
      const c = clientPhraseMatch[1].replace(/^["']+|["']+$/g, '').replace(/[.,;:]+$/, '').trim();
      if (c.length >= 2 && c.length <= 60 && !invalidClients.has(c.toLowerCase())) {
        result.cliente = c;
      }
    }
  }

  if (!result.cliente) {
    const clientRelatouRegex = /\bcliente\s+([A-Za-z0-9À-ÿ\s.'"-]+?)(?=(?:\s+relatou|\s+abriu|\s+informou|\s+reclamou|\s+chamado|[,\.\n]|$))/i;
    const clientRelatouMatch = text.match(clientRelatouRegex);

    if (clientRelatouMatch && clientRelatouMatch[1]) {
      const c = clientRelatouMatch[1].replace(/^["']+|["']+$/g, '').replace(/[.,;:]+$/, '').trim();
      if (c.length >= 2 && c.length <= 60 && !invalidClients.has(c.toLowerCase())) {
        result.cliente = c;
      }
    }
  }

  return result;
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
    return '<img src="' + src + '" alt="' + (alt || 'print') + '" class="evidence-card-img rounded-lg max-h-72 my-2 border border-slate-700 shadow-md" style="max-width:100%; border-radius:8px; margin:8px 0;">';
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

function htmlToMarkdown(html) {
  if (!html || typeof html !== "string") return "";
  var md = html;

  // Bloco de código: <pre><code>...</code></pre> ou <pre>...</pre>
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, function(_, code) {
    var cleanCode = code.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    return "\n```\n" + cleanCode.trim() + "\n```\n";
  });
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, function(_, code) {
    var cleanCode = code.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    return "\n```\n" + cleanCode.trim() + "\n```\n";
  });

  // Código inline: <code>...</code>
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, function(_, inlineCode) {
    var cleanInline = inlineCode.replace(/<[^>]+>/g, "").trim();
    return "`" + cleanInline + "`";
  });

  // Negrito: <strong>...</strong> ou <b>...</b>
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, function(_, tag, content) {
    var trimmed = content.trim();
    if (!trimmed) return "";
    return "**" + trimmed + "**";
  });

  // Itálico: <em>...</em> ou <i>...</i>
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, function(_, tag, content) {
    var trimmed = content.trim();
    if (!trimmed) return "";
    return "*" + trimmed + "*";
  });

  // Listas ordenadas: <ol><li>...</li></ol>
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, function(_, inner) {
    var index = 1;
    var listMd = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, function(__, item) {
      var cleanItem = item.replace(/<br\s*\/?>/gi, " ").trim();
      return (index++) + ". " + cleanItem + "\n";
    });
    return "\n" + listMd + "\n";
  });

  // Listas com marcadores: <ul><li>...</li></ul>
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, function(_, inner) {
    var listMd = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, function(__, item) {
      var cleanItem = item.replace(/<br\s*\/?>/gi, " ").trim();
      return "- " + cleanItem + "\n";
    });
    return "\n" + listMd + "\n";
  });

  // Imagens: <img ... src="..." ...> -> ![alt](src)
  md = md.replace(/<img[^>]*\s+src=["']([^"']+)["'][^>]*\s+alt=["']([^"']*)["'][^>]*>/gi, function(_, src, alt) {
    return "![" + (alt || "print") + "](" + src + ")";
  });
  md = md.replace(/<img[^>]*\s+alt=["']([^"']*)["'][^>]*\s+src=["']([^"']+)["'][^>]*>/gi, function(_, alt, src) {
    return "![" + (alt || "print") + "](" + src + ")";
  });
  md = md.replace(/<img[^>]*\s+src=["']([^"']+)["'][^>]*>/gi, function(_, src) {
    return "![print](" + src + ")";
  });

  // Quebras de linha e blocos de parágrafo
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<\/p>/gi, "\n\n");
  md = md.replace(/<\/div>/gi, "\n");
  md = md.replace(/<p[^>]*>/gi, "");
  md = md.replace(/<div[^>]*>/gi, "");

  // Remove qualquer tag HTML restante
  md = md.replace(/<[^>]+>/g, "");

  // Decodifica entidades HTML
  md = md.replace(/&nbsp;/gi, " ")
         .replace(/&amp;/gi, "&")
         .replace(/&lt;/gi, "<")
         .replace(/&gt;/gi, ">")
         .replace(/&quot;/gi, "\"")
         .replace(/&#39;/gi, "'");

  // Normaliza quebras de linha consecutivas
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

function chunkString(str, maxChunkSize = 50) {
  if (!str || typeof str !== 'string') {
    return ['""'];
  }
  const chunks = [];
  for (let i = 0; i < str.length; i += maxChunkSize) {
    chunks.push(JSON.stringify(str.slice(i, i + maxChunkSize)));
  }
  return chunks.length ? chunks : ['""'];
}

function generateJiraScript(options = {}) {
  const {
    titulo = '',
    descricao = '',
    fields = {},
    images = []
  } = options;

  const cliente = fields.Cliente || 'Nina';
  const produto = fields.Produto || 'ninachat';
  const prioridade = fields.Prioridade || 'Baixo';
  const representante = 'Wander'; // O representante sempre vai ser Wander
  const numeroChamado = fields.NumeroChamado || '-';

  const descChunks = chunkString(descricao, 50);
  const jsonTitulo = JSON.stringify(titulo);
  const jsonNumero = JSON.stringify(numeroChamado);
  const jsonCliente = JSON.stringify(cliente);
  const jsonProduto = JSON.stringify(produto);
  const jsonPrioridade = JSON.stringify(prioridade);
  const jsonRepresentante = JSON.stringify(representante);

  const sanitizedImages = (Array.isArray(images) ? images : []).map(function(img) {
    if (typeof img === 'string') return { name: 'print.png', dataUrl: img };
    return { name: img.name || 'print.png', dataUrl: img.dataUrl || '' };
  }).filter(function(img) {
    return Boolean(img.dataUrl);
  });
  const jsonImagens = JSON.stringify(sanitizedImages);

  return `(async function() {
  console.log("=== PREENCHIMENTO AUTOMÁTICO JIRA ===");

  function wait(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  // Simula o clique real do mouse e ponteiro exigido pelo React-Select
  function simularCliqueReal(elemento) {
    if (!elemento) return;
    try {
      var rect = elemento.getBoundingClientRect ? elemento.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      var cx = rect.left + Math.max(1, rect.width / 2);
      var cy = rect.top + Math.max(1, rect.height / 2);
      var base = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };

      elemento.dispatchEvent(new MouseEvent("mouseenter", base));
      elemento.dispatchEvent(new MouseEvent("mouseover", base));

      var eventos = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
      for (var i = 0; i < eventos.length; i++) {
        var ev = eventos[i];
        var isDown = (ev === "pointerdown" || ev === "mousedown");
        var opts = Object.assign({}, base, { buttons: isDown ? 1 : 0 });
        if (ev.indexOf("pointer") === 0 && typeof window.PointerEvent === "function") {
          elemento.dispatchEvent(new PointerEvent(ev, Object.assign({}, opts, { pointerId: 1, pointerType: "mouse", isPrimary: true })));
        } else {
          elemento.dispatchEvent(new MouseEvent(ev, opts));
        }
      }

      if (typeof elemento.click === "function") elemento.click();
    } catch (e) {
      console.warn("Erro ao simular clique:", e);
    }
  }

  function normalizar(s) {
    if (!s) return "";
    return s.toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[\\s_.,-]+/g, "");
  }

  function acharLabel(textoOuLista) {
    var alvos = (Array.isArray(textoOuLista) ? textoOuLista : [textoOuLista])
      .map(normalizar)
      .filter(Boolean);
    var elementos = Array.from(document.querySelectorAll("label, div, span, p, strong, b"));

    for (var i = 0; i < alvos.length; i++) {
      var t = alvos[i];
      var achado = elementos.find(function(el) {
        var raw = (el.innerText || el.textContent || "").trim();
        if (raw.length > 80) return false;
        var norm = normalizar(raw);
        return norm === t || norm === t + "*" || norm.replace(/\\*+$/, "") === t;
      });
      if (achado) return achado;
    }

    for (var j = 0; j < alvos.length; j++) {
      var termo = alvos[j];
      if (termo.length < 3) continue;
      var matchInclusao = elementos.find(function(el) {
        var raw = (el.innerText || el.textContent || "").trim();
        if (raw.length > 80) return false;
        var norm = normalizar(raw).replace(/\\*+$/, "");
        return norm === termo || norm.includes(termo) || termo.includes(norm);
      });
      if (matchInclusao) return matchInclusao;
    }

    return null;
  }

  function acharContainer(lbl) {
    if (!lbl) return null;
    var forAttr = lbl.getAttribute && (lbl.getAttribute("for") || lbl.getAttribute("htmlfor"));
    if (forAttr) {
      var targetEl = document.getElementById(forAttr);
      if (targetEl) return targetEl.closest("div[class*='field'], div[class*='form-group'], div") || targetEl.parentElement;
    }
    var c = lbl.parentElement;
    for (var i = 0; i < 7 && c; i++) {
      if (c.querySelector("input:not([type='hidden']), textarea, [contenteditable='true'], [role='combobox'], [class*='control'], [class*='select']")) return c;
      c = c.parentElement;
    }
    if (lbl.parentElement && lbl.parentElement.nextElementSibling) {
      var sibling = lbl.parentElement.nextElementSibling;
      if (sibling.querySelector("input:not([type='hidden']), textarea, [role='combobox'], [class*='control']")) return sibling;
    }
    return lbl.parentElement;
  }

  // 1. Campos de texto padrão (Título e Número do chamado)
  function preencherInput(chave, valor) {
    try {
      var lbl = acharLabel(chave);
      var container = acharContainer(lbl);
      var sel = "input:not([type='hidden']):not([type='file']), textarea";
      var input = container ? container.querySelector(sel) : null;
      if (input) {
        input.focus();
        var proto = input instanceof HTMLTextAreaElement ?
          HTMLTextAreaElement.prototype :
          HTMLInputElement.prototype;
        var setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        if (setter) setter.call(input, valor);
        else input.value = valor;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        var nomeChave = Array.isArray(chave) ? chave[0] : chave;
        console.log("✔ Campo texto preenchido: " + nomeChave);
      }
    } catch (e) {
      console.warn("Erro ao preencher " + chave, e);
    }
  }

  ${markdownToHtml.toString()}

  // 2. Descrição (Editor de texto rico / contenteditable com negrito e código)
  function preencherDescricao(valor) {
    try {
      var html = markdownToHtml(valor);
      var lbl = acharLabel(["Descrição", "Description"]);
      var container = acharContainer(lbl);
      var editor = container ?
        container.querySelector("[contenteditable='true']") : null;
      if (!editor) editor = document.querySelector("[contenteditable='true']");
      if (editor) {
        editor.focus();
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);

        var ok = document.execCommand("insertHTML", false, html);
        if (!ok || !editor.innerText.trim()) {
          editor.innerHTML = html;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }
        console.log("✔ Descrição rica preenchida (com negrito, código e listas)");
      }
    } catch (e) {
      console.warn("Erro ao preencher Descrição", e);
    }
  }

  // 3. Seletores React com espera ativa e clique real
  async function fixarSeletor(chave, termoBusca) {
    if (!termoBusca || termoBusca === "-") return;
    try {
      var lbl = acharLabel(chave);
      var container = acharContainer(lbl);
      var input = container ? container.querySelector("input:not([type='hidden'])") : null;
      var trigger = container ?
        container.querySelector("[role='combobox'], button, [class*='control'], [class*='select__control']") : null;

      // Se for input de texto simples sem combobox
      if (!trigger && input && !container.querySelector("[role='combobox'], [class*='control'], [class*='select']")) {
        preencherInput(chave, termoBusca);
        return;
      }

      if (trigger) simularCliqueReal(trigger);
      else if (input) simularCliqueReal(input);
      await wait(250);

      if (input) {
        input.focus();
        var setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, "value"
        )?.set;
        if (setter) setter.call(input, termoBusca);
        else input.value = termoBusca;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: termoBusca[0] || "a", bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keyup", { key: termoBusca[0] || "a", bubbles: true }));

        // Polling ativo aguardando a opção ser renderizada após a busca
        var tBusca = termoBusca.toString().toLowerCase().replace(/[\\s_-]+/g, "");
        var selOpt = "[id*='-option-'], [role='option'], div[class*='-option']:not([class*='container']), [role='menuitem'], li[role='option']";
        var opcaoEncontrada = null;
        var inicio = Date.now();

        while (Date.now() - inicio < 3500) {
          var opcoes = Array.from(document.querySelectorAll(selOpt)).filter(function(el) {
            var raw = (el.innerText || el.textContent || "").trim();
            var txt = raw.toLowerCase().replace(/[\\s_-]+/g, "");
            if (el.getAttribute("aria-disabled") === "true") return false;
            if (txt.includes("carregando") || txt.includes("loading") || txt.includes("pesquisando")) return false;
            if (txt.includes("nenhumaopcao") || txt.includes("nooptions")) return false;
            return txt && (txt === tBusca || txt.includes(tBusca) || tBusca.includes(txt));
          });

          if (opcoes.length > 0) {
            opcaoEncontrada = opcoes[0];
            break;
          }
          await wait(80);
        }

        if (opcaoEncontrada) {
          var optContainer = opcaoEncontrada.closest("[role='option'], [id*='-option-'], [class*='-option']") || opcaoEncontrada;
          optContainer.scrollIntoView?.({ block: "nearest", behavior: "instant" });
          await wait(50);
          simularCliqueReal(opcaoEncontrada);
          if (optContainer !== opcaoEncontrada) simularCliqueReal(optContainer);
          var nomeExib = Array.isArray(chave) ? chave[0] : chave;
          console.log("✔ Fixado: " + nomeExib + " -> " + opcaoEncontrada.innerText.trim());
        }

        // Teclado Enter como confirmação
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      }
      await wait(300);
    } catch (e) {
      console.warn("Erro ao fixar " + chave, e);
    }
  }

  // Divide descrição em pedaços de até 50 caracteres para segurança ao colar no console
  var pedacosDescricao = [
    ${descChunks.join(',\n    ')}
  ];
  var textoDescricao = pedacosDescricao.join("");

  // Preenchimento de campos de texto
  preencherInput(["Título", "Summary", "Assunto"], ${jsonTitulo});
  preencherDescricao(textoDescricao);
  preencherInput(["Número do chamado", "Numero chamado", "Chamado"], ${jsonNumero});

  await wait(300);

  // Fixação de seletores React (Produto, Prioridade, Cliente, Representante)
  await fixarSeletor(["Produto", "Product", "Módulo"], ${jsonProduto});
  await fixarSeletor(["Prioridade", "Priority"], ${jsonPrioridade});
  await fixarSeletor(["Cliente", "Client", "Empresa"], ${jsonCliente});
  await fixarSeletor(["Representante do Cliente", "Representante do cliente", "Representante", "Representative"], ${jsonRepresentante});

  await wait(250);

  // 4. Anexar imagens de evidência ao Jira (via input file, dropzone e editor)
  async function anexarImagensNoJira(imgs) {
    if (!Array.isArray(imgs) || imgs.length === 0) return;
    try {
      console.log("📸 [Jira] Anexando " + imgs.length + " evidência(s)...");
      var files = [];
      for (var i = 0; i < imgs.length; i++) {
        var item = imgs[i];
        var dUrl = item.dataUrl || "";
        var fname = item.name || ("print_" + (i + 1) + ".png");
        if (!dUrl || dUrl.indexOf(",") === -1) continue;
        try {
          var partes = dUrl.split(",");
          var mimeM = partes[0].match(/:(.*?);/);
          var mime = mimeM ? mimeM[1] : "image/png";
          var bstr = atob(partes[1]);
          var n = bstr.length;
          var u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          files.push(new File([u8arr], fname, { type: mime }));
        } catch (decErr) {
          console.warn("Erro ao decodificar imagem:", fname, decErr);
        }
      }

      if (files.length === 0) return;

      var dt = new DataTransfer();
      for (var f = 0; f < files.length; f++) {
        dt.items.add(files[f]);
      }

      // Injeta no input[type='file'] se houver
      var fileInputs = Array.from(document.querySelectorAll("input[type='file']"));
      var anexoInput = fileInputs.find(function(inp) {
        var n = (inp.name || inp.id || inp.getAttribute("data-testid") || "").toLowerCase();
        return n.includes("attach") || n.includes("file") || n.includes("media") || inp.multiple;
      }) || fileInputs[0];

      if (anexoInput) {
        try {
          anexoInput.files = dt.files;
          anexoInput.dispatchEvent(new Event("change", { bubbles: true }));
          anexoInput.dispatchEvent(new Event("input", { bubbles: true }));
          console.log("✔ [Jira] Arquivos vinculados ao input de anexo");
        } catch (inpErr) {
          console.warn("Aviso ao definir input de arquivos:", inpErr);
        }
      }

      // Dispara evento drop em dropzones
      var dropzones = Array.from(document.querySelectorAll("[data-testid*='attachment'], [data-testid*='media-picker'], [data-testid*='drop'], .issue-drop-zone, .dropzone, [class*='attachment'], [class*='drop-zone']"));
      for (var d = 0; d < dropzones.length; d++) {
        try {
          var dz = dropzones[d];
          dz.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }));
          dz.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
          dz.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
        } catch (dzErr) {}
      }

      // Dispara paste de imagem no editor ProseMirror
      try {
        var ed = document.querySelector(".ProseMirror[contenteditable='true'], [contenteditable='true']");
        if (ed) {
          var pasteEv = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt });
          ed.dispatchEvent(pasteEv);
          console.log("✔ [Jira] Evento paste de imagem enviado ao editor");
        }
      } catch (pErr) {}

      console.log("✔ [Jira] Evidências anexadas com sucesso ao card!");
    } catch (e) {
      console.warn("Erro ao anexar imagens:", e);
    }
  }

  // 5. Anexação de prints e evidências ao chamado
  var listaEvidencias = ${jsonImagens};
  if (listaEvidencias && listaEvidencias.length > 0) {
    await wait(250);
    await anexarImagensNoJira(listaEvidencias);
  }

  console.log("=== PREENCHIMENTO CONCLUÍDO (Pronto para revisão - NUNCA clica em Enviar) ===");
})();`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateJiraScript, chunkString, extractFieldsFromRawText, markdownToHtml, htmlToMarkdown };
}
