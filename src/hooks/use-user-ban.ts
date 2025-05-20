import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/trpc/react';
import { UserBanAction } from '@/types/user';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook personnalisé pour bannir ou débannir un utilisateur
 */
export function useUserBan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: UserBanAction; reason?: string }) => {
      return api.user.banOrUnban.mutate({ userId, action, reason });
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === UserBanAction.BAN ? 'Utilisateur banni' : 'Utilisateur débanni',
        description: variables.action === UserBanAction.BAN
          ? 'L’utilisateur a été banni avec succès.'
          : 'L’utilisateur a été rétabli.',
      });
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue lors du bannissement.',
        variant: 'destructive',
      });
    },
  });

  return mutation;
}
