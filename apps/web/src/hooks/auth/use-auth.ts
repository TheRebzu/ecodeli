import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginSchemaType } from '@/schemas/auth/login.schema';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import type { UserRole } from '@prisma/client';
import type {
  ClientRegisterSchemaType,
  DelivererRegisterSchemaType,
  MerchantRegisterSchemaType,
  ProviderRegisterSchemaType,
} from '@/schemas';

export function useAuth() {
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Mutations tRPC pour l'authentification
  const registerMutation = api.auth.register.useMutation(); // Use the correct register procedure
  const verifyEmail = api.auth.verifyEmail.useMutation();
  const forgotPassword = api.auth.forgotPassword.useMutation();
  const resetPassword = api.auth.resetPassword.useMutation();
  const resendVerificationEmail = api.auth.resendVerificationEmail.useMutation();
  const getSession = api.auth.getSession.useQuery(undefined, {
    enabled: status === 'authenticated',
    refetchOnWindowFocus: false,
  });

  const login = async (data: LoginSchemaType, callbackUrl = '/') => {
    try {
      setIsLoading(true);
      setError(null);

      // Clear any previous sessions if there was a JWT error
      if (status === 'unauthenticated') {
        // Force clear any potential corrupted cookies
        await signOut({ redirect: false });
      }

      const response = await signIn('credentials', {
        email: data.email,
        password: data.password,
        totp: data.totp,
        redirect: false,
      });

      if (response?.error) {
        // Check for JWT decryption errors
        if (
          response.error.includes('decryption operation failed') ||
          response.error.includes('JWT_SESSION_ERROR')
        ) {
          // Clear cookies and retry login once
          await signOut({ redirect: false });
          const retryResponse = await signIn('credentials', {
            email: data.email,
            password: data.password,
            totp: data.totp,
            redirect: false,
          });

          if (retryResponse?.error) {
            setError(retryResponse.error);
            setIsLoading(false);
            return false;
          }
        } else {
          setError(response.error);
          setIsLoading(false);
          return false;
        }
      }

      // Rediriger vers la bonne page en fonction du rôle
      const dashboard = await getDashboardPath();
      router.push(dashboard || callbackUrl);
      router.refresh();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setError('Une erreur est survenue lors de la connexion');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut({ redirect: false });
      router.push('/');
      router.refresh();
    } catch (_) {
      setError('Une erreur est survenue lors de la déconnexion');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    await update();
  };

  // Récupérer le chemin du dashboard en fonction du rôle
  const getDashboardPath = async () => {
    try {
      if (!session?.user) return null;

      const role = session.user.role as UserRole;
      switch (role) {
        case 'CLIENT':
          return '/client';
        case 'DELIVERER':
          return '/deliverer';
        case 'MERCHANT':
          return '/merchant';
        case 'PROVIDER':
          return '/provider';
        case 'ADMIN':
          return '/admin';
        default:
          return '/';
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du dashboard', error);
      return null;
    }
  };

  // S'inscrire en fonction du rôle
  const register = async (
    data:
      | ClientRegisterSchemaType
      | DelivererRegisterSchemaType
      | MerchantRegisterSchemaType
      | ProviderRegisterSchemaType,
    role: UserRole
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the single register procedure with the role included in the data
      const result = await registerMutation.mutateAsync({
        ...data,
        role,
      });

      toast({
        title: 'Inscription réussie',
        description: 'Veuillez vérifier votre email pour activer votre compte.',
      });

      router.push('/login');
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Une erreur est survenue lors de l'inscription";
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier un email avec le token
  const verifyUserEmail = async (token: string) => {
    try {
      setIsLoading(true);
      const result = await verifyEmail.mutateAsync({ token });
      toast({
        title: 'Email vérifié',
        description: 'Votre compte a été activé. Vous pouvez maintenant vous connecter.',
      });
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de la vérification de l'email";
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage || 'Lien de vérification invalide ou expiré',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Demander un reset du mot de passe
  const requestPasswordReset = async (email: string) => {
    try {
      setIsLoading(true);
      const result = await forgotPassword.mutateAsync({ email });
      toast({
        title: 'Email envoyé',
        description:
          'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      });
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de l'envoi de l'email";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Réinitialiser le mot de passe avec le token
  const resetUserPassword = async (token: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await resetPassword.mutateAsync({
        token,
        password,
        confirmPassword: password,
      });
      toast({
        title: 'Mot de passe réinitialisé',
        description: 'Votre mot de passe a été réinitialisé avec succès.',
      });
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erreur lors de la réinitialisation du mot de passe';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage || 'Lien de réinitialisation invalide ou expiré',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Renvoyer l'email de vérification
  const resendEmailVerification = async (email: string) => {
    try {
      setIsLoading(true);
      const result = await resendVerificationEmail.mutateAsync({ email });
      toast({
        title: 'Email envoyé',
        description: 'Un nouveau lien de vérification a été envoyé à votre adresse email.',
      });
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de l'envoi de l'email";
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Étendre les données de session avec les données complètes de l'utilisateur
  const extendedUser = getSession.data || session?.user;
  const role = extendedUser?.role as UserRole | undefined;

  return {
    session,
    user: extendedUser,
    role,
    status,
    isLoading: isLoading || getSession.isLoading,
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    error,
    login,
    logout,
    register,
    verifyEmail: verifyUserEmail,
    requestPasswordReset,
    resetPassword: resetUserPassword,
    refreshSession,
    resendEmailVerification,
  };
}
