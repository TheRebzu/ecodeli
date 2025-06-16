import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import type { UserBanInput } from "@/schemas/user/user-ban.schema";
import { UserBanAction } from "@/types/users/verification";

/**
 * Hook pour gérer le bannissement/débannissement des utilisateurs
 * Utilisé dans l'interface d'administration
 */
export function useUserBan() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Mutation pour bannir/débannir un utilisateur
  const userBanMutation = api.adminUser.banUser.useMutation({
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: (data, variables) => {
      const action =
        variables.action === UserBanAction.BAN ? "banni" : "débanni";
      toast({
        title: "Succès",
        description: `Utilisateur ${action} avec succès`,
        variant: "default"});
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors du bannissement : ${error.message}`,
        variant: "destructive"});
    },
    onSettled: () => {
      setIsLoading(false);
    }});

  /**
   * Bannit ou débannit un utilisateur
   * @param input Données de bannissement (userId, action, reason)
   */
  const mutate = (input: UserBanInput) => {
    userBanMutation.mutate(input);
  };

  /**
   * Bannit un utilisateur avec une raison
   * @param userId ID de l'utilisateur
   * @param reason Raison du bannissement
   */
  const banUser = (userId: string, reason: string) => {
    mutate({ userId,
      action: UserBanAction.BAN,
      reason });
  };

  /**
   * Débannit un utilisateur
   * @param userId ID de l'utilisateur
   */
  const unbanUser = (userId: string) => {
    mutate({ userId,
      action: UserBanAction.UNBAN });
  };

  return {
    mutate,
    banUser,
    unbanUser,
    isPending: userBanMutation.isPending || isLoading,
    isError: userBanMutation.isError,
    error: userBanMutation.error,
    isSuccess: userBanMutation.isSuccess};
}
