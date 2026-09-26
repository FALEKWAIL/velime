import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
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
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
