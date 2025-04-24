"use client";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastActionElement = React.ReactElement;

export const useToast = () => {
  const toast = (props: ToastProps) => {
    // This is a simplified version - in a real app, you would use a proper toast library
    console.log("Toast:", props);
  };

  return {
    toast,
    dismiss: () => {},
  };
};

export type { ToastProps, ToastActionElement }; 