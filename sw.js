const CACHE_NAME = 'alarmmaster-pro-v1';
const urlsToCache = [
  '/alarm-master-pro/index.html',
  '/alarm-master-pro/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ALARM_TRIGGER') {
    self.registration.showNotification('⏰ AlarmMaster Pro', {
      body: event.data.label || 'Alarm is ringing!',
      icon: '/alarm-master-pro/icons/icon-192.png',
      badge: '/alarm-master-pro/icons/icon-192.png',
      vibrate: [500, 200, 500, 200, 500],
      requireInteraction: true,
      tag: 'alarm',
      actions: [
        { action: 'snooze', title: '😴 Snooze 5 min' },
        { action: 'dismiss', title: '✅ Dismiss' }
      ]
    });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'snooze') {
    setTimeout(() => {
      self.registration.showNotification('⏰ AlarmMaster Pro - Snooze', {
        body: 'Snooze time is over!',
        icon: '/alarm-master-pro/icons/icon-192.png',
        requireInteraction: true
      });
    }, 5 * 60 * 1000);
  }
});
