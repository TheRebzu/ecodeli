// next.config.ts
import { NextConfig } from "next";
import withNextIntl from "next-intl/plugin";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Configurer ESLint pour ignorer les erreurs pendant le build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Configurer TypeScript pour ignorer les erreurs pendant le build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  // Configurer le serveur de fichiers statiques
  output: "standalone",

  // Optimisations de build (swcMinify est maintenant par défaut dans Next.js 15+)
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Configurer les modules externes pour éviter les erreurs de bundling
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    'bcryptjs',
    'nodemailer',
    'socket.io',
    'puppeteer',
    'exceljs',
    'onesignal-node'
  ],

  // Optimisation expérimentale
  experimental: {
    optimizePackageImports: ["@radix-ui/react-icons", "lucide-react"],
    ppr: false, // Partial Prerendering
    optimizeCss: true,
  },

  // Activer les images externes avec la nouvelle configuration
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        pathname: "/uploads/**",
      },
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // Configurer les alias pour s'assurer que @/ pointe vers src/
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "./src"),
    };

    // Résoudre les fallbacks pour les modules Node.js UNIQUEMENT côté client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        stream: false,
        crypto: false,
        util: false,
        assert: false,
        url: false,
        os: false,
        constants: false,
        buffer: false,
        child_process: false,
        dns: false,
        dgram: false,
        worker_threads: false,
        events: require.resolve("events"),
      };
    }

    // Optimisations de performance
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

export default withNextIntl()(nextConfig);
