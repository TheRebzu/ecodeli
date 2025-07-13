"use client";

import {
  useSession,
  signIn as nextSignIn,
  signOut as nextSignOut,
} from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const signIn = async (email: string, password: string) => {
    try {
      const result = await nextSignIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        // Redirection après connexion réussie
        router.push("/dashboard");
        return { success: true };
      }

      throw new Error("Erreur de connexion");
    } catch (err) {
      throw err;
    }
  };

  const signUp = async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    try {
      // Créer le compte via notre API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();

        // Connecter l'utilisateur automatiquement après inscription
        await signIn(userData.email, userData.password);

        return { success: true, data };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur d'inscription");
      }
    } catch (err) {
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await nextSignOut({ redirect: false });
      router.push("/login");
      return { success: true };
    } catch (err) {
      throw err;
    }
  };

  return {
    session,
    user: session?.user,
    isAuthenticated: !!session,
    loading: status === "loading",
    isLoading: status === "loading",
    error: null, // NextAuth gère les erreurs différemment
    signIn,
    signUp,
    signOut,
    refetch: update,
    role: session?.user?.role,
    isActive: session?.user?.isActive ?? false,
    validationStatus: session?.user?.validationStatus,
    emailVerified: !!session?.user?.emailVerified,
  };
}
