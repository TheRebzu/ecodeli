"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("public.error");

  useEffect(() => {
    // Surveillance des erreurs
  }, [error]);

  const errorMessage =
    getAuthErrorMessage(error.message) ||
    t("unexpectedError", "Une erreur inattendue s'est produite.");

  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-10">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {t("title", "Oups, quelque chose s'est mal passé")}
          </h2>
          <p className="text-muted-foreground">{errorMessage}</p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2">
              {t("errorId") || "ID Erreur"}: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => reset()} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t("retry") || "Réessayer"}
          </Button>
          <Button asChild>
            <Link href="/fr/home">{t("backToHome", "Retour à l'accueil")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
