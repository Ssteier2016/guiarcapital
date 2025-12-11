// Nombre de la caché para la versión actual
const CACHE_NAME = 'guiarcapital-cache-v1';

// Recursos esenciales para que la app funcione offline
const urlsToCache = [
    './', // Raíz
    'index.html',
    'manifest.json',
    'assets/icon-192.png',
    'assets/icon-512.png',
    // No cacheamos los scripts de CDN ya que la app está en un solo archivo HTML
    // Si la app fuera multi-archivo, se incluirían aquí.
];

// Instalar el Service Worker
self.addEventListener('install', (event) => {
    // Espera hasta que se abra la caché y se añadan los archivos esenciales
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache and adding essential resources');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    
    // Elimina las cachés antiguas que ya no están en la lista blanca
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Manejar peticiones de red (Estrategia: Cache-First, luego Network)
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones a APIs externas (Alpha Vantage, DolarAPI, Gemini) para que no fallen el Service Worker
    if (event.request.url.includes('dolarapi.com') || event.request.url.includes('alphavantage.co') || event.request.url.includes('googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Si encontramos algo en la caché, lo devolvemos
                if (response) {
                    return response;
                }
                
                // Si no, vamos a la red
                return fetch(event.request);
            })
    );
});

