"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpcClient } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

enum VerificationStatus {
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useParams();
  const [status, setStatus] = useState<VerificationStatus>(
    VerificationStatus.LOADING,
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        if (!token) {
          throw new Error("Token manquant");
        }
        // Call the API to verify the email with the token
        await trpcClient.auth.verifyEmail.mutate({ token });
        setStatus(VerificationStatus.SUCCESS);
        toast.success("Adresse e-mail vérifiée avec succès");
      } catch (error) {
        setStatus(VerificationStatus.ERROR);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la vérification de l'adresse e-mail",
        );
        toast.error("Erreur de vérification d'e-mail");
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus(VerificationStatus.ERROR);
      setErrorMessage("Token manquant");
    }
  }, [token]);

  const renderContent = () => {
    switch (status) {
      case VerificationStatus.LOADING:
        return (
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Vérification de l&apos;adresse e-mail
              </h2>
              <p className="text-muted-foreground">
                Veuillez patienter pendant que nous vérifions votre adresse
                e-mail...
              </p>
            </div>
            <div className="flex justify-center py-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          </div>
        );

      case VerificationStatus.SUCCESS:
        return (
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-green-600">
                Vérification réussie
              </h2>
              <p className="text-muted-foreground">
                Votre adresse e-mail a été vérifiée avec succès.
              </p>
            </div>
            <div className="flex justify-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div className="mt-6">
              <Button className="w-full" onClick={() => router.push("/login")}>
                Se connecter
              </Button>
            </div>
          </div>
        );

      case VerificationStatus.ERROR:
        return (
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-red-600">
                Erreur de vérification
              </h2>
              <p className="text-muted-foreground">
                Nous n&apos;avons pas pu vérifier votre adresse e-mail.
              </p>
            </div>
            <div className="flex flex-col items-center py-6">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-center text-red-500">{errorMessage}</p>
            </div>
            <div className="flex flex-col gap-2 mt-6">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push("/login")}
              >
                Retour à la connexion
              </Button>
              <Button
                className="w-full"
                onClick={() => router.push("/register")}
              >
                S&apos;inscrire
              </Button>
            </div>
          </div>
        );
    }
  };

  return <div className="mx-auto w-full max-w-md">{renderContent()}</div>;
}
