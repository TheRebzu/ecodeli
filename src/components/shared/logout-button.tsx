"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

interface LogoutButtonProps extends React.ComponentProps<"button">,
  VariantProps<typeof buttonVariants> {
  redirectTo?: string;
  showIcon?: boolean;
  asChild?: boolean;
}

export function LogoutButton({
  className,
  variant = "default",
  size = "default",
  redirectTo = "/login",
  showIcon = true,
  children,
  ...props
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut({ redirect: false });
      router.push(redirectTo);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        showIcon && <LogOut className="mr-2 h-4 w-4" />
      )}
      {children || "Déconnexion"}
    </Button>
  );
} 