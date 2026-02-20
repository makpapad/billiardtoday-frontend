/** @type {import('next').NextConfig} */
const configuredBasePath =
  process.env.NEXT_PUBLIC_BASE_PATH ||
  (process.env.NODE_ENV === 'production' ? '/tournaments' : '')

const nextConfig = {
  // Base path can be enabled in local too (e.g. when proxied by WordPress)
  basePath: configuredBasePath,
  assetPrefix: configuredBasePath,
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
    NEXT_PUBLIC_BASE_PATH: configuredBasePath,
  },
  
  // Headers για SEO και security
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    return [
      {
        source: '/:path*',
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
