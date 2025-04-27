// Adapted from shadcn/ui: https://ui.shadcn.com/docs/components/toast
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast as useToastOriginal } from "@/components/ui/toast"

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose }
export { useToastOriginal as useToast } 