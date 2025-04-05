<<<<<<< Updated upstream
=======
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { toast } from "sonner";

/**
 * Custom hook for authentication
 */
export function useAuth() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const signIn = async (email: string, password: string, callbackUrl?: string) => { 
    setIsLoading(true);
    
    try {
      const result = await nextAuthSignIn('credentials', { 
        email, 
        password,
        redirect: false,
      });
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push('/client');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await nextAuthSignIn("google", { redirect: false });
      
      if (result?.error) {
        toast.error(result.error);
        return false;
      }
      
      return true;
    } catch (error) {
      toast.error("Une erreur est survenue lors de la connexion avec Google");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setIsLoading(true);
    try {
      const result = await nextAuthSignIn("facebook", { redirect: false });
      
      if (result?.error) {
        toast.error(result.error);
        return false;
      }
      
      return true;
    } catch (error) {
      toast.error("Une erreur est survenue lors de la connexion avec Facebook");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Une erreur est survenue lors de l'inscription");
        return false;
      }

      toast.success("Inscription réussie ! Veuillez vérifier votre email.");
      return true;
    } catch (error) {
      toast.error("Une erreur est survenue lors de l'inscription");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (callbackUrl?: string) => {
    setIsLoading(true);
    
    try {
      await nextAuthSignOut({ 
        redirect: Boolean(callbackUrl), 
        callbackUrl: callbackUrl || '/' 
      });
      
      if (!callbackUrl) {
        router.push('/');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Une erreur est survenue");
        return false;
      }

      toast.success("Un email de réinitialisation a été envoyé");
      return true;
    } catch (error) {
      toast.error("Une erreur est survenue");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Une erreur est survenue");
        return false;
      }

      toast.success("Votre mot de passe a été mis à jour");
      return true;
    } catch (error) {
      toast.error("Une erreur est survenue");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Une erreur est survenue");
        return false;
      }

      toast.success("Votre mot de passe a été mis à jour");
      return true;
    } catch (error) {
      toast.error("Une erreur est survenue");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const setupTwoFactor = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/mfa/setup", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Une erreur est survenue");
        return { success: false };
      }

      return { 
        success: true,
        qrCodeUrl: data.qrCodeUrl,
        secret: data.secret 
      };
    } catch (error) {
      toast.error("Une erreur est survenue");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Code invalide");
        return false;
      }

      await update();
      toast.success("L'authentification à deux facteurs a été activée");
      return true;
    } catch (error) {
      toast.error("Une erreur est survenue");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading' || isLoading,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signUp,
    signOut,
    forgotPassword,
    resetPassword,
    updatePassword,
    setupTwoFactor,
    verifyTwoFactor,
  };
} 
>>>>>>> Stashed changes
