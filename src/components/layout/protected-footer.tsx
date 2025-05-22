'use client';

import { usePathname } from 'next/navigation';
import { MainFooter } from './main-footer';

interface ProtectedFooterProps {
  locale?: string;
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
  showLegalLinks?: boolean;
  showLanguageSwitcher?: boolean;
  showThemeToggle?: boolean;
}

export function ProtectedFooter({
  locale = 'fr',
  showSocialLinks = false,
  showContactInfo = false,
  showLegalLinks = true,
  showLanguageSwitcher = true,
  showThemeToggle = true,
}: ProtectedFooterProps) {
  const pathname = usePathname();

  // Détermine le rôle actuel à partir du pathname
  const getRoleFromPath = () => {
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/client')) return 'client';
    if (pathname.includes('/deliverer')) return 'deliverer';
    if (pathname.includes('/merchant')) return 'merchant';
    if (pathname.includes('/provider')) return 'provider';
    return 'client';
  };

  const role = getRoleFromPath();

  return (
    <MainFooter
      locale={locale}
      showSocialLinks={showSocialLinks}
      showContactInfo={showContactInfo}
      showLegalLinks={showLegalLinks}
      showLanguageSwitcher={showLanguageSwitcher}
      showThemeToggle={showThemeToggle}
      className="mt-auto py-3" // moins haut que le footer standard
    />
  );
}
