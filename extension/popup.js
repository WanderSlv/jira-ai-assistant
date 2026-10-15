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

  btnFill.addEventListener('click', async () => {
    if (!activeTicket) return;

    btnFill.disabled = true;
    btnFill.innerHTML = '<span>⏳</span><span>Preenchendo campos...</span>';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('Nenhuma aba ativa identificada.');
      }

      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
        throw new Error('RESTRICTED_URL');
      }

      const sendFillMessage = () => {
        return new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'FILL_FORM',
            ticketData: activeTicket
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };

      try {
        await sendFillMessage();
      } catch (connErr) {
        console.log('Script não detectado na aba. Injetando dinamicamente via scripting API...', connErr);

        // Injeta automaticamente content_jira.js caso a aba estivesse aberta antes da extensão
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content_jira.js']
        });

        // Tenta também injetar inpage_fiber.js no world MAIN
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['inpage_fiber.js'],
            world: 'MAIN'
          });
        } catch (e) {
          // Ignora se o host não permitir main world injection
        }

        // Aguarda registro dos listeners
        await new Promise(r => setTimeout(r, 200));

        // Reenvia a mensagem
        await sendFillMessage();
      }

      btnFill.innerHTML = '<span>✔</span><span>Preenchimento Concluído!</span>';
      setTimeout(() => {
        window.close();
      }, 1200);
    } catch (err) {
      console.warn('Erro ao preencher:', err);
      let msg = 'Recarregue a aba do Jira (F5)';
      if (err.message === 'RESTRICTED_URL') {
        msg = 'Vá para a aba do Jira primeiro';
      }
      btnFill.innerHTML = `<span>⚠️</span><span>${msg}</span>`;
      setTimeout(() => {
        btnFill.disabled = false;
        btnFill.innerHTML = '<span>⚡</span><span>Tentar Novamente</span>';
      }, 3000);
    }
  });
});
