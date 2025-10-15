/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/tournaments',
  assetPrefix: '/tournaments',
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
  },
  
  // Headers για SEO και security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig;