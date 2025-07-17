import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Configuration next-intl
const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  // Configuration pour EcoDeli
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  // Mode standalone pour Docker
  output: "standalone",

  // Ignorer les erreurs TypeScript pendant le build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimisations pour accélérer le build
  compress: true,
  poweredByHeader: false,

  // Fix pour Next.js 15 avec next-intl
  experimental: {
    // Nécessaire pour next-intl avec App Router
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Fix pour le client-reference-manifest
    optimizePackageImports: ["lucide-react", "@radix-ui/*"],
  },

  // Images optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Headers de sécurité et CORS
  async headers() {
    const headers = [
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

    // En développement, ajouter des headers CORS permissifs
    if (process.env.NODE_ENV === "development") {
      headers.push({
        source: "/_next/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      });
    }

    return headers;
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

  // Webpack configuration pour gérer les modules problématiques
  webpack: (config, { isServer }) => {
    // Fix pour les modules qui causent des problèmes
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default withNextIntl(nextConfig);