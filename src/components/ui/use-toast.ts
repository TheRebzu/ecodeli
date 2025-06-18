// Adapted from shadcn/ui: https://ui.shadcn.com/docs/components/toast
"use client";

import React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as ShadcnToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastProps} from "@/components/ui/toast";

export {
  ShadcnToastProvider as ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose};

// Utilisation d'un pattern singleton safe pour Next.js
interface ToastContextType {
  toast: (props: ToastProps) => void;
  toasts: (ToastProps & { id: string })[];
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined,
);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Singleton toast pour usage global (seulement côté client)
let globalToast: ((props: ToastProps) => string) | null = null;

export function initializeToast(toastFn: (props: ToastProps) => string) {
  if (typeof window !== 'undefined') {
    globalToast = toastFn;
  }
}

// Export de la fonction toast pour compatibilité
export function toast(props: ToastProps) {
  if (typeof window !== 'undefined' && globalToast) {
    return globalToast(props);
  }
  console.warn(
    "Toast not initialized or running on server. Please use useToast hook in a React component.",
  );
  return "";
}
