(function () {
  const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ''));

  function applyTheme(theme) {
    if (!theme || !isHex(theme.primary) || !isHex(theme.accent)) return;
    const root = document.documentElement;
    root.style.setProperty('--system-primary', theme.primary);
    root.style.setProperty('--system-accent', theme.accent);
    window.PizzaPointSystemTheme = { primary: theme.primary, accent: theme.accent };
    window.dispatchEvent(new CustomEvent('pizza-point-theme-updated', { detail: window.PizzaPointSystemTheme }));
  }

  async function syncTheme() {
    try {
      const response = await fetch('/api/system/theme', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      applyTheme(data.theme);
    } catch (_) {
      // Keep the current colors while offline.
    }
  }

  window.PizzaPointApplySystemTheme = applyTheme;
  window.PizzaPointSyncSystemTheme = syncTheme;
  syncTheme();
  window.setInterval(syncTheme, 5000);
}());
