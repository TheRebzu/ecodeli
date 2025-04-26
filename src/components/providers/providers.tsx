"use client";

import { ReactNode } from "react";
import { NextAuthProvider } from "./session-provider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NextAuthProvider>
      {children}
    </NextAuthProvider>
  );
} 