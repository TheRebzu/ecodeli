import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Configuration next-intl avec le bon chemin
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Configuration pour EcoDeli - packages externes pour éviter les erreurs de bundling
  serverExternalPackages: ['@prisma/client', 'better-auth', 'bcryptjs'],
  
  // Webpack config pour éviter les erreurs de bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client', 'bcryptjs');
    }
    return config;
  },
  
  // Images optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Réactiver lorsque le code sera stable
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default withNextIntl(nextConfig);
