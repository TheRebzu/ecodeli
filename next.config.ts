import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable linting during build for now
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
