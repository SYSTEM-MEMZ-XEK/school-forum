// 校园论坛 Service Worker (PWA)
const CACHE_NAME = 'school-forum-v1';
const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/css/chat.css',
  '/css/post-detail.css',
  '/css/edit-simple.css',
  '/css/admin.css',
  '/js/utils.js',
  '/js/user.js',
  '/js/init-requires-login.js',
  '/images/logo.svg'
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过 API 请求
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // 只缓存成功的 GET 请求
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // 离线时返回缓存（如果有的话）
        return cached || new Response('离线状态', { status: 503 });
      });
    })
  );
});
