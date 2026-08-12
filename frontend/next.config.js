/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com', 'lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
  },
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
}

module.exports = nextConfig
