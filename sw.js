// Die Meeples – Service Worker v2
const CACHE = 'meeples-v2';

self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(clients.claim());
});

// Network first
self.addEventListener('fetch', function(e){
  if(!e.request.url.startsWith(self.location.origin)) return;
  if(e.request.url.includes('supabase')||e.request.url.includes('workers.dev')) return;
  e.respondWith(fetch(e.request).catch(function(){ return caches.match(e.request); }));
});

// ── Push Notifications ──
self.addEventListener('push', function(e){
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}
  var title = data.title || 'Die Meeples';
  var body  = data.body  || 'Neue Nachricht';
  var icon  = data.icon  || '/icon-192.png';
  var url   = data.url   || '/';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: icon,
      data: { url: url },
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for(var i=0;i<list.length;i++){
        if(list[i].url.includes(self.location.origin)){ list[i].focus(); return; }
      }
      return clients.openWindow(url);
    })
  );
});
