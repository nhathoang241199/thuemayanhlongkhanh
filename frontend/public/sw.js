/* Shipper Web Push service worker — served at /sw.js */
self.addEventListener('push', (event) => {
  let data = {
    title: 'Đơn ship mới',
    body: 'Có đơn giao máy mới.',
    url: '/ship',
  };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    try {
      const text = event.data?.text?.() ?? '';
      if (text) data.body = text;
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Đơn ship mới', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url || '/ship' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || '/ship';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes('/ship')) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    }),
  );
});
