/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Skip type checking errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
