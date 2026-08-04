// 校园论坛 Service Worker (PWA)
// v4：修复"前端代码更新但浏览器永远加载旧版"的 SW 缓存问题
//  - server.js 已对 sw.js 设置 no-cache，保证每次导航都能检测到本文件变化
//  - install 阶段调用 skipWaiting()：新 SW 安装后立即激活，不等旧页面全部关闭
//  - activate 阶段调用 clients.claim()：激活后立即接管所有已打开的页面
//  - JS/CSS 保持 network-first：保证代码文件实时更新，避免缓存旧逻辑
const CACHE_NAME = 'school-forum-v4';
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

// 安装：缓存静态资源，并立即激活（不等待旧页面关闭）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  // 关键：新 SW 安装完成后立即激活，否则旧 SW 会一直控制页面
  self.skipWaiting();
});

// 激活：清理旧缓存，并立即接管所有已打开的页面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：
// - 文档请求（HTML 页面）→ network-first：保证发版后立即拿到新页面，离线时回退缓存
// - JS/CSS 代码文件 → network-first：保证发版后代码立即更新（cache-first 会导致
//   浏览器长期使用旧代码，出现"修复了但没生效"的假象）
// - 图片等其他静态资源 → cache-first：提升加载性能
// - 跳过 /api/ 与 /health：API 数据不能缓存（避免陈旧），健康检查不能被缓存误导
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理同源 GET 请求
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 跳过 API 与健康检查（避免缓存导致 502 页误判服务器正常）
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') return;

  const isDocument = request.mode === 'navigate';
  const isCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if (isDocument || isCode) {
    // 文档与代码文件：network-first
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(request).then((cached) => cached || new Response('离线状态', { status: 503 }))
      )
    );
  } else {
    // 图片等静态资源：cache-first
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response('离线状态', { status: 503 }));
      })
    );
  }
});
