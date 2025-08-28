import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ don’t block deployment on ESLint errors
  },
};

export default nextConfig;
