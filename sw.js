/* Mon Budget — fonctionnement hors ligne.
   L'app elle-même (page, icônes) est gardée sur le téléphone.
   Avec du réseau : on prend la dernière version publiée, et on la garde.
   Sans réseau : on ouvre celle qui est gardée.
   Les données (Supabase) ne passent JAMAIS par ici : elles ne sont
   jamais mises en cache, pour ne pas mélanger les comptes. */
const CACHE = "mon-budget-v2";
const FICHIERS = ["./", "./index.html", "./apple-touch-icon.png", "./icone-512.png", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== self.location.origin) return;

  const garde = () => caches.match(req, { ignoreSearch: true })
    .then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined));

  const reseau = fetch(req).then(r => {
    if (r && r.ok) { const copie = r.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
    return r;
  });

  /* réseau lent (métro, chantier) : au bout de 3 s on ouvre la version gardée */
  const delai = new Promise(res => setTimeout(res, 3000)).then(garde);

  e.respondWith(
    Promise.race([reseau.catch(() => null), delai])
      .then(r => r || reseau.catch(garde))
      .then(r => r || garde())
  );
});
