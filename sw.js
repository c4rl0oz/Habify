self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Recibir push del servidor y mostrar la notificación
self.addEventListener('push', e => {
    let data = {};
    try {
        data = e.data ? e.data.json() : {};
    } catch (_) {
        data = { title: 'Habify', body: e.data ? e.data.text() : '' };
    }

    const title = data.title || 'Habify';
    const opciones = {
        body: data.body || '',
        icon: data.icon || '/Habify/icons/icon-192.png',
        badge: '/Habify/icons/icon-192.png',
        tag: data.tag || 'habify-recordatorio',
        renotify: true,
        data: { url: data.url || self.registration.scope }
    };

    e.waitUntil(self.registration.showNotification(title, opciones));
});

// Al tocar la notificación, abrir o enfocar la app
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window' }).then(lista => {
            if (lista.length > 0) {
                lista[0].focus();
            } else {
                clients.openWindow(e.notification.data?.url || '/Habify/');
            }
        })
    );
});