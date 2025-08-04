// service-worker.js
self.addEventListener('push', event => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/images/logo.jpg' // Assurez-vous que le chemin est correct
    });
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    // Optionnel: Ouvrir une URL ou se concentrer sur la fenêtre de l'application
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
