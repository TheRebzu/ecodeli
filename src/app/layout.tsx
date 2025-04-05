<<<<<<< Updated upstream
import type { Metadata } from "next";
import { Inter } from "next/font/google";
=======
>>>>>>> Stashed changes
import "./globals.css";
import { Inter } from "next/font/google";
import { Metadata } from "next";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
<<<<<<< Updated upstream
  title: "EcoDeli - Livraison écologique de produits locaux",
  description: "Plateforme de livraison écologique pour des produits locaux et durables",
=======
  title: {
    template: "%s | EcoDeli",
    default: "EcoDeli - Livraisons collaboratives et services de proximité",
  },
  description:
    "EcoDeli est une plateforme de crowdshipping qui met en relation expéditeurs et livreurs particuliers pour des livraisons plus économiques et écologiques.",
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
>>>>>>> Stashed changes
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
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
} 