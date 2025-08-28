const CACHE_NAME = 'v1';
const urlsToCache = [
  '/',
  '/start.html',
  '/styles.css',
  '/index.html',
  '/sc.js',
  '/logo.png'
];

// ------------------- LOGIQUE DE MISE EN CACHE -------------------

self.addEventListener('install', event => {
  console.log('Installation du Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Pré-mise en cache des ressources :', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Échec de la pré-mise en cache des ressources :', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Le cache a un résultat : on le retourne
        if (response) {
          return response;
        }
        // Pas de résultat dans le cache : on va chercher sur le réseau
        return fetch(event.request);
      })
      .catch(err => {
        console.error('Erreur de récupération (fetch) :', err);
      })
  );
});

// ------------------- LOGIQUE DES NOTIFICATIONS PUSH -------------------

self.addEventListener('push', event => {
  const data = event.data.json();
  const title = data.title || "Notification de l'application";
  const options = {
    body: data.body || "Ceci est un rappel programmé.",
    icon: 'icon-192x192.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
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
