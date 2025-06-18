// next.config.ts
import { NextConfig } from "next";
import withNextIntl from "next-intl/plugin";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Configurer le serveur de fichiers statiques
  output: "standalone",

  // Optimisations de build (swcMinify est maintenant par défaut dans Next.js 15+)
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Turbopack configuration (stable)
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

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

    // Gérer les modules Node.js côté client (uniquement pour le client)
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
        events: false,
      };

      // Ajouter socket.io-client au client uniquement
      config.externals = [
        ...(config.externals || []),
        // Exclure socket.io du bundle client (on n'utilise que socket.io-client)
        { "socket.io": "commonjs socket.io" },
      ];
    }

    return config;
  },
};

export default withNextIntl()(nextConfig);
