"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const t = useTranslations("auth");

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Mutation tRPC pour la vérification d'email
  const verifyEmailMutation = api.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      setVerificationStatus({
        success: true,
        message: t("verifyEmail.success"),
      });

      // Redirection vers la page de connexion après 3 secondes
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    },
    onError: (error) => {
      setVerificationStatus({
        success: false,
        message: error.message || t("verifyEmail.error"),
      });
      setIsVerifying(false);
    },
  });

  useEffect(() => {
    // Si un token est présent, on tente de vérifier l'email
    if (token) {
      setIsVerifying(true);
      verifyEmailMutation.mutate({ token });
    }
  }, [token, verifyEmailMutation]);

  return (
    <Container className="py-10">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t("verifyEmail.title")}
            </CardTitle>
            <CardDescription className="text-center">
              {email
                ? t("verifyEmail.emailSent", { email })
                : t("verifyEmail.checkEmail")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isVerifying ? (
              <p className="text-center">{t("verifyEmail.verifying")}</p>
            ) : verificationStatus ? (
              <Alert
                variant={verificationStatus.success ? "default" : "destructive"}
              >
                <AlertDescription>
                  {verificationStatus.message}
                </AlertDescription>
                {verificationStatus.success && (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => router.push("/login")}
                  >
                    {t("login.title")}
                  </Button>
                )}
              </Alert>
            ) : (
              <div className="space-y-4">
                <p>{t("verifyEmail.instructions.checkInbox")}</p>
                <p>{t("verifyEmail.instructions.checkSpam")}</p>
                <p>{t("verifyEmail.instructions.expiration")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
