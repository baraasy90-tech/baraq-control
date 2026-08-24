// Service Worker أساسي: يجعل التطبيق قابلاً للتثبيت (PWA) ويحفظ نسخة من الصفحات
// والملفات الثابتة (JS/CSS/الأيقونات) بذاكرة التخزين المؤقت للمتصفح فقط لتسريع
// التحميلات اللاحقة وإظهار شيء عند انقطاع الشبكة مؤقتاً — لا يتدخل إطلاقاً في طلبات
// Supabase (بيانات حيّة، يجب أن تصل دائماً من الشبكة مباشرة بلا أي تخزين مؤقت).

const CACHE_NAME = "baraq-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // فقط GET، فقط نفس الأصل (لا نلمس Supabase أو أي مصدر خارجي إطلاقاً)
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await cache.match("/");
          if (shell) return shell;
        }
        throw err;
      }
    })
  );
});
