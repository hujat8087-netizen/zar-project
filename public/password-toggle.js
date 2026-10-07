(function () {
  function initPasswordToggles(root = document) {
    root.querySelectorAll('[data-password-toggle]').forEach((button) => {
      if (button.dataset.passwordToggleReady === 'true') return;

      const inputId = button.getAttribute('aria-controls');
      const input = inputId ? document.getElementById(inputId) : null;
      if (!input) return;

      button.dataset.passwordToggleReady = 'true';
      button.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        button.textContent = show ? 'Hide' : 'Show';
        button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        button.setAttribute('aria-pressed', show ? 'true' : 'false');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPasswordToggles());
  } else {
    initPasswordToggles();
  }

  window.KandaharPasswordToggle = { init: initPasswordToggles };
}());
