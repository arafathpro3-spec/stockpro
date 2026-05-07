// ============================================================
//  StockPro — Service Worker
//  Gère le cache hors-ligne et l'installation PWA
// ============================================================

const CACHE_NAME = 'stockpro-v1';

// Fichiers à mettre en cache pour fonctionner hors ligne
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ---- Installation : mise en cache des fichiers ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Mise en cache des fichiers...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ---- Activation : nettoyage des anciens caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Suppression ancien cache:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// ---- Requêtes : réseau d'abord, cache en fallback ----
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes Firebase (toujours en ligne)
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    return; // Laisser passer sans interception
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre à jour le cache avec la nouvelle version
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Pas de réseau → servir depuis le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback ultime : page principale
          return caches.match('/index.html');
        });
      })
  );
});
