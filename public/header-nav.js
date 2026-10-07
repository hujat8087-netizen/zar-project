(function () {
  function closeMenu(toggle, panel) {
    toggle.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
  }

  document.querySelectorAll('.nav-toggle').forEach((toggle) => {
    const panelId = toggle.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.classList.toggle('is-open', !open);
    });

    panel.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => closeMenu(toggle, panel));
    });

    document.addEventListener('click', (event) => {
      if (!panel.classList.contains('is-open')) return;
      if (toggle.contains(event.target) || panel.contains(event.target)) return;
      closeMenu(toggle, panel);
    });
  });
}());
