import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function PublicLayout({
  children,
  params
}: PublicLayoutProps) {
  // Safely extract locale using await
  const { locale } = await params;

  // Load messages for client components
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">EcoDeli</h1>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t">
          <div className="container mx-auto px-4 py-4">
            <p className="text-center text-muted-foreground">
              © 2024 EcoDeli. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
