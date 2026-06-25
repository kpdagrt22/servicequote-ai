/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep server actions available for form handling.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
