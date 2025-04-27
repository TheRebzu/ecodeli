import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import ThemeProvider from '@/components/providers/theme-provider';

interface PublicLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  // Safely extract locale using Promise.all
  const [safeParams] = await Promise.all([params]);
  const locale = safeParams.locale;

  // Load messages for client components
  const messages = await getMessages({ locale });

  return (
    <ThemeProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div className="flex min-h-screen flex-col">
          <header className="border-b">
            <div className="container py-4">
              <nav>{/* Navbar content will go here */}</nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="bg-muted py-6 mt-auto">
            <div className="container">
              {/* Footer content will go here */}
              <p className="text-center text-sm text-muted-foreground">
                © 2024 EcoDeli. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
