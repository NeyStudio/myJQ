const CACHE_NAME = 'pwa-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/start.html',
  '/lottie.min.js',
  '/Wind.json',
  '/styles.css',
  '/script.js',
  '/logo.png' 
];

// Événement d'installation : met en cache les ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Événement de fetch : intercepte les requêtes et sert les ressources du cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la ressource est dans le cache, la servir
        if (response) {
          return response;
        }
        // Sinon, la récupérer depuis le réseau
        return fetch(event.request);
      })
  );
});
