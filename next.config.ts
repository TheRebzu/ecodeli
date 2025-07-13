import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Configuration next-intl
const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  // Configuration pour EcoDeli
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  // Images optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },

  // Redirections
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/fr/client",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
