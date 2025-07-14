"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import Link from "next/link";

import { useTranslations } from "next-intl";

function VerifyEmailContent() {
  const t = useTranslations();
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending",
  );
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token manquant");
      setIsLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, email }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email vérifié avec succès");
        } else {
          setStatus("error");
          setMessage(data.error || "Erreur lors de la vérification");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Erreur de connexion");
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, email]);

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case "error":
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "success":
        return t("auth.verifyEmail.success") || "Email vérifié !";
      case "error":
        return t("auth.verifyEmail.error") || "Erreur de vérification";
      default:
        return t("auth.verifyEmail.verifying") || "Vérification en cours...";
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case "success":
        return (
          t("auth.verifyEmail.successMessage") ||
          "Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter."
        );
      case "error":
        return message || (t("auth.verifyEmail.errorMessage") || "Une erreur est survenue.");
      default:
        return (
          t("auth.verifyEmail.verifyingMessage") ||
          "Nous vérifions votre email, veuillez patienter..."
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{getStatusIcon()}</div>
          <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
          <CardDescription>{getStatusDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {email && (
            <Alert className="mb-4">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                {t("auth.verifyEmail.emailAddress") || "Adresse email"}: {email}
              </AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/login">
                  {t("auth.verifyEmail.goToLogin") || "Aller à la connexion"}
                </Link>
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  {t("auth.verifyEmail.troubleshoot") ||
                    "Problème avec la vérification ?"}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="flex-1">
                    <Link href="/login">
                      {t("auth.verifyEmail.backToLogin") ||
                        "Retour à la connexion"}
                    </Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/contact">
                      {t("common.support") || "Support"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t("auth.verifyEmail.pleaseWait") ||
                  "Veuillez patienter pendant que nous vérifions votre email..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
