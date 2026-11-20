// Service worker mínimo: permite instalar la app. Siempre va a la red (sin caché)
// para que cada despliegue se vea de inmediato.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
