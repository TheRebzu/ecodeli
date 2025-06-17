"use client";

import { ReactNode } from "react";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import ThemeProvider from "@/components/providers/theme-provider";
import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "@/components/providers/socket-provider";
import { OneSignalProvider } from "@/components/providers/onesignal-provider";
import { Toaster } from "@/components/ui/toaster";

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
            <OneSignalProvider>
              {children}
              <Toaster />
            </OneSignalProvider>
          </SocketProvider>
        </TRPCProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
