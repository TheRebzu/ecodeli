"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Define Role type directly since we're having import issues
type Role = "ADMIN" | "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER";

interface UseAuthOptions {
  required?: boolean;
  requiredRole?: Role;
  redirectTo?: string;
  redirectIfAuthenticated?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle redirection and authentication check
  useEffect(() => {
    // Wait until we have auth status determined
    if (status === "loading") return;

    const user = session?.user;
    setIsLoading(false);

    if (options.required && !user) {
      // Redirect to login page if auth is required and user isn't authenticated
      router.push(options.redirectTo || "/login");
      return;
    }

    // Check if user has the required role
    if (
      options.requiredRole &&
      user?.role &&
      user.role !== options.requiredRole &&
      user.role !== "ADMIN" // Always allow ADMIN to access any role-protected page
    ) {
      setError("Vous n'avez pas les permissions nécessaires pour accéder à cette page");
      router.push(options.redirectTo || "/dashboard");
      return;
    }

    // Redirect authenticated users away from auth pages if specified
    if (user && options.redirectIfAuthenticated) {
      router.push(options.redirectIfAuthenticated);
    }
  }, [
    status,
    session,
    options.required,
    options.requiredRole,
    options.redirectTo,
    options.redirectIfAuthenticated,
    router,
  ]);

  // Function to handle login
  const login = async (
    email: string,
    password: string,
    callbackUrl?: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
        return false;
      }

      if (callbackUrl) {
        router.push(callbackUrl);
      }
      
      return true;
    } catch (_err) {
      setError("Une erreur s'est produite lors de la connexion");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle social login
  const socialLogin = async (provider: string, callbackUrl?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn(provider, {
        callbackUrl: callbackUrl || "/dashboard",
      });
      
      return true;
    } catch (_err) {
      setError("Une erreur s'est produite lors de la connexion");
      return false;
    }
  };

  // Function to handle logout
  const logout = async (callbackUrl?: string) => {
    setIsLoading(true);
    
    try {
      await signOut({
        redirect: false,
      });
      
      router.push(callbackUrl || "/");
    } catch (_err) {
      setError("Une erreur s'est produite lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user: session?.user,
    isAuthenticated: !!session?.user,
    isLoading,
    error,
    login,
    socialLogin,
    logout,
  };
} 