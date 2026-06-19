import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stipulate.io';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/onboarding', '/admin/', '/dashboard/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
