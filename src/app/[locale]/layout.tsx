import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "../../../i18n/routing";

import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  // Get locale from params and validate it
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {
      title: "Not Found",
      description: "The page you're looking for doesn't exist."
    };
  }
  
  // Set request locale for static rendering
  setRequestLocale(locale);
  
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: {
      template: `%s | ${t("title")}`,
      default: t("title"),
    },
    description: t("description"),
    keywords: t("keywords"),
  };
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  // Get and validate locale
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    // Will be caught by not-found page
    throw new Error(`Locale '${locale}' is not supported`);
  }
  
  // Set request locale for static rendering
  setRequestLocale(locale);
  
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
