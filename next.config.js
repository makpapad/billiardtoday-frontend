const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: { domains: ['app.billiardtoday.com'] },
  experimental: { optimizeCss: true }
};
module.exports = nextConfig;