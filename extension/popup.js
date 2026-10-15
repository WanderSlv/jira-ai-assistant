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

      await chrome.tabs.sendMessage(tab.id, {
        action: 'FILL_FORM',
        ticketData: activeTicket
      });

      btnFill.innerHTML = '<span>✔</span><span>Preenchimento Concluído!</span>';
      setTimeout(() => {
        window.close();
      }, 1200);
    } catch (err) {
      console.warn(err);
      btnFill.innerHTML = '<span>⚠️</span><span>Verifique se a aba é do Jira</span>';
      setTimeout(() => {
        btnFill.disabled = false;
        btnFill.innerHTML = '<span>⚡</span><span>Tentar Novamente</span>';
      }, 2500);
    }
  });
});
