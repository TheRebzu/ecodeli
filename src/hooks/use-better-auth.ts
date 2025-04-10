"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

export const useBetterAuth = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Vérifier si l'utilisateur est connecté
  const isAuthenticated = status === "authenticated";
  
  // Rediriger vers le dashboard approprié selon le rôle
  const goToDashboard = useCallback(() => {
    if (!session?.user?.role) {
      router.push("/");
      return;
    }
    
    const dashboards = {
      "ADMIN": "/admin/dashboard",
      "CLIENT": "/client/dashboard",
      "COURIER": "/courier/dashboard", 
      "MERCHANT": "/merchant/dashboard",
      "PROVIDER": "/provider/dashboard"
    };
    
    const path = dashboards[session.user.role as string] || "/dashboard";
    router.push(path);
  }, [session, router]);
  
  // Connexion
  const login = useCallback(async ({ 
    email, 
    password, 
    rememberMe = false,
    redirect = true,
    callbackUrl
  }: {
    email: string;
    password: string;
    rememberMe?: boolean;
    redirect?: boolean;
    callbackUrl?: string;
  }) => {
    setIsLoading(true);
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        rememberMe,
        redirect: false
      });
      
      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return { success: false, error: result.error };
      }
      
      toast.success("Connexion réussie!");
      
      if (redirect) {
        if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          goToDashboard();
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error("Erreur de connexion:", error);
      toast.error("Une erreur est survenue");
      return { success: false, error: "Une erreur est survenue" };
    } finally {
      setIsLoading(false);
    }
  }, [router, goToDashboard]);
  
  // Inscription
  const register = useCallback(async (data: any, role: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/auth/register/${role.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.message || "Erreur d'inscription");
        setIsLoading(false);
        return { success: false, error: result.message };
      }
      
      toast.success("Inscription réussie!");
      router.push(`/login?registered=true&role=${role.toLowerCase()}`);
      
      return { success: true };
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      toast.error("Une erreur est survenue");
      return { success: false, error: "Une erreur est survenue" };
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  // Déconnexion
  const logout = useCallback(async (callbackUrl = "/") => {
    setIsLoading(true);
    
    try {
      await signOut({ redirect: false });
      toast.success("Déconnexion réussie");
      router.push(callbackUrl);
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  // Authentification avec Google
  const loginWithGoogle = useCallback(async (callbackUrl?: string) => {
    setIsLoading(true);
    
    try {
      await signIn("google", { callbackUrl });
      return true;
    } catch (error) {
      console.error("Erreur d'authentification Google:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    user: session?.user,
    isAuthenticated,
    isLoading,
    status,
    login,
    register,
    logout,
    goToDashboard,
    loginWithGoogle
  };
};

export default useBetterAuth;
