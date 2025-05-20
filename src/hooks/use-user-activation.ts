import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

/**
 * Hook personnalisé pour gérer l'activation/désactivation des comptes utilisateur
 */
export function useUserActivation() {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const utils = api.useUtils();
  const t = useTranslations("admin.users.activationStatus");
  
  const toggleActivationMutation = api.user.toggleActivation.useMutation({
    onMutate: () => {
      setIsPending(true);
    },
    onSuccess: async (_, { isActive }) => {
      // Invalider les requêtes pour recharger les données
      await utils.adminUser.getUsers.invalidate();
      
      toast({
        title: isActive ? t("successActivate") : t("successDeactivate"),
        description: isActive 
          ? t("successActivateDescription") 
          : t("successDeactivateDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsPending(false);
    },
  });

  /**
   * Fonction pour changer l'état d'activation d'un utilisateur
   */
  const toggleUserActivation = (userId: string, isActive: boolean) => {
    toggleActivationMutation.mutate({ userId, isActive });
  };

  return {
    toggleUserActivation,
    isPending,
  };
}
