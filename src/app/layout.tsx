import "./globals.css";
import { Inter } from "next/font/google";
import { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import Script from "next/script";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff"
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ecodeli.com"),
  title: {
    template: '%s | Ecodeli',
    default: 'Ecodeli - Livraison écologique collaborative',
  },
  description: 'Plateforme de livraison écologique collaborative',
  openGraph: {
    siteName: "Ecodeli",
    type: "website",
    locale: "fr_FR"
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: "index, follow"
  },
  alternates: {
    canonical: "https://ecodeli.com"
  },
  applicationName: "Ecodeli",
  appleWebApp: {
    title: "Ecodeli",
    statusBarStyle: "default",
    capable: true
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon"
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png"
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png"
      }
    ],
    shortcut: [
      {
        url: "/favicon.ico",
        type: "image/x-icon"
      }
    ],
    apple: [
      {
        url: "/apple-icon-57x57.png",
        sizes: "57x57",
        type: "image/png"
      },
      {
        url: "/apple-icon-60x60.png",
        sizes: "60x60",
        type: "image/png"
      }
    ]
  },
  keywords: [
    "livraison",
    "crowdshipping",
    "collaborative",
    "colis",
    "eco-responsable",
    "services de proximité",
  ],
  authors: [{ name: "EcoDeli Team" }],
  creator: "EcoDeli",
  publisher: "EcoDeli",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen`}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            {process.env.NODE_ENV === "production" && (
              <>
                <Script
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
                  strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                  {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                  `}
                </Script>
              </>
            )}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}