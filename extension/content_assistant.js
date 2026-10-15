// Content script para comunicação entre o Jira AI Assistant (localhost:3000) e a extensão
(function() {
  console.log('⚡ [Jira AI Assistant Extension] Conectado ao portal local');

  // Avisa a página web que a extensão está instalada e pronta
  function notifyPageExtensionReady() {
    window.postMessage({
      type: 'JIRA_ASSISTANT_EXTENSION_STATUS',
      installed: true,
      version: '1.0.0'
    }, '*');
  }

  notifyPageExtensionReady();
  setInterval(notifyPageExtensionReady, 2000);

  // Ouve mensagens vindas da página web (app.js)
  window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'JIRA_ASSISTANT_SAVE_TICKET') {
      const ticketData = event.data.payload;
      if (!ticketData) return;

      chrome.storage.local.set({
        currentTicket: ticketData,
        lastUpdated: Date.now()
      }, function() {
        console.log('✔ [Jira Extension] Ticket sincronizado com sucesso:', ticketData.titulo);
        window.postMessage({
          type: 'JIRA_ASSISTANT_SAVE_SUCCESS',
          ticket: ticketData
        }, '*');
      });
    }
  });
})();
