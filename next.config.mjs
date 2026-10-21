/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Only apply turbopack root locally if running on macOS/development
  ...(process.env.NODE_ENV === 'development'
    ? {
        turbopack: {
          root: "/Users/rohankaler/pioneer-crm",
        },
      }
    : {}),
};

export default nextConfig;