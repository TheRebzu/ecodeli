import type { Metadata } from "next";
import { GeistSans, GeistMono } from "geist/font";
import { ThemeProvider } from "@/components/layout/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EcoDeli - Plateforme de Crowdshipping",
    template: "%s | EcoDeli"
  },
  description: "EcoDeli connecte les particuliers ayant des besoins de livraison avec des livreurs occasionnels. Services de transport de colis, personnes, courses et bien plus.",
  keywords: ["livraison", "crowdshipping", "transport", "colis", "écologique", "économique"],
  authors: [{ name: "EcoDeli Team" }],
  creator: "EcoDeli",
  publisher: "EcoDeli",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "EcoDeli - Plateforme de Crowdshipping",
    description: "Connectez-vous avec des livreurs occasionnels pour vos besoins de transport",
    url: "/",
    siteName: "EcoDeli",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EcoDeli - Plateforme de Crowdshipping",
    description: "Connectez-vous avec des livreurs occasionnels pour vos besoins de transport",
    creator: "@ecodeli",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
