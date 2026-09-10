/* eslint-disable no-restricted-globals */
/**
 * Pole Studio service worker.
 *
 * Scope (deliberately narrow, per §38): keep the app shell and static assets
 * available so the app opens and navigates on a weak studio connection. It does
 * NOT cache private student data or attempt offline database sync — the brief
 * explicitly warns against that for V1, and caching signed media URLs or
 * authenticated pages on disk would be a privacy problem.
 */

const VERSION = 'v1'
const SHELL_CACHE = `pole-studio-shell-${VERSION}`
const ASSET_CACHE = `pole-studio-assets-${VERSION}`
const OFFLINE_URL = '/offline'

const SHELL_ASSETS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      // A failed pre-cache must never block installation.
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isPrivate(url) {
  // Never cache anything that can carry student data or credentials.
  return (
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/storage/v1/') ||
    url.searchParams.has('token')
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isPrivate(url)) return

  // Navigations: always try the network so the instructor sees live data;
  // fall back to the offline page only when the network genuinely fails.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE)
        return (await cache.match(OFFLINE_URL)) ?? Response.error()
      }),
    )
    return
  }

  // Build output is content-hashed and immutable: cache-first is safe and fast.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
