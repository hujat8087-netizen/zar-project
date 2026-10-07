(function () {
  const AUTH_ROLE_KEY = 'kandahar_auth_role';
  const roles = {
    waiter: {
      key: 'waiter',
      label: 'Waiter',
      password: 'waiter123',
      path: '/waiter.html'
    },
    delivery: {
      key: 'delivery',
      label: 'Delivery',
      password: 'delivery123',
      path: '/delivery.html'
    },
    fakeOrder: {
      key: 'fakeOrder',
      label: 'فیک اډر',
      password: 'fiq123',
      path: '/fake-order.html'
    },
    counter: {
      key: 'counter',
      label: 'Counter',
      path: '/counter.html'
    }
  };

  async function getRoleByPassword(password) {
    const value = String(password || '').trim();
    if (!value) return null;
    const roleKeys = Object.keys(roles);
    for (let index = 0; index < roleKeys.length; index += 1) {
      const role = roles[roleKeys[index]];
      if (role.password && role.password === value) return role;
    }

    try {
      const response = await fetch('/api/auth/manager-login', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: value })
      });
      if (response.ok) return roles.counter;
    } catch (_) {
      return null;
    }
    return null;
  }

  function currentRole() {
    const key = sessionStorage.getItem(AUTH_ROLE_KEY);
    return roles[key] ? key : null;
  }

  async function loginWithPassword(password) {
    const role = await getRoleByPassword(password);
    if (!role) return null;
    sessionStorage.setItem(AUTH_ROLE_KEY, role.key);
    return role;
  }

  function isAuthorized(roleKey) {
    return currentRole() === roleKey;
  }

  function redirectToRole(roleKey) {
    const role = roles[roleKey];
    if (!role) return;
    showLoginIntro(role, () => {
      window.location.href = role.path;
    });
  }

  function showLoginIntro(role, onComplete) {
    if (document.querySelector('.hujat-intro')) return;

    const intro = document.createElement('section');
    intro.className = 'hujat-intro';
    intro.setAttribute('aria-label', 'Hujat Software');
    intro.innerHTML = `
      <div class="hujat-intro-glow" aria-hidden="true"></div>
      <div class="hujat-intro-content">
        <div class="hujat-intro-photo-wrap">
          <span class="hujat-intro-orbit" aria-hidden="true"></span>
          <img class="hujat-intro-photo" src="/adij.jpeg" alt="Hujat Software" />
        </div>
        <p class="hujat-intro-welcome">ښه راغلاست · Welcome</p>
        <h1 class="hujat-intro-title">Hujat Software</h1>
        <h2 class="hujat-intro-local" lang="ps" dir="rtl">حجت سافټویر</h2>
        <p class="hujat-intro-role">${(role && role.label) || 'System'} · سیستم پرانیستل کېږي</p>
        <div class="hujat-intro-loader" aria-hidden="true"><span></span></div>
      </div>
    `;
    document.body.appendChild(intro);

    window.setTimeout(() => intro.classList.add('is-leaving'), 3300);
    window.setTimeout(() => {
      intro.remove();
      if (typeof onComplete === 'function') onComplete();
    }, 4000);
  }

  function logout() {
    sessionStorage.removeItem(AUTH_ROLE_KEY);
    window.location.href = '/';
  }

  window.KandaharAuth = {
    roles,
    currentRole,
    loginWithPassword,
    isAuthorized,
    redirectToRole,
    showLoginIntro,
    logout
  };
}());
