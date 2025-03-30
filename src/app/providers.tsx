"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Using this pattern to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Rafraîchir la session toutes les 5 minutes
      refetchOnWindowFocus={true} // Rafraîchir quand la fenêtre regagne le focus
      refetchWhenOffline={false} // Ne pas rafraîchir quand hors ligne
    >
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light" 
        enableSystem={false}
        forcedTheme="light"
        // Skip client-side theme application during SSR
        storageKey="ecodeli-theme"
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}