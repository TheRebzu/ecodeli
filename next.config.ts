import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Enable linting during build
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },
  onDemandEntries: {
    // Keep pages in memory for longer
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
  // Disable React strict mode for now
  reactStrictMode: false,
  output: 'standalone',
  experimental: {
    // Options expérimentales disponibles
    appDocumentPreloading: false,
    serverActions: {
      allowedOrigins: ['localhost:3000', 'ecodeli.me', '*.ecodeli.me'],
    }
  },
  // Note: unstable_allowDynamic has been removed as it's not supported in Next.js 15.3.1
};

export default withNextIntl(nextConfig);
