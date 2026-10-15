// Executa no MAIN world do Jira para interagir diretamente com React Fiber e SyntheticEvents
(function() {
  if (window.__JIRA_ASSISTANT_FIBER_LOADED__) return;
  window.__JIRA_ASSISTANT_FIBER_LOADED__ = true;

  console.log('⚡ [Jira Assistant Fiber] Injetado com sucesso no contexto MAIN');

  function normalize(str) {
    if (!str) return '';
    return str.toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
  }

  window.addEventListener('message', function(event) {
    if (!event.data || event.data.source !== 'JIRA_ASSISTANT_CONTENT') return;

    if (event.data.action === 'SELECT_REACT_OPTION') {
      const { targetLabel, searchValue } = event.data;
      triggerReactOptionDirectly(targetLabel, searchValue);
    }
  });

  function triggerReactOptionDirectly(targetLabel, searchValue) {
    try {
      const normSearch = normalize(searchValue);
      if (!normSearch) return;

      // 1. Procura opções visíveis no DOM
      const optSelectors = [
        "[id*='-option-']",
        "[role='option']",
        "div[class*='-option']",
        "div[class*='__option']",
        "[role='menuitem']",
        "li[role='option']"
      ];

      const elements = Array.from(document.querySelectorAll(optSelectors.join(', ')));
      const matching = elements.filter(el => {
        const txt = normalize(el.innerText || el.textContent || '');
        return txt && (txt === normSearch || txt.includes(normSearch) || normSearch.includes(txt));
      });

      for (const el of matching) {
        // Encontra chaves React Fiber
        const reactKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
        if (reactKey) {
          const props = el[reactKey];
          if (props) {
            const mockEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
              currentTarget: el,
              target: el,
              nativeEvent: new MouseEvent('click')
            };

            if (typeof props.onClick === 'function') {
              console.log('✔ [Jira Assistant Fiber] Disparando props.onClick React:', searchValue);
              props.onClick(mockEvent);
            }
            if (typeof props.onMouseDown === 'function') {
              props.onMouseDown(mockEvent);
            }
          }
        }

        // Tenta também no React Fiber internal (caso seja componente customizado)
        const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        if (fiberKey) {
          const fiber = el[fiberKey];
          let cur = fiber;
          for (let i = 0; i < 5 && cur; i++) {
            if (cur.memoizedProps) {
              if (typeof cur.memoizedProps.onClick === 'function') {
                cur.memoizedProps.onClick({ preventDefault: () => {}, stopPropagation: () => {} });
              }
              if (typeof cur.memoizedProps.onMouseDown === 'function') {
                cur.memoizedProps.onMouseDown({ preventDefault: () => {}, stopPropagation: () => {} });
              }
              if (typeof cur.memoizedProps.selectOption === 'function' && cur.memoizedProps.data) {
                console.log('✔ [Jira Assistant Fiber] Disparando selectOption() do React:', cur.memoizedProps.data);
                cur.memoizedProps.selectOption(cur.memoizedProps.data);
              }
            }
            cur = cur.return;
          }
        }
      }
    } catch (e) {
      console.warn('[Jira Assistant Fiber] Erro no fallback direto:', e);
    }
  }
})();
