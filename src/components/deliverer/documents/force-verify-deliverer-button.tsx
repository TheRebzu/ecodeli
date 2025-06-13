"use client";

import { useState, useEffect } from "react";
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
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ForceVerifyDelivererButton() {
  const { toast } = useToast();
  const { data: session, update } = useSession();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [canVerify, setCanVerify] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);

  // Utiliser la requête pour vérifier l'état des documents de l'utilisateur
  // Désactiver complètement les requêtes automatiques pour éviter les spams
  const { data: verificationStatus } =
    api.verification.getUserVerificationStatus.useQuery(undefined, {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: Infinity,
      cacheTime: Infinity,
    });

  // Mettre à jour l'état du bouton basé sur les données reçues, une seule fois
  useEffect(() => {
    if (verificationStatus) {
      const allDocumentsPresent =
        verificationStatus.missingDocuments.length === 0;
      setCanVerify(allDocumentsPresent && !verificationStatus.isVerified);
      setMissingDocuments(verificationStatus.missingDocuments);
    }
  }, [verificationStatus]);

  // Mutation pour forcer la vérification
  const forceVerifyMutation =
    api.verification.manualCheckAndUpdateVerification.useMutation({
      onSuccess: async (data) => {
        if (data.success) {
          // Mettre à jour la session explicitement
          await update({ isVerified: true });

          toast({
            variant: "success",
            title: "Vérification en cours",
            children: <p>Votre compte est en cours de vérification</p>,
          });

          // Rediriger après un délai pour laisser le temps à la session de se mettre à jour
          setTimeout(() => {
            const locale = session?.user?.locale || "fr";
            // Forcer un rafraîchissement complet pour s'assurer que les cookies sont mis à jour
            window.location.href = `/${locale}/deliverer`;
          }, 2500);
        } else {
          toast({
            title: "Information",
            variant: "default",
            children: (
              <p>Certains documents sont encore en attente de vérification</p>
            ),
          });

          if (data.missingDocuments && data.missingDocuments.length > 0) {
            setMissingDocuments(data.missingDocuments);
            setCanVerify(false);
          }
        }
        setIsChecking(false);
      },
      onError: (error) => {
        console.error("Erreur lors de la vérification:", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          children: <p>Une erreur est survenue lors de la vérification</p>,
        });
        setIsChecking(false);
      },
    });

  const handleVerify = () => {
    if (!canVerify) {
      toast({
        variant: "destructive",
        title: "Documents incomplets",
        children: (
          <p>
            Tous vos documents doivent être approuvés avant de pouvoir vérifier
            votre compte
          </p>
        ),
      });
      setIsConfirmDialogOpen(false);
      return;
    }

    setIsChecking(true);
    console.log("Lancement de la vérification manuelle...");
    forceVerifyMutation.mutate();
    setIsConfirmDialogOpen(false);
  };

  // Afficher un message d'information si le statut est encore en chargement
  if (canVerify === null) {
    return (
      <Button
        variant="outline"
        className="flex items-center gap-2"
        disabled={true}
      >
        <RefreshCw className="h-4 w-4 animate-spin" />
        Chargement...
      </Button>
    );
  }

  // Afficher un message si certains documents sont manquants
  if (canVerify === false && missingDocuments.length > 0) {
    return (
      <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              Documents manquants ou non vérifiés
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>
                Vous devez télécharger et faire vérifier tous les documents
                requis avant de pouvoir activer votre compte.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            disabled={!canVerify || isChecking || forceVerifyMutation.isPending}
          >
            {isChecking || forceVerifyMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isChecking || forceVerifyMutation.isPending
              ? "Vérification en cours..."
              : "Forcer la vérification de mon compte"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmer la vérification manuelle
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va tenter de vérifier manuellement votre compte si
              tous vos documents ont été approuvés. Si certains documents sont
              encore en attente ou rejetés, cette action n'aura pas d'effet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerify}
              disabled={
                isChecking || forceVerifyMutation.isPending || !canVerify
              }
            >
              {isChecking || forceVerifyMutation.isPending
                ? "Vérification en cours..."
                : "Confirmer la vérification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
