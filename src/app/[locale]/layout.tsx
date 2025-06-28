// Layout principal pour EcoDeli avec internationalisation
import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { AuthProvider } from "@/lib/auth-provider"
import { LayoutProvider } from "@/components/layout/providers/layout-provider"
import "../globals.css"

export const metadata: Metadata = {
  title: "EcoDeli - Plateforme de Crowdshipping",
  description: "La plateforme éco-responsable de livraison collaborative et services à la personne",
  keywords: ["livraison", "crowdshipping", "écologique", "transport", "services"],
  authors: [{ name: "EcoDeli" }],
  openGraph: {
    title: "EcoDeli",
    description: "Plateforme de crowdshipping éco-responsable",
    type: "website",
    locale: "fr_FR",
  },
}

// Locales supportées
const locales = ['fr', 'en']

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params
}: LocaleLayoutProps) {
  // Await les params conformément à Next.js 15
  const { locale } = await params
  
  // Valider la locale
  if (!locales.includes(locale)) {
    notFound()
  }

  // Charger les messages de traduction
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <LayoutProvider 
            initialLocale={locale}
            initialTheme="system"
          >
            <AuthProvider>
              {children}
            </AuthProvider>
          </LayoutProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}