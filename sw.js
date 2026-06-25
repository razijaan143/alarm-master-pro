// Alarm & Hidayah - Service Worker v3.0
// Handles: caching, background sync, push notifications

const CACHE_NAME = 'alarmmaster-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// =================== INSTALL ===================
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {
        return cache.add('./index.html');
      });
    })
  );
  self.skipWaiting();
});

// =================== ACTIVATE ===================
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
  // Start notification scheduler
  startNotificationScheduler();
});

// =================== FETCH (Cache First) ===================
self.addEventListener('fetch', function(e) {
  // Only cache same-origin requests
  if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        });
      }).catch(function() {
        return caches.match('./index.html');
      })
    );
  }
});

// =================== MESSAGE FROM APP ===================
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    startNotificationScheduler();
  }
  if (e.data && e.data.type === 'TEST_NOTIFICATION') {
    sendScheduledNotification('test');
  }
});

// =================== NOTIFICATION CLICK ===================
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const action = e.action;
  
  if (action === 'dismiss') return;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      // If app already open, focus it
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].url && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

// =================== PUSH (if push API available) ===================
self.addEventListener('push', function(e) {
  if (!e.data) return;
  try {
    const data = e.data.json();
    e.waitUntil(
      self.registration.showNotification(data.title || 'Alarm & Hidayah', {
        body: data.body || '',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: data.tag || 'push',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200]
      })
    );
  } catch(err) {}
});

// =================== SCHEDULER ===================
// Islamic content for notifications
const HADITH_NOTIFS = [
  { text: '"Actions are judged by their intentions." — Bukhari & Muslim', q: 'What are actions judged by?' },
  { text: '"The best of you are those who learn and teach the Quran." — Bukhari', q: 'Who are the best among Muslims?' },
  { text: '"A Muslim is one from whose tongue and hands others are safe." — Bukhari', q: 'How is a Muslim defined?' },
  { text: '"Seeking knowledge is an obligation upon every Muslim." — Ibn Majah', q: 'Upon whom is seeking knowledge obligatory?' },
  { text: '"The best people are those most beneficial to others." — Tabarani', q: 'Who are the best people?' },
  { text: '"Paradise lies at the feet of mothers." — Ibn Majah', q: 'Where does Paradise lie?' },
  { text: '"Every act of goodness is charity." — Bukhari', q: 'What is every act of goodness?' },
  { text: '"Patience is half of faith." — Bayhaqi', q: 'How much of faith is patience?' },
  { text: '"He who does not show mercy will not be shown mercy." — Bukhari', q: 'Who will not be shown mercy?' },
  { text: '"Religion is sincerity." — Muslim', q: 'What is religion according to this Hadith?' },
  { text: '"A kind word is charity." — Bukhari', q: 'What type of deed is a kind word?' },
  { text: '"Fear Allah wherever you are." — Tirmidhi', q: 'Where should you fear Allah?' },
  { text: '"The strong person controls himself when angry." — Bukhari', q: 'What is true strength?' },
  { text: '"The best of you is the best to his family." — Tirmidhi', q: 'Who is the best person?' },
  { text: '"Whoever deceives us is not one of us." — Muslim', q: 'What did Prophet say about deception?' },
  { text: '"Dua is worship." — Abu Dawud', q: 'What is dua classified as?' },
  { text: '"The most beloved deeds to Allah are the most consistent ones, even if small." — Bukhari', q: 'What deeds does Allah love most?' }
];

