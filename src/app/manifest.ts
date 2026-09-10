import type { MetadataRoute } from 'next'

/** Web app manifest (§38). Makes the app installable on iOS and Android. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pole Studio — Teaching Notebook',
    short_name: 'Pole Studio',
    description:
      'Private teaching notebook, class calendar, student progress tracker and trick library for a pole fitness instructor.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f7f4f1',
    theme_color: '#8a2f6b',
    categories: ['fitness', 'productivity', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: "Today's classes", short_name: 'Today', url: '/dashboard' },
      { name: 'Calendar', short_name: 'Calendar', url: '/calendar' },
      { name: 'Students', short_name: 'Students', url: '/students' },
    ],
  }
}
