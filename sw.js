// Die Meeples – Service Worker
const CACHE = 'meeples-v1';

// On install: cache nothing (app is always online, no offline needed)
self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(clients.claim());
});

// Network first strategy — always fresh data from server
self.addEventListener('fetch', function(e){
  // Only handle same-origin requests
  if(!e.request.url.startsWith(self.location.origin)) return;
  // Skip API/supabase requests
  if(e.request.url.includes('supabase') || e.request.url.includes('workers.dev')) return;

  e.respondWith(
    fetch(e.request).catch(function(){
      // If offline, try cache
      return caches.match(e.request);
    })
  );
});
