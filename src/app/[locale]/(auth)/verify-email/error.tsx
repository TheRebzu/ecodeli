"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function VerifyEmailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Email verification error:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-red-600">Erreur du système</h2>
          <p className="text-muted-foreground">
            Nous avons rencontré un problème lors de la vérification de votre adresse e-mail.
          </p>
        </div>
        <div className="flex flex-col items-center py-6">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <p className="text-center text-red-500">
            {error.message || "Une erreur inattendue s'est produite."}
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Référence: {error.digest}
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-6">
          <Button 
            className="w-full" 
            variant="outline" 
            onClick={reset}
          >
            Réessayer
          </Button>
          <Button
            className="w-full"
            variant="link"
            asChild
          >
            <Link href="/login">
              Retour à la connexion
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 