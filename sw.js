/* 小王的工作台 — Service Worker：核心文件离线缓存 */
const CACHE = 'sunpad-v41'; // 每次部署若业务文件有改动，必须 bump 此版本号，否则浏览器不会拉取新 SW
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/core.js',
  './js/data-food.js',
  './js/data-en-words.js',
  './js/data-en-talk.js',
  './js/data-books.js',
  './js/data-podcast.js',
  './js/data-fitness.js',
  './js/data-dance.js',
  './js/data-cantonese.js',
  './js/data-create.js',
  './js/data-glam.js',
  './js/data-news.js',
  './js/data-suggest.js',
  './js/data-mood-sentence.js',
  './js/data-skincare.js',
  './js/data-badge.js',
  './js/data-posture.js',
  './js/insights.js',
  './js/app.js',
  './js/pages/home.js',
  './js/pages/fitness.js',
  './js/pages/create.js',
  './js/pages/language.js',
  './js/pages/reading.js',
  './js/pages/ledger.js',
  './js/pages/food.js',
  './js/pages/daily.js',
  './js/pages/media.js',
  './js/pages/mine.js',
  './js/quickwins.js',
  './js/boot.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* 系统通知被点击：聚焦已打开的工作台窗口，没有则打开新窗口 */
self.addEventListener('notificationclick', e => {
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    /* 静态资源（html/css/js/icons）：cache-first —— 离线可用、秒开 */
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => {
        /* 导航请求离线时回退到首页，静态资源则抛错 */
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
    );
  } else {
    /* 跨域 API（天气/新闻/维基文库）：network-first —— 保证数据实时，
       离线时回退到上次成功的结果 */
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || Response.error()))
    );
  }
});
