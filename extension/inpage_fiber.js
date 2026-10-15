// Injected into the MAIN world of Jira to allow direct React Fiber interaction if needed
(function() {
  window.addEventListener('message', function(event) {
    if (!event.data || event.data.source !== 'JIRA_ASSISTANT_CONTENT') return;

    if (event.data.action === 'SELECT_REACT_OPTION') {
      const { targetLabel, searchValue } = event.data;
      selectViaReactProps(targetLabel, searchValue);
    }
  });

  function selectViaReactProps(labelPattern, valueToSelect) {
    try {
      const labels = Array.from(document.querySelectorAll('label, div, span, p'));
      const lbl = labels.find(el => {
        const txt = (el.innerText || '').trim().toLowerCase();
        return txt === labelPattern.toLowerCase() || txt.startsWith(labelPattern.toLowerCase());
      });

      if (!lbl) return;

      let container = lbl.parentElement;
      for (let i = 0; i < 5 && container; i++) {
        if (container.querySelector("input, [class*='control'], [role='combobox']")) break;
        container = container.parentElement;
      }

      if (!container) return;

      const control = container.querySelector("[class*='control'], [class*='select'], [role='combobox']");
      if (!control) return;

      const reactKey = Object.keys(control).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
      if (!reactKey) return;

      const props = control[reactKey];
      if (props && typeof props.onChange === 'function') {
        props.onChange({ value: valueToSelect, label: valueToSelect });
      }
    } catch (e) {
      console.warn('[Jira Assistant Fiber] Fallback error:', e);
    }
  }
})();
