import { locales } from '../i18n/request';
import { AuthProvider } from '@/components/auth/auth-provider';

interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  // Safely extract locale using Promise.all
  const [safeParams] = await Promise.all([params]);
  const locale = safeParams.locale;

  // Validate that the locale is supported, mais continuer même en cas d'erreur
  try {
    if (!locales.includes(locale)) {
      console.warn(
        `Locale non supporté: ${locale}, devrait être l'un des suivants: ${locales.join(', ')}`
      );
      // Ne pas rediriger pour éviter les boucles - laisser not-found se déclencher naturellement si nécessaire
    }
  } catch (error) {
    console.error('Erreur lors de la validation du locale:', error);
    // Continuer malgré l'erreur
  }

  return <AuthProvider>{children}</AuthProvider>;
}
