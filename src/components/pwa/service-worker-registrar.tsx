'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker that caches the app shell (§38).
 *
 * Deliberately simple: it makes the app open and navigate when the network is
 * poor. It does not attempt offline database sync, which the brief explicitly
 * warns against for V1.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // A failed registration must never break the app — it just means no
        // offline shell on this device.
      })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
