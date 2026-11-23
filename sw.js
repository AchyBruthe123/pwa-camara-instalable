const NOMBRE_CACHE = 'inspeccion-visual-pwa-v1';

const ARCHIVOS_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './pwa.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then((cache) => cache.addAll(ARCHIVOS_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => {
        const obsoletas = claves.filter((clave) => clave !== NOMBRE_CACHE);
        return Promise.all(obsoletas.map((clave) => caches.delete(clave)));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const solicitud = event.request;

  if (solicitud.method !== 'GET') {
    return;
  }

  if (solicitud.mode === 'navigate') {
    event.respondWith(
      fetch(solicitud)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(NOMBRE_CACHE).then((cache) => cache.put(solicitud, copia));
          return respuesta;
        })
        .catch(() => {
          return caches.match(solicitud).then((respuestaCacheada) => {
            return respuestaCacheada || caches.match('./index.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(solicitud).then((respuestaCacheada) => {
      if (respuestaCacheada) {
        return respuestaCacheada;
      }

      return fetch(solicitud).then((respuesta) => {
        if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
          const copia = respuesta.clone();
          caches.open(NOMBRE_CACHE).then((cache) => cache.put(solicitud, copia));
        }

        return respuesta;
      });
    })
  );
});
