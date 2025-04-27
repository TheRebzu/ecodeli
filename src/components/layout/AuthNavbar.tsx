'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface AuthNavbarProps {
  locale: string;
}

export default function AuthNavbar({ locale }: AuthNavbarProps) {
  const t = useTranslations('common');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="font-bold">EcoDeli</span>
        </Link>
        <div className="flex items-center space-x-4">
          <nav className="flex items-center space-x-4">
            <Link
              href={`/${locale}/login`}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {t('login')}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {t('register')}
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher locale={locale} />
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
