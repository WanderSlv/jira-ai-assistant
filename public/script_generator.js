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
    fields = {}
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

  return `(async function() {
  console.log("=== PREENCHIMENTO AUTOMÁTICO JIRA ===");

  function wait(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  // Simula o clique real do mouse exigido pelo React-Select
  function simularCliqueReal(elemento) {
    if (!elemento) return;
    var eventos = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    for (var i = 0; i < eventos.length; i++) {
      elemento.dispatchEvent(new MouseEvent(eventos[i], {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }
  }

  function acharLabel(texto) {
    var elementos = Array.from(document.querySelectorAll("label, div, span, p"));
    var t = texto.toLowerCase();
    return elementos.find(function(el) {
      var inner = (el.innerText || "").trim().toLowerCase();
      return inner === t ||
             inner === t + "*" ||
             (inner.startsWith(t) && inner.length <= t.length + 3);
    });
  }

  function acharContainer(lbl) {
    var c = lbl ? lbl.parentElement : null;
    for (var i = 0; i < 5 && c; i++) {
      if (c.querySelector("input, textarea, [contenteditable='true']")) return c;
      c = c.parentElement;
    }
    return lbl ? lbl.parentElement : null;
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
        console.log("✔ Campo texto preenchido: " + chave);
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
      var lbl = acharLabel("Descrição");
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

  // 3. Seletores React com mousedown real
  async function fixarSeletor(chave, termoBusca) {
    try {
      var lbl = acharLabel(chave);
      var container = acharContainer(lbl);
      var input = container ? container.querySelector("input") : null;
      var trigger = container ?
        container.querySelector("[role='combobox'], button, [class*='control']") : null;

      if (trigger) simularCliqueReal(trigger);
      await wait(300);

      if (input) {
        input.focus();
        var setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, "value"
        )?.set;
        if (setter) setter.call(input, termoBusca);
        else input.value = termoBusca;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await wait(600);

        var tBusca = termoBusca.toLowerCase().replace(/[\\s_-]+/g, "");
        var selOpt = "[role='option'], [role='menuitem'], div[class*='option'], div[id*='react-select'], span, li";
        var opcoes = Array.from(document.querySelectorAll(selOpt)).filter(function(el) {
          var txt = (el.innerText || "").trim().toLowerCase().replace(/[\\s_-]+/g, "");
          return txt && (txt === tBusca || txt.includes(tBusca) || tBusca.includes(txt));
        });

        if (opcoes.length > 0) {
          simularCliqueReal(opcoes[0]);
          console.log("✔ Fixado: " + chave + " -> " + opcoes[0].innerText.trim());
        } else {
          input.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", keyCode: 13, which: 13, bubbles: true
          }));
        }
      }
      await wait(400);
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
  preencherInput("Título", ${jsonTitulo});
  preencherDescricao(textoDescricao);
  preencherInput("Número do chamado", ${jsonNumero});

  await wait(300);

  // Fixação de seletores React (Produto, Prioridade, Cliente, Representante)
  await fixarSeletor("Produto", ${jsonProduto});
  await fixarSeletor("Prioridade", ${jsonPrioridade});
  await fixarSeletor("Cliente", ${jsonCliente});
  await fixarSeletor("Representante", ${jsonRepresentante});

  console.log("=== PREENCHIMENTO CONCLUÍDO (Pronto para revisão - NUNCA clica em Enviar) ===");
})();`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateJiraScript, chunkString, extractFieldsFromRawText, markdownToHtml, htmlToMarkdown };
}
