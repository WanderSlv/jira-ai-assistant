document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('ticketStatusBadge');
  const preview = document.getElementById('ticketPreview');
  const fieldsGrid = document.getElementById('fieldsGrid');
  const lblCliente = document.getElementById('lblCliente');
  const lblProduto = document.getElementById('lblProduto');
  const lblRepr = document.getElementById('lblRepr');
  const lblChamado = document.getElementById('lblChamado');
  const btnFill = document.getElementById('btnFillActiveTab');

  let activeTicket = null;

  chrome.storage.local.get(['currentTicket'], (res) => {
    if (res.currentTicket && res.currentTicket.titulo) {
      activeTicket = res.currentTicket;
      const f = activeTicket.fields || {};

      badge.className = 'badge';
      badge.textContent = 'Pronto para preencher';

      preview.textContent = activeTicket.titulo;
      fieldsGrid.style.display = 'grid';

      lblCliente.textContent = f.Cliente || 'Nina';
      lblProduto.textContent = f.Produto || 'ninachat';
      lblRepr.textContent = 'Wander';
      lblChamado.textContent = f.NumeroChamado || '-';

      btnFill.disabled = false;
    } else {
      badge.className = 'badge badge-empty';
      badge.textContent = 'Nenhum chamado';
      btnFill.disabled = true;
    }
  });

  function isJiraUrl(url) {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes('atlassian.net') ||
           u.includes('jira.com') ||
           u.includes('atlassian.com') ||
           u.includes('/jira') ||
           u.includes('/servicedesk');
  }

  btnFill.addEventListener('click', async () => {
    if (!activeTicket) return;

    btnFill.disabled = true;
    btnFill.innerHTML = '<span>⏳</span><span>Localizando chamado no Jira...</span>';

    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let targetTab = currentTab;

      // Se a aba atual não for do Jira, busca se há alguma aba do Jira aberta no navegador
      if (!isJiraUrl(currentTab?.url)) {
        const allTabs = await chrome.tabs.query({});
        const jiraTab = allTabs.find(t => isJiraUrl(t.url));

        if (jiraTab && jiraTab.id) {
          targetTab = jiraTab;
          // Alterna para a aba do Jira automaticamente
          await chrome.tabs.update(jiraTab.id, { active: true });
          if (jiraTab.windowId) {
            await chrome.windows.update(jiraTab.windowId, { focused: true });
          }
        } else {
          throw new Error('NOT_JIRA_TAB');
        }
      }

      btnFill.innerHTML = '<span>⚡</span><span>Preenchendo campos...</span>';

      // 1. Injeta o content_jira.js dinamicamente (garante que está presente sem precisar de F5)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id, allFrames: true },
          files: ['content_jira.js']
        });
      } catch (e) {
        // Fallback para frame principal se houver iframe restrito
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          files: ['content_jira.js']
        });
      }

      // 2. Injeta também inpage_fiber.js no world MAIN se possível
      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id, allFrames: true },
          files: ['inpage_fiber.js'],
          world: 'MAIN'
        });
      } catch (e) {
        // Ignora se o host não permitir main world via scripting
      }

      // 3. Executa a função de preenchimento diretamente no contexto da aba do Jira
      // Isso elimina 100% qualquer erro de "Could not establish connection / Receiving end does not exist"
      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id, allFrames: true },
          func: async (ticket) => {
            if (typeof window.__JIRA_ASSISTANT_FILL__ === 'function') {
              await window.__JIRA_ASSISTANT_FILL__(ticket);
            }
          },
          args: [activeTicket]
        });
      } catch (e) {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: async (ticket) => {
            if (typeof window.__JIRA_ASSISTANT_FILL__ === 'function') {
              await window.__JIRA_ASSISTANT_FILL__(ticket);
            }
          },
          args: [activeTicket]
        });
      }

      btnFill.innerHTML = '<span>✔</span><span>Preenchimento Concluído!</span>';
      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (err) {
      console.warn('Erro ao preencher:', err);
      let msg = 'Recarregue a aba do Jira (F5)';
      if (err.message === 'NOT_JIRA_TAB') {
        msg = 'Abra uma aba do Jira primeiro';
      }
      btnFill.innerHTML = `<span>⚠️</span><span>${msg}</span>`;
      setTimeout(() => {
        btnFill.disabled = false;
        btnFill.innerHTML = '<span>⚡</span><span>Tentar Novamente</span>';
      }, 3000);
    }
  });
});
