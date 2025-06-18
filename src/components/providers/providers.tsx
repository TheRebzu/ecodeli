"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import ThemeProvider from "@/components/providers/theme-provider";
import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "@/components/providers/socket-provider";
import { Toaster } from "@/components/ui/toaster";

// Charger OneSignalProvider dynamiquement côté client uniquement
const OneSignalProvider = dynamic(
  () => import("@/components/providers/onesignal-provider").then(mod => ({ default: mod.OneSignalProvider })),
  { 
    ssr: false,
    loading: () => <></> 
  }
);

interface ProvidersProps {
  children: ReactNode;
  session?: any;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TRPCProvider>
          <SocketProvider>
            {children}
            <Toaster />
          </SocketProvider>
        </TRPCProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
