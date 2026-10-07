(function () {
  function setOfflineBadge(message, type) {
    var badge = document.getElementById('offlineBadge');
    if (!badge) return;
    badge.textContent = message;
    badge.className = 'status-chip ' + (type || '');
  }

  window.addEventListener('online', function () {
    setOfflineBadge('LAN ready', 'ready');
  });

  window.addEventListener('offline', function () {
    setOfflineBadge('Browser offline', 'warning');
  });

  if (!('serviceWorker' in navigator)) {
    setOfflineBadge('Offline cache unavailable', 'warning');
    return;
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function () {
        setOfflineBadge(navigator.onLine ? 'LAN ready' : 'Browser offline', navigator.onLine ? 'ready' : 'warning');
      })
      .catch(function () {
        setOfflineBadge('LAN ready', 'ready');
      });
  });
}());
