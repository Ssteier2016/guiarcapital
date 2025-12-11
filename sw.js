// sw.js (Service Worker para GuiarCapital)

// 1. Define el nombre de la caché con la versión actual.
// *** IMPORTANTE: Cambia este número para forzar una actualización completa del Service Worker y la caché. ***
const CACHE_NAME = 'guiar-capital-cache-v1.0.2';

// 2. Lista de archivos esenciales para la funcionalidad offline.
// Incluye todos los archivos críticos para la carga inicial.
const urlsToCache = [
    '/', // La raíz de la aplicación (generalmente index.html)
    // Asumiendo que el HTML principal es el archivo raíz y el CSS es 'styles.css'
    'styles.css', 
    'index.html', 
    'manifest.json', // El archivo manifest de tu PWA
    'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap', // Fuente Inter de Google Fonts
];

// Evento 'install': Carga los archivos esenciales a la caché.
self.addEventListener('install', event => {
    // Forzar la instalación inmediata del nuevo Service Worker
    self.skipWaiting(); 
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker instalado: Cacheando archivos estáticos.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Falló el cacheo durante la instalación.', error);
            })
    );
});

// Evento 'activate': Limpia las cachés viejas para mantener el almacenamiento limpio.
self.addEventListener('activate', event => {
    console.log('Service Worker activado: Limpiando cachés antiguas.');
    const cacheWhitelist = [CACHE_NAME]; // Solo mantiene la caché con el nombre actual

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Si el nombre de la caché NO está en la lista blanca, la elimina.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Asegura que el Service Worker toma control de la página inmediatamente
    event.waitUntil(self.clients.claim()); 
});

// Evento 'fetch': Determina cómo responder a las solicitudes (Estrategia Cache-First, luego Network).
self.addEventListener('fetch', event => {
    // Evita manejar peticiones de extensiones o protocolos no estándar
    if (event.request.url.startsWith('chrome-extension://') || !event.request.url.startsWith('http')) {
        return;
    }
    
    // Evita cachear llamadas a APIs externas (como Google APIs o Firestore)
    // Estas peticiones deben ir siempre a la red para obtener datos actualizados.
    if (event.request.url.includes('googleapis.com') || event.request.url.includes('firestore.googleapis.com')) {
         return fetch(event.request);
    }

    // Estrategia Cache-First para todos los demás recursos (HTML, CSS, imágenes, etc.)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 1. Si el recurso está en caché, lo devolvemos. (Modo Offline)
                if (response) {
                    return response;
                }
                
                // 2. Si no está en caché, vamos a la red.
                return fetch(event.request.clone())
                    .then(res => {
                        // Verifica que la respuesta sea válida (status 200 y tipo básico/sin opaco)
                        if (!res || res.status !== 200 || res.type !== 'basic') {
                            return res;
                        }
                        
                        // Clonamos la respuesta para poder cachearla (el cuerpo se consume una vez)
                        const responseToCache = res.clone();
                        
                        // Abre la caché y guarda el nuevo recurso
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return res;
                    })
                    .catch(error => {
                        // Ocurrió un error de red y el recurso no estaba en caché.
                        console.error('Service Worker: Falló la petición de red sin recurso en caché:', event.request.url, error);
                        // En un caso real, podrías devolver una página offline aquí.
                        return new Response('Network request failed and no cache available.', { status: 503, statusText: 'Service Unavailable' });
                    });
            })
    );
});

