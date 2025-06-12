import { createTRPCReact } from '@trpc/react-query';
import { TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@/server/api/root';
import { api } from '@/trpc/react';

export const apiClient = createTRPCReact<AppRouter>();

export function handleApiError(error: unknown): string {
  if (error instanceof TRPCClientError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Une erreur inconnue est survenue';
}

interface RegisterUserData {
  email: string;
  password: string;
  name: string;
  role: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER';
  phone?: string;
  companyName?: string;
  siret?: string;
  address?: string;
}

export function useAuth() {
  const registerMutation = api.auth.register.useMutation();

  const registerUser = async (userData: RegisterUserData) => {
    try {
      const result = await registerMutation.mutateAsync(userData);
      return result;
    } catch (error) {
      console.error("Erreur d'inscription via tRPC:", error);
      throw error;
    }
  };

  return {
    registerUser,
    isRegistering: registerMutation.isPending,
  };
}
