'use client';

import { MainFooter } from './main-footer';

interface PublicFooterProps {
  locale?: string;
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
  showLegalLinks?: boolean;
  showLanguageSwitcher?: boolean;
  showThemeToggle?: boolean;
}

export function PublicFooter({
  locale = 'fr',
  showSocialLinks = true,
  showContactInfo = true,
  showLegalLinks = true,
  showLanguageSwitcher = true,
  showThemeToggle = true,
}: PublicFooterProps) {
  return (
    <MainFooter
      locale={locale}
      showSocialLinks={showSocialLinks}
      showContactInfo={showContactInfo}
      showLegalLinks={showLegalLinks}
      showLanguageSwitcher={showLanguageSwitcher}
      showThemeToggle={showThemeToggle}
      className="mt-auto"
    />
  );
}
