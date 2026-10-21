/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {
    root: "/Users/rohankaler/pioneer-crm",
  },
};

export default nextConfig;