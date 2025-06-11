import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { TRPCProvider } from '@/components/providers/trpc-provider';
import ThemeProvider from '@/components/providers/theme-provider';
import { ThemeInitializer } from '@/components/providers/theme-initializer';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  // Vérifiez que la locale entrante est valide
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Activer le rendu statique
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <ThemeProvider>
      {/* Composant qui initialise le thème côté client uniquement */}
      <ThemeInitializer />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <TRPCProvider>{children}</TRPCProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}
