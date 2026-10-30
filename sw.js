const CACHE='memoria-japonesa-v8-profile-avatar';
const STATIC=['/','/index.html','/assinar.html','/conta.html','/account.css','/account.js','/checkout.css','/checkout.js','/style.css','/membership.css','/academy.css','/app.js','/membership.js','/academy.js','/manifest.webmanifest','/favicon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const path=new URL(req.url).pathname;
 if(path.startsWith('/api/')||!STATIC.includes(path))return;
 event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
  if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return res;
 }).catch(()=>caches.match(req)));
});
