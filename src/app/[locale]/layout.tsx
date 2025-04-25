import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "../../../i18n/routing";
import { getMessages } from "@/utils/get-messages";

import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { AuthSessionProvider } from "@/components/auth/session-provider";

// Helper function to safely get translations with fallbacks
const safeTranslation = (t: any, key: string, fallback: string) => {
  try {
    return t(key);
  } catch (error) {
    console.warn(`Missing translation for ${key}, using fallback`);
    return fallback;
  }
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  // Get locale from params and validate it
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {
      title: "Not Found",
      description: "The page you're looking for doesn't exist.",
    };
  }

  // Set request locale for static rendering
  setRequestLocale(locale);

  try {
    const t = await getTranslations({ locale, namespace: "metadata" });

    return {
      title: {
        template: `%s | ${safeTranslation(t, "title", "EcoDeli")}`,
        default: safeTranslation(t, "title", "EcoDeli"),
      },
      description: safeTranslation(t, "description", "Plateforme de livraison écologique"),
      keywords: safeTranslation(t, "keywords", "livraison, écologique, durable"),
    };
  } catch (error) {
    // Fallback metadata if translations fail to load
    return {
      title: {
        template: "%s | EcoDeli",
        default: "EcoDeli",
      },
      description: "Plateforme de livraison écologique",
      keywords: "livraison, écologique, durable",
    };
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
  
  // Load messages for the client
  const messages = await getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AuthSessionProvider>
              <TRPCProvider>
                {children}
                <Toaster position="bottom-right" />
              </TRPCProvider>
            </AuthSessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
