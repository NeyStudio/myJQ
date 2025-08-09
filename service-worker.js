
// service-worker.js

// Écoute des événements push (ceux envoyés par votre serveur)
self.addEventListener('push', event => {
    // Les données envoyées par votre serveur
    const data = event.data.json();
    const title = data.title || "Notification de l'application";
    const options = {
        body: data.body || "Ceci est un rappel programmé.",
        icon: 'icon-192x192.png' // Assurez-vous que le chemin est correct
    };

    // Affiche la notification à l'utilisateur
    event.waitUntil(self.registration.showNotification(title, options));
});

// Écoute des clics sur les notifications
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    // Ouvre la page principale de votre PWA
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
