// next.config.ts
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configurer les alias pour s'assurer que @/ pointe vers src/
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    
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
        events: require.resolve('events/'),
      };
      
      // Ajouter socket.io-client au client uniquement
      config.externals = [
        ...(config.externals || []),
        // Exclure socket.io du bundle client (on n'utilise que socket.io-client)
        {'socket.io': 'commonjs socket.io'},
      ];
    }
    
    return config;
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
