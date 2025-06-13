// Adapted from shadcn/ui: https://ui.shadcn.com/docs/components/toast
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToast as useToastOriginal,
  type ToastProps,
} from "@/components/ui/toast";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
};
export { useToastOriginal as useToast };

// Singleton toast pour usage global
let globalToast: ((props: ToastProps) => string) | null = null;

export function initializeToast(toastFn: (props: ToastProps) => string) {
  globalToast = toastFn;
}

// Export de la fonction toast pour compatibilité
export function toast(props: ToastProps) {
  if (globalToast) {
    return globalToast(props);
  }
  console.warn(
    "Toast not initialized. Please use useToast hook in a React component.",
  );
  return "";
}
