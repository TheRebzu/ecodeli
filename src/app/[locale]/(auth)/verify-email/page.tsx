"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const t = useTranslations();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Token de vérification manquant");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: "GET",
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage("Votre compte a été activé avec succès !");
        } else {
          setStatus("error");
          setMessage(data.error || "Erreur lors de la vérification");
        }
      } catch (error) {
        console.error("Erreur vérification email:", error);
        setStatus("error");
        setMessage("Erreur de connexion au serveur");
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-full bg-green-600 mx-auto mb-4 flex items-center justify-center">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EcoDeli</h1>
          <p className="text-gray-600 mt-2">Vérification de votre email</p>
        </div>

        {/* Carte de vérification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
              {status === "error" && <XCircle className="h-5 w-5 text-red-600" />}
              Vérification de votre compte
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Vérification en cours..."}
              {status === "success" && "Votre compte a été activé"}
              {status === "error" && "Erreur lors de la vérification"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "loading" && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
                <p className="text-gray-600">Vérification de votre token...</p>
              </div>
            )}

            {status === "success" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p>✅ Votre compte a été activé avec succès !</p>
                    <p className="text-sm text-gray-600">
                      Vous pouvez maintenant vous connecter à votre compte EcoDeli.
                    </p>
                    <Button asChild className="w-full">
                      <Link href="/fr/login">
                        Se connecter
                      </Link>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {status === "error" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p>❌ {message}</p>
                    <p className="text-sm">
                      Si vous pensez qu'il s'agit d'une erreur, contactez notre support.
                    </p>
                    <div className="flex gap-2">
                      <Button asChild variant="outline">
                        <Link href="/fr/login">
                          Retour à la connexion
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link href="/fr/register">
                          Créer un compte
                        </Link>
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Informations supplémentaires */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Besoin d'aide ? Contactez notre support à{" "}
            <a href="mailto:support@ecodeli.me" className="text-green-600 hover:underline">
              support@ecodeli.me
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
