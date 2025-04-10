/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  serverExternalPackages: ['@prisma/client'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  turbopack: {
    // Configuration Turbopack pour Next.js 15
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ne pas inclure les modules natifs côté client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "@mapbox/node-pre-gyp": false,
        "node-pre-gyp": false,
        "node-gyp": false,
        "npm": false,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };
    }

    // Ignorer les erreurs des modules natifs
    config.module = {
      ...config.module,
      exprContextCritical: false,
      noParse: [/node-pre-gyp/],
    };

    return config;
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  distDir: process.env.BUILD_DIR || '.next',
};

export default nextConfig;
