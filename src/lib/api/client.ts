import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

export const api = createTRPCReact<AppRouter>();
import { TRPCClientError } from '@trpc/client';\n\nexport function handleApiError(error: unknown): string {\n  if (error instanceof TRPCClientError) {\n    return error.message;\n  }\n  \n  if (error instanceof Error) {\n    return error.message;\n  }\n  \n  return 'Une erreur inconnue est survenue';\n};
import { api } from '@/trpc/react';

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
