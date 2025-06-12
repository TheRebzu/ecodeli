'use client';

import { useRouter, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  locale: string;
}

/**
 * Component for switching between available languages
 */
export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // Mapping des codes de langue vers leurs noms complets
  const languageNames = {
    fr: 'Français',
    en: 'English',
  };

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;

    // The useRouter from i18n Navigation allows us to
    // change the locale while preserving the current route
    router.replace(
      // TypeScript will validate that only known params are used with pathname
      // Since they'll always match for the current route, we can skip runtime checks
      // @ts-expect-error - Type checking limitation with dynamic params
      { pathname, params },
      { locale: newLocale }
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline-block">
            {languageNames[locale as keyof typeof languageNames]}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map(localeOption => (
          <DropdownMenuItem
            key={localeOption}
            onClick={() => handleLocaleChange(localeOption)}
            className={locale === localeOption ? 'bg-accent font-medium' : ''}
          >
            {languageNames[localeOption as keyof typeof languageNames]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
