// Sube este número cada vez que cambien los assets estáticos (para forzar refresco de caché)
const CACHE_VERSION = 'habify-v1';

// App shell: lo mínimo para que la app abra sin conexión
const APP_SHELL = [
    './',
    './index.html',
    './app.js',
    './supabase.js',
    './manifest.json',
    './splash-light.png',
    './splash-dark.png',
    './icons/icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Estrategia de caché para peticiones GET
self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return; // no tocar escrituras a Supabase

    const url = new URL(req.url);

    // Nunca cachear la API: siempre datos frescos si hay conexión
    if (url.hostname.includes('supabase.co')) return;

    // Navegación (abrir/recargar la app): red primero, caché de respaldo si no hay internet
    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Assets estáticos (propios y CDN): cache-first, refrescando en segundo plano
    e.respondWith(
        caches.match(req).then(cached => {
            const enRed = fetch(req).then(res => {
                if (res && res.status === 200) {
                    caches.open(CACHE_VERSION).then(cache => cache.put(req, res.clone()));
                }
                return res;
            }).catch(() => cached);
            return cached || enRed;
        })
    );
});

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