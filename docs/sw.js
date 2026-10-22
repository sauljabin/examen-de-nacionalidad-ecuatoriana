"use strict";

// Service worker: keeps the site usable offline.
//
// - Page files and data/cards.json: network first, so updates arrive as soon
//   as there is a connection; the cached copy is used offline.
// - Images: cache first. Question images (maps, coat of arms, flag) are saved
//   on install; answer photos are saved the first time they are shown.
// - Google Fonts: served from cache when available and refreshed in the
//   background.
//
// Bump VERSION when an image keeps its file name but changes its content.

const VERSION = "v1";
const CACHE = `examen-${VERSION}`;
const SHELL = [
  "./",
  "index.html",
  "app.js",
  "styles.css",
  "data/cards.json",
  "manifest.webmanifest",
  "icons/favicon-32.png",
  "icons/favicon-64.png",
  "icons/flag.png",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

async function questionImages() {
  const response = await fetch("data/cards.json", { cache: "no-cache" });
  const data = await response.json();
  const images = new Set();
  for (const category of data.categories) {
    for (const sub of category.subcategories) {
      for (const card of sub.cards) {
        if (card.image) images.add(card.image.src);
      }
    }
  }
  return [...images];
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Question images are needed to answer; a failed one must not block the install.
    await Promise.allSettled((await questionImages()).map((src) => cache.add(src)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("examen-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") return cache.match("index.html");
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok || response.type === "opaque") cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.origin === self.location.origin) {
    const isImage = request.destination === "image" || url.pathname.includes("/images/");
    event.respondWith(isImage ? cacheFirst(request) : networkFirst(request));
  }
});
