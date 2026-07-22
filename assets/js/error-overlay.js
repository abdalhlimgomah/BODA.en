(function(){
  if (window.__errorOverlayInstalled) return; window.__errorOverlayInstalled = true;

  // Create overlay container
  const container = document.createElement('div');
  container.id = 'error-overlay';
  const style = container.style;
  style.position = 'fixed';
  style.right = '12px';
  style.bottom = '12px';
  style.maxWidth = '420px';
  style.zIndex = 999999;
  style.fontFamily = 'Inter, system-ui, -apple-system, Roboto, sans-serif';

  // Internal styles for entries
  function makeEntry(message, meta) {
    const entry = document.createElement('div');
    entry.className = 'error-entry';
    entry.style.background = 'rgba(15,23,42,0.95)';
    entry.style.color = '#fff';
    entry.style.padding = '12px';
    entry.style.borderRadius = '10px';
    entry.style.boxShadow = '0 6px 18px rgba(2,6,23,0.5)';
    entry.style.marginTop = '8px';
    entry.style.fontSize = '13px';
    entry.style.lineHeight = '1.3';

    const h = document.createElement('div');
    h.style.fontWeight = '700';
    h.style.marginBottom = '6px';
    h.textContent = message;
    entry.appendChild(h);

    if (meta) {
      const m = document.createElement('pre');
      m.style.whiteSpace = 'pre-wrap';
      m.style.fontFamily = 'inherit';
      m.style.fontSize = '12px';
      m.style.opacity = '0.9';
      m.style.maxHeight = '160px';
      m.style.overflow = 'auto';
      m.textContent = meta;
      entry.appendChild(m);
    }

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    footer.style.marginTop = '8px';

    const copy = document.createElement('button');
    copy.textContent = 'نسخ';
    copy.style.background = 'transparent';
    copy.style.color = '#fff';
    copy.style.border = '1px solid rgba(255,255,255,0.12)';
    copy.style.padding = '6px 8px';
    copy.style.borderRadius = '8px';
    copy.style.cursor = 'pointer';
    copy.onclick = () => { navigator.clipboard?.writeText((message + '\n' + (meta||''))) };

    const dismiss = document.createElement('button');
    dismiss.textContent = 'إغلاق';
    dismiss.style.background = 'rgba(255,255,255,0.08)';
    dismiss.style.color = '#fff';
    dismiss.style.border = 'none';
    dismiss.style.padding = '6px 8px';
    dismiss.style.borderRadius = '8px';
    dismiss.style.cursor = 'pointer';
    dismiss.onclick = () => { container.removeChild(entry); };

    footer.appendChild(copy);
    footer.appendChild(dismiss);
    entry.appendChild(footer);

    return entry;
  }

  // Append container to body
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(container);
  });

  // Show error helper
  function showError(title, details) {
    try {
      const entry = makeEntry(title, details);
      // add newest on top
      container.insertBefore(entry, container.firstChild);
      // auto-dismiss after 20s
      setTimeout(() => { try{ if (entry.parentNode) entry.parentNode.removeChild(entry); }catch(e){} }, 20000);
    } catch (e) {
      console.error('error-overlay failed to show error', e);
    }
  }

  // Global handlers
  window.addEventListener('error', function(ev){
    const msg = ev.message || 'Uncaught error';
    const src = ev.filename ? `${ev.filename}:${ev.lineno || 0}:${ev.colno || 0}` : '';
    const stack = ev.error && ev.error.stack ? ev.error.stack : `${src}`;
    showError(msg, stack);
  });

  window.addEventListener('unhandledrejection', function(ev){
    const reason = ev.reason;
    let title = 'Unhandled Promise Rejection';
    let details = '';
    if (typeof reason === 'string') {
      details = reason;
    } else if (reason && reason.stack) {
      details = reason.stack;
      title = reason.message || title;
    } else {
      details = JSON.stringify(reason);
    }
    showError(title, details);
  });

  // wrap console.error to show in page too
  const origConsoleError = console.error.bind(console);
  console.error = function(...args){
    try { showError('Console.error', args.map(a => (typeof a==='object'? JSON.stringify(a): String(a))).join(' ')); } catch(e){}
    origConsoleError(...args);
  };

  // expose manual method
  window.showSiteError = showError;
})();
