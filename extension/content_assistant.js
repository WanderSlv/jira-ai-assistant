// Content script para comunicação entre o Jira AI Assistant (localhost:3000) e a extensão
(function() {
  if (typeof window.__JIRA_ASSISTANT_CONTENT_CLEANUP__ === 'function') {
    window.__JIRA_ASSISTANT_CONTENT_CLEANUP__();
  }

  console.log('⚡ [Jira AI Assistant Extension] Conectado ao portal local');

  function isContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  // Avisa a página web que a extensão está instalada e pronta
  function notifyPageExtensionReady() {
    if (!isContextValid()) {
      cleanup();
      return;
    }
    window.postMessage({
      type: 'JIRA_ASSISTANT_EXTENSION_STATUS',
      installed: true,
      version: '1.0.0'
    }, '*');
  }

  const readyTimer = setInterval(notifyPageExtensionReady, 2000);

  // Ouve mensagens vindas da página web (app.js)
  function onWindowMessage(event) {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'JIRA_ASSISTANT_SAVE_TICKET') {
      if (!isContextValid()) {
        cleanup();
        return;
      }

      const ticketData = event.data.payload;
      if (!ticketData) return;

      try {
        chrome.storage.local.set({
          currentTicket: ticketData,
          lastUpdated: Date.now()
        }, function() {
          if (chrome.runtime && chrome.runtime.lastError) {
            const errMsg = chrome.runtime.lastError.message || 'Erro ao salvar no storage';
            console.warn('⚠️ [Jira Extension] Falha ao sincronizar ticket:', errMsg);
            window.postMessage({
              type: 'JIRA_ASSISTANT_SAVE_ERROR',
              error: errMsg
            }, '*');
            return;
          }
          console.log('✔ [Jira Extension] Ticket sincronizado com sucesso:', ticketData.titulo);
          window.postMessage({
            type: 'JIRA_ASSISTANT_SAVE_SUCCESS',
            ticket: ticketData
          }, '*');
        });
      } catch (err) {
        // Contexto antigo após reload da extensão: limpa silenciosamente para não interferir com a nova instância
        cleanup();
      }
    }
  }

  function cleanup() {
    clearInterval(readyTimer);
    window.removeEventListener('message', onWindowMessage);
  }

  window.__JIRA_ASSISTANT_CONTENT_CLEANUP__ = cleanup;
  window.addEventListener('message', onWindowMessage);
  notifyPageExtensionReady();
})();
