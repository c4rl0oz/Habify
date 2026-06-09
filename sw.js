self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Escuchar mensajes desde la app
self.addEventListener('message', e => {
    if (e.data?.type === 'PROGRAMAR_RECORDATORIOS') {
        programarDesdeApp(e.data.recordatorios);
    }
    if (e.data?.type === 'CANCELAR_RECORDATORIOS') {
        cancelarTodos();
    }
});

const timers = [];

function cancelarTodos() {
    timers.forEach(t => clearTimeout(t));
    timers.length = 0;
}

const MENSAJES = [
    '¡Todavía estás a tiempo! 💪',
    '¡Tú puedes completarlo! 🔥',
    '¡No te rindas, un paso más! ⚡',
    '¡Recuerda, la constancia es la clave! 🗝️',
    '¡Cada día cuenta, hazlo! 🌟',
    '¡Tu versión futura te lo agradecerá! 🚀',
    '¡Pequeños pasos, grandes resultados! 🏆',
];

function mensajeAleatorio() {
    return MENSAJES[Math.floor(Math.random() * MENSAJES.length)];
}

function programarDesdeApp(recordatorios) {
    cancelarTodos();
    const ahora = Date.now();

    recordatorios.forEach(({ nombre, emoji, hora, esContador, unidad }) => {
        const [h, m] = hora.split(':').map(Number);
        const fechaDisparo = new Date();
        fechaDisparo.setHours(h, m, 0, 0);
        const ms = fechaDisparo.getTime() - ahora;
        if (ms <= 0) return;

        const t = setTimeout(() => {
            const titulo = esContador
                ? `${emoji} ${nombre}`
                : `${emoji} ${nombre}`;
            const cuerpo = esContador
                ? `¿Ya anotaste tu progreso de ${unidad || 'hoy'}? ${mensajeAleatorio()}`
                : `Aún no lo completaste hoy. ${mensajeAleatorio()}`;

            self.registration.showNotification(titulo, {
                body: cuerpo,
                icon: null,
                badge: null,
                tag: `habito-${nombre}-${hora}`,
                renotify: true,
                data: { url: self.registration.scope }
            });
        }, ms);
        timers.push(t);
    });
}

// Al tocar la notificación, abrir la app
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window' }).then(lista => {
            if (lista.length > 0) {
                lista[0].focus();
            } else {
                clients.openWindow(e.notification.data?.url || '/');
            }
        })
    );
});