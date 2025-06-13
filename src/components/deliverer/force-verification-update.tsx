"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export default function ForceVerificationUpdate() {
  const { toast } = useToast();
  const t = useTranslations("documents");
  const [isUpdating, setIsUpdating] = useState(false);

  // Mutation pour forcer la mise à jour du statut de vérification
  const forceUpdateMutation =
    api.verification.forceUpdateDelivererVerification.useMutation({
      onSuccess: (data) => {
        setIsUpdating(false);
        toast({
          title: t("verification.updateSuccess.title"),
          description: data.message,
          variant: "success",
        });

        // Rediriger vers le dashboard après 2 secondes
        setTimeout(() => {
          window.location.href = "/fr/deliverer";
        }, 2000);
      },
      onError: (error) => {
        setIsUpdating(false);
        toast({
          title: t("verification.updateError.title"),
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleForceUpdate = () => {
    setIsUpdating(true);
    forceUpdateMutation.mutate();
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md my-6">
      <h3 className="text-lg font-semibold mb-2">
        {t("verification.forceUpdate.title")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("verification.forceUpdate.description")}
      </p>
      <Button
        onClick={handleForceUpdate}
        variant="secondary"
        disabled={isUpdating}
      >
        {isUpdating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("verification.forceUpdate.updating")}
          </>
        ) : (
          t("verification.forceUpdate.button")
        )}
      </Button>
    </div>
  );
}
