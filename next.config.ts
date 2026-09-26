import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Image optimization is enabled (default).
    // Next.js will automatically resize, compress, and serve WebP/AVIF
    // — dramatically reducing bandwidth vs serving raw originals.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'poswtkarskyouacsjfct.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
