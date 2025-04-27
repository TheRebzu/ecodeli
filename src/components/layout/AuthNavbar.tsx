'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthNavbarProps {
  locale: string;
}

export default function AuthNavbar({ locale }: AuthNavbarProps) {
  const t = useTranslations('common.navigation');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}`}
            className="flex items-center space-x-2 transition-colors hover:text-primary"
            title={t('home')}
          >
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
            <span className="font-bold hidden md:inline-block">EcoDeli</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden md:flex text-muted-foreground"
          >
            <Link href={`/${locale}`}>
              <Home className="h-4 w-4 mr-2" />
              {t('home')}
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href={`/${locale}/login`}>{t('login')}</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hidden md:flex"
            >
              <Link href={`/${locale}/register`}>{t('register')}</Link>
            </Button>
            <Button variant="default" size="sm" asChild className="md:ml-2">
              <Link href={`/${locale}/register`}>{t('register')}</Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
            <LanguageSwitcher locale={locale} />
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
