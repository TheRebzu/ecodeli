import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable linting during build for now
    ignoreDuringBuilds: true,
    dirs: [], // Disable ESLint for all directories
  },
  typescript: {
    // Disable type checking during build for now
    ignoreBuildErrors: true,
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
      allowedOrigins: ['localhost:3000', 'ecodeli.com', '*.ecodeli.com'],
    }
  },
  // Note: unstable_allowDynamic has been removed as it's not supported in Next.js 15.3.1
};

export default withNextIntl(nextConfig);
