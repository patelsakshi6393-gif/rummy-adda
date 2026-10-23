import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RummyAdda - Indian Rummy Gaming Platform',
    short_name: 'RummyAdda',
    description: 'Play Indian Rummy with 100% genuine real players on Points, Pool 101, and Deals tables.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a0205',
    theme_color: '#c98e21',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
