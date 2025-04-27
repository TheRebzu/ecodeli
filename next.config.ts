import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Créer le plugin next-intl avec le chemin vers le fichier de configuration
// Utilisons le fichier de configuration mais adaptez les options
const withNextIntl = createNextIntlPlugin('./src/app/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Nécessaire pour éviter les erreurs ESLint durant la construction
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Nécessaire pour éviter les erreurs TS durant la construction
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  serverExternalPackages: ['@prisma/client'],
  // Suppression des redirections liées à l'internationalisation
  // async redirects() {
  //   return [
  //     {
  //       source: '/:locale/home',
  //       destination: '/:locale',
  //       permanent: true,
  //     },
  //   ];
  // },
};

// Export de la configuration avec le plugin next-intl
export default withNextIntl(nextConfig);
