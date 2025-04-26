import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { api } from "~/lib/api";
import {
  clientRegisterSchema,
  delivererRegisterSchema,
  merchantRegisterSchema,
  providerRegisterSchema,
  type loginSchema,
  type verifyEmailSchema,
  type forgotPasswordSchema,
  type resetPasswordSchema,
} from "~/schemas/auth/user.schema";
import { z } from "zod";

type LoginInput = z.infer<typeof loginSchema>;
type ClientRegisterInput = z.infer<typeof clientRegisterSchema>;
type DelivererRegisterInput = z.infer<typeof delivererRegisterSchema>;
type MerchantRegisterInput = z.infer<typeof merchantRegisterSchema>;
type ProviderRegisterInput = z.infer<typeof providerRegisterSchema>;
type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function useAuth() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clients tRPC pour les mutations d'authentification
  const registerClientMutation = api.auth.registerClient.useMutation();
  const registerDelivererMutation = api.auth.registerDeliverer.useMutation();
  const registerMerchantMutation = api.auth.registerMerchant.useMutation();
  const registerProviderMutation = api.auth.registerProvider.useMutation();
  const verifyEmailMutation = api.auth.verifyEmail.useMutation();
  const forgotPasswordMutation = api.auth.forgotPassword.useMutation();
  const resetPasswordMutation = api.auth.resetPassword.useMutation();

  // Fonction de connexion
  const login = async (credentials: LoginInput, callbackUrl?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await signIn("credentials", {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
      });

      if (response?.error) {
        setError(response.error);
        return false;
      }

      if (response?.ok) {
        // Redirection après connexion réussie
        if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          router.push("/dashboard");
        }
        return true;
      }

      return false;
    } catch (err) {
      setError("Une erreur s'est produite lors de la connexion");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = async (callbackUrl?: string) => {
    setIsLoading(true);
    
    try {
      await signOut({ redirect: false });
      
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push("/");
      }
      
      return true;
    } catch (err) {
      setError("Une erreur s'est produite lors de la déconnexion");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction d'inscription client
  const registerClient = async (data: ClientRegisterInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerClientMutation.mutateAsync(data);
      return true;
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de l'inscription");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction d'inscription livreur
  const registerDeliverer = async (data: DelivererRegisterInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerDelivererMutation.mutateAsync(data);
      return true;
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de l'inscription");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction d'inscription commerçant
  const registerMerchant = async (data: MerchantRegisterInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerMerchantMutation.mutateAsync(data);
      return true;
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de l'inscription");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction d'inscription prestataire
  const registerProvider = async (data: ProviderRegisterInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerProviderMutation.mutateAsync(data);
      return true;
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de l'inscription");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de vérification d'email
  const verifyEmail = async (data: VerifyEmailInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await verifyEmailMutation.mutateAsync(data);
      return true;
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de la vérification de l'email");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de demande de réinitialisation de mot de passe
  const forgotPassword = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await forgotPasswordMutation.mutateAsync(data);
      return true;
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de la demande de réinitialisation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de réinitialisation de mot de passe
  const resetPassword = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await resetPasswordMutation.mutateAsync(data);
      return true;
    } catch (err: any) {
      setError(err?.message || "Une erreur s'est produite lors de la réinitialisation du mot de passe");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user: session?.user,
    isAuthenticated: !!session?.user,
    isLoading: status === "loading" || isLoading,
    error,
    login,
    logout,
    registerClient,
    registerDeliverer,
    registerMerchant,
    registerProvider,
    verifyEmail,
    forgotPassword,
    resetPassword,
  };
}