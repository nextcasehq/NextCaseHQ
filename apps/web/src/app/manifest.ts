import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NextCaseHQ Legal Workspace',
    short_name: 'NextCaseHQ',
    description: 'High-density, multi-tenant workspace architecture engineered for the 2023 Indian Legal Reforms.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBFBFA',
    theme_color: '#111111',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
  };
}
