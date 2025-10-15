const nextConfig = {
  reactStrictMode: true,
  images: { domains: ['app.billiardtoday.com'] },
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
      },
    ]
  },
};
module.exports = nextConfig;