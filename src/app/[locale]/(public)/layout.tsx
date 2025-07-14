import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { PublicHeader } from "@/components/layout/headers/public-header";
import { PublicFooter } from "@/components/layout/footers/public-footer";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function PublicLayout({
  children,
  params,
}: PublicLayoutProps) {
  // Safely extract locale using await
  const { locale } = await params;

  // Load messages for client components
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col">
        <PublicHeader 
          showAuth={true}
          showLanguageSwitcher={true}
          showThemeToggle={true}
        />
        <main className="flex-1">{children}</main>
        <PublicFooter 
          variant="full"
          showSocial={true}
          showWarehouseInfo={true}
        />
      </div>
    </NextIntlClientProvider>
  );
}
