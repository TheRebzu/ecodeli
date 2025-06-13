import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import type { ToggleUserActivationInput } from "@/schemas/user/user-activation.schema";

/**
 * Hook pour gérer l'activation/désactivation des utilisateurs
 * Utilisé dans l'interface d'administration
 */
export function useUserActivation() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Mutation pour activer/désactiver un utilisateur
  const toggleUserActivationMutation =
    api.adminUser.toggleUserActivation.useMutation({
      onMutate: () => {
        setIsLoading(true);
      },
      onSuccess: (data, variables) => {
        const action = variables.isActive ? "activé" : "désactivé";
        toast({
          title: "Succès",
          description: `Utilisateur ${action} avec succès`,
          variant: "default",
        });
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de la modification de l'activation : ${error.message}`,
          variant: "destructive",
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    });

  /**
   * Active ou désactive un utilisateur
   * @param userId ID de l'utilisateur
   * @param isActive true pour activer, false pour désactiver
   */
  const toggleUserActivation = (userId: string, isActive: boolean) => {
    const input: ToggleUserActivationInput = {
      userId,
      isActive,
    };

    toggleUserActivationMutation.mutate(input);
  };

  return {
    toggleUserActivation,
    isPending: toggleUserActivationMutation.isPending || isLoading,
    isError: toggleUserActivationMutation.isError,
    error: toggleUserActivationMutation.error,
    isSuccess: toggleUserActivationMutation.isSuccess,
  };
}
