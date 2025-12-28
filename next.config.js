/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['three'],

  async rewrites() {
    return [
      {
        source: '/msg/:path*',
        destination: 'https://api.louisbersine.com/:path*',
      },
    ]
  },
}

module.exports = nextConfig
