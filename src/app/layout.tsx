import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "EcoDeli - Livraison écologique",
  description: "Plateforme de livraison collaborative, économique et écologique",
  applicationName: "EcoDeli",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EcoDeli"
  },
  formatDetection: {
    telephone: true,
    email: true
  }
};

export const themeColor = [
  { media: "(prefers-color-scheme: light)", color: "white" },
  { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" }
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full flex flex-col bg-background`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
} 