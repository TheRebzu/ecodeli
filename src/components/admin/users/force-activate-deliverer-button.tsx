"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check } from "lucide-react";

interface ForceActivateDelivererButtonProps {
  userId: string;
}

export default function ForceActivateDelivererButton({
  userId,
}: ForceActivateDelivererButtonProps) {
  const { toast } = useToast();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const forceActivateMutation =
    api.verification.adminForceActivateDeliverer.useMutation({
      onSuccess: () => {
        toast({
          title: "Compte activé",
          description: "Le compte du livreur a été activé avec succès",
          variant: "success",
        });
        // Rafraîchir la page
        window.location.reload();
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de l'activation du compte: ${error.message}`,
          variant: "destructive",
        });
      },
    });

  const handleActivate = () => {
    forceActivateMutation.mutate({ userId });
    setIsConfirmDialogOpen(false);
  };

  return (
    <>
      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogTrigger asChild>
          <Button variant="success" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Forcer l'activation du compte livreur
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'activation forcée</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va forcer l'activation du compte livreur,
              indépendamment de la vérification des documents. Le livreur aura
              immédiatement accès à toutes les fonctionnalités.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={forceActivateMutation.isPending}
            >
              {forceActivateMutation.isPending
                ? "Activation en cours..."
                : "Confirmer l'activation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
