/** @type {import('next').NextConfig} */
const configuredBasePath =
  process.env.NEXT_PUBLIC_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : ''
const normalizedBasePath =
  configuredBasePath && configuredBasePath !== '/'
    ? configuredBasePath.replace(/\/+$/, '')
    : ''
const embedFrameAncestors =
  process.env.EMBED_ALLOWED_ORIGINS || "*"

const nextConfig = {
  // Root public site by default. Set NEXT_PUBLIC_BASE_PATH explicitly only if reverse-proxied.
  ...(normalizedBasePath ? { basePath: normalizedBasePath, assetPrefix: normalizedBasePath } : {}),
  reactStrictMode: true,
  
  // Image optimization
  images: { 
    domains: ['app.billiardtoday.com', 'billiardtoday.com'],
    unoptimized: false,
  },
  
  // Production optimization
  compress: true,
  poweredByHeader: false,
  
  // Για καλύτερο SEO
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_STRAPI_URL: process.env.NEXT_PUBLIC_STRAPI_URL || 'https://app.billiardtoday.com',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://billiardtoday.com',
    NEXT_PUBLIC_SCOREBOARD_URL: process.env.NEXT_PUBLIC_SCOREBOARD_URL || 'https://scoreboard.billiardtoday.com',
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.billiardtoday.com',
    NEXT_PUBLIC_BASE_PATH: normalizedBasePath,
  },
  
  // Headers για SEO και security
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${embedFrameAncestors};`,
          },
        ],
      },
      {
        source: '/:path((?!embed/).*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          ...(isDev
            ? [
                {
                  key: 'Content-Security-Policy',
                  value:
                    "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*",
                },
              ]
            : [
                {
                  key: 'X-Frame-Options',
                  value: 'SAMEORIGIN',
                },
              ]),
        ],
      },
    ]
  },
};

module.exports = nextConfig;
