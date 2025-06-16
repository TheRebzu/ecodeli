import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import ThemeProvider from "@/components/providers/theme-provider";
import { PublicHeader } from "@/components/layout/public/header";
import { MainFooter } from "@/components/layout/public/footer";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale }>;
}

export default async function PublicLayout({
  children,
  params}: PublicLayoutProps) {
  // Safely extract locale using await
  const { locale } = await params;

  // Load messages for client components
  const messages = await getMessages({ locale  });

  return (
    <ThemeProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div className="flex min-h-screen flex-col">
          <PublicHeader locale={locale} />
          <main className="flex-1">{children}</main>
          <MainFooter locale={locale} />
        </div>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
