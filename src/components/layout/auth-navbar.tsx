'use client';

import Link from 'next/link';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface AuthNavbarProps {
  locale: string;
}

export default function AuthNavbar({ locale }: AuthNavbarProps) {
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href={`/${locale}/home`} className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold text-xl">EcoDeli</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/home`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;accueil
            </Button>
          </Link>
          <LanguageSwitcher locale={locale} />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
