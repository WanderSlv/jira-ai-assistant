/**
 * Gerador de scripts JavaScript para preenchimento ágil e seguro no console do Jira.
 */

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
  const representante = fields.Representante || 'Wander';
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

  // 2. Descrição (Editor de texto rico / contenteditable)
  function preencherDescricao(valor) {
    try {
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

        var ok = document.execCommand("insertText", false, valor);
        if (!ok || !editor.innerText.trim()) {
          var paragrafos = valor.split("\\n").map(function(p) {
            return "<p>" + (p || "<br>") + "</p>";
          }).join("");
          editor.innerHTML = paragrafos;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }
        console.log("✔ Descrição preenchida");
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
  module.exports = { generateJiraScript, chunkString };
}
