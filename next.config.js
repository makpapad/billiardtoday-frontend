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

/**
 * Παλιές διευθύνσεις του WordPress blog που προηγήθηκε του σημερινού site.
 * Μετρήθηκε (02/11/2026, Wayback + live έλεγχος): 170 διευθύνσεις που η Google
 * εξακολουθεί να επισκέπτεται έδιναν 404 — 14% του crawl πήγαινε σε νεκρές σελίδες.
 * Κάθε κανόνας επαληθεύτηκε ότι σήμερα δίνει 404 (άρα δεν σκιάζει ζωντανή σελίδα),
 * με εξαίρεση το `/handicap` (ζωντανή σελίδα) και το `/stats` (υπάρχον redirect) που
 * έχουν μείνει έξω από τη λίστα.
 */
const legacyRedirects = require('./src/lib/legacy-redirects.json')

const nextConfig = {
  // Root public site by default. Set NEXT_PUBLIC_BASE_PATH explicitly only if reverse-proxied.
  ...(normalizedBasePath ? { basePath: normalizedBasePath, assetPrefix: normalizedBasePath } : {}),
  reactStrictMode: true,
  
  // Image optimization
  images: { 
    domains: ['app.billiardtoday.com', 'billiardtoday.com', 'cdn.billiardtoday.com'],
    unoptimized: false,
  },
  
  // Production optimization
  compress: true,
  poweredByHeader: false,
  
  // Stable build id for cache-safe deployments.
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_STRAPI_URL: process.env.NEXT_PUBLIC_STRAPI_URL || 'https://app.billiardtoday.com',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://billiardtoday.com',
    NEXT_PUBLIC_SCOREBOARD_URL: process.env.NEXT_PUBLIC_SCOREBOARD_URL || 'https://scoreboard.billiardtoday.com',
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.billiardtoday.com',
    NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL || 'https://cdn.billiardtoday.com',
    NEXT_PUBLIC_BASE_PATH: normalizedBasePath,
  },
  
  // SEO and security headers.
  async redirects() {
    const permanent = 301
    return [
      // 1. Δομικά μοτίβα του παλιού WordPress (κατηγορίες/tags/συγγραφείς/αρχεία ημερομηνίας).
      { source: '/category/:path*', destination: '/news', statusCode: permanent },
      { source: '/tag/:path*', destination: '/news', statusCode: permanent },
      { source: '/author/:path*', destination: '/', statusCode: permanent },
      { source: '/feed', destination: '/news', statusCode: permanent },
      { source: '/comments/feed', destination: '/news', statusCode: permanent },
      { source: '/about', destination: '/', statusCode: permanent },
      // Υπολείμματα WordPress που ζητά ακόμη ο Googlebot (μετρήθηκαν στα logs της 10/11/2026).
      { source: '/blog', destination: '/news', statusCode: permanent },
      { source: '/blog/:path*', destination: '/news', statusCode: permanent },
      { source: '/press', destination: '/news', statusCode: permanent },
      { source: '/site', destination: '/', statusCode: permanent },
      // Παλιές διευθύνσεις sitemap (WordPress/Yoast) → το πραγματικό sitemap.
      { source: '/sitemap.html', destination: '/sitemap.xml', statusCode: permanent },
      { source: '/sitemap_index.xml', destination: '/sitemap.xml', statusCode: permanent },
      // 2. Οι συγκεκριμένες παλιές διευθύνσεις που ξέρουμε ονομαστικά (λίστα από το Wayback).
      ...legacyRedirects.map(({ source, destination }) => ({
        source,
        destination,
        statusCode: permanent,
      })),
    ]
  },

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
