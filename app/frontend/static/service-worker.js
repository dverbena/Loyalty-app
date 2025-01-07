// const CACHE_NAME = "my-app-cache-v1";
// const urlsToCache = [
//     '/',
//     '/index.html',
//     '/style.css',
//     '/app.js',
//     '/customers.html',
//     '/admin.html',
//     '/scan.html',
// ];

// // Install the Service Worker
// self.addEventListener('install', (event) => {
//     event.waitUntil(
//         caches.open(CACHE_NAME).then((cache) => {
//             return cache.addAll(urlsToCache);
//         })
//     );
// });

// // Fetch Handler
// self.addEventListener('fetch', (event) => {
//     event.respondWith(
//         caches.match(event.request).then((response) => {
//             return response || fetch(event.request);
//         })
//     );
// });

// // Activate and Clean Up Old Caches
// self.addEventListener('activate', (event) => {
//     event.waitUntil(
//         caches.keys().then((cacheNames) => {
//             return Promise.all(
//                 cacheNames.map((cache) => {
//                     if (cache !== CACHE_NAME) {
//                         return caches.delete(cache);
//                     }
//                 })
//             );
//         })
//     );
// });