const DUA_NOTIFS = [
  { title: 'Morning Dua', text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ — We have reached morning and sovereignty belongs to Allah.' },
  { title: 'Dua for Ease', text: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا — O Allah, nothing is easy except what You make easy.' },
  { title: 'Dua for Parents', text: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا — My Lord, have mercy on them as they raised me.' },
  { title: 'Morning Protection', text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ — In the name of Allah, with whose name nothing can cause harm.' },
  { title: 'Dua for Knowledge', text: 'رَبِّ زِدْنِي عِلْمًا — My Lord, increase me in knowledge. (Quran 20:114)' },
  { title: 'Dua of Yunus AS', text: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ — There is no god but You, glory be to You.' },
  { title: 'Evening Dua', text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ — We have reached evening and sovereignty belongs to Allah.' },
  { title: 'Dua for Forgiveness', text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ — I seek forgiveness of Allah the Great and repent to Him.' }
];

const QUOTE_NOTIFS = [
  '"Indeed, with hardship will come ease." — Quran 94:6',
  '"Whoever fears Allah, He will make for him a way out." — Quran 65:2',
  '"Allah is sufficient for us." — Quran 3:173',
  '"Do not despair of the mercy of Allah." — Quran 12:87',
  '"Indeed, Allah is with the patient." — Quran 2:153',
  '"Remember Me and I will remember you." — Quran 2:152',
  '"Verily in the remembrance of Allah do hearts find rest." — Quran 13:28',
  '"Perhaps you dislike a thing and it is good for you." — Quran 2:216',
  '"He is with you wherever you are." — Quran 57:4',
  '"My Lord, increase me in knowledge." — Quran 20:114'
];

const QUIZ_NOTIFS = [
  'What are actions judged by in Islam?',
  'Who is the best Muslim according to Hadith?',
  'Where does Paradise lie according to Hadith?',
  'What is every act of goodness equal to?',
  'Upon whom is seeking knowledge obligatory?',
  'What did Prophet ﷺ say is half of faith?',
  'What is true strength according to Prophet ﷺ?',
  'Who are the best people according to Hadith?',
  'What is a kind word classified as in Islam?',
  'What does "Religion is sincerity" mean?'
];

let schedulerInterval = null;

function startNotificationScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  
  // Check every minute
  schedulerInterval = setInterval(function() {
    checkAndSendNotifications();
  }, 60000);
  
  // Also check immediately
  checkAndSendNotifications();
}

function checkAndSendNotifications() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const today = now.toDateString();

  // Get saved send dates
  const sent = JSON.parse(self.hadithSentDate === undefined ? '{}' : '{}');

  // 7:00 AM — Daily Hadith
  if (h === 7 && m === 0) {
    sendScheduledNotification('hadith', today);
  }

  // 9:00 AM — Daily Quiz
  if (h === 9 && m === 0) {
    sendScheduledNotification('quiz', today);
  }

  // 12:00 PM — Midday Dua
  if (h === 12 && m === 0) {
    sendScheduledNotification('dua', today);
  }

  // 6:00 PM — Evening Quote
  if (h === 18 && m === 0) {
    sendScheduledNotification('quote', today);
  }

  // 8:00 PM — Night Reminder
  if (h === 20 && m === 0) {
    sendScheduledNotification('night', today);
  }
}

function sendScheduledNotification(type, today) {
  const rand = Math.floor(Math.random() * 100);
  let title, body, tag, actions;

  if (type === 'hadith') {
    const h = HADITH_NOTIFS[rand % HADITH_NOTIFS.length];
    title = '📖 Daily Hadith — Alarm & Hidayah';
    body = h.text;
    tag = 'daily-hadith';
    actions = [
      { action: 'open', title: '📖 Read More' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }
  else if (type === 'quiz') {
    const q = QUIZ_NOTIFS[rand % QUIZ_NOTIFS.length];
    title = '🧠 Daily Quiz — Alarm & Hidayah';
    body = '🤔 ' + q + ' — Tap to answer!';
    tag = 'daily-quiz';
    actions = [
      { action: 'open', title: '🧠 Answer Now' },
      { action: 'dismiss', title: 'Later' }
    ];
  }
  else if (type === 'dua') {
    const d = DUA_NOTIFS[rand % DUA_NOTIFS.length];
    title = '🤲 ' + d.title + ' — Alarm & Hidayah';
    body = d.text;
    tag = 'daily-dua';
    actions = [
      { action: 'open', title: '🤲 More Duas' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }
  else if (type === 'quote') {
    const q = QUOTE_NOTIFS[rand % QUOTE_NOTIFS.length];
    title = '✨ Islamic Quote — Alarm & Hidayah';
    body = q;
    tag = 'daily-quote';
    actions = [
      { action: 'open', title: '✨ More Quotes' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }
  else if (type === 'night') {
    title = '🌙 Night Reminder — Alarm & Hidayah';
    body = 'سُبْحَانَ اللَّهِ — SubhanAllah 33x, Alhamdulillah 33x, Allahu Akbar 34x before sleep!';
    tag = 'night-reminder';
    actions = [
      { action: 'open', title: '📿 Open Tasbeeh' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }
  else if (type === 'test') {
    title = '✅ Alarm & Hidayah';
    body = 'Notifications are working! Daily reminders enabled.';
    tag = 'test';
    actions = [];
  }
  else {
    return;
  }

  self.registration.showNotification(title, {
    body: body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: tag,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    actions: actions || []
  }).catch(function() {});
}
