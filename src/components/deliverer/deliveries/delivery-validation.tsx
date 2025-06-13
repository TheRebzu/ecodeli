"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonWithLoading } from "@/app/[locale]/(public)/loading";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, LockKeyhole } from "lucide-react";

interface CodeVerificationProps {
  deliveryId: string;
  length?: number;
  onVerify: (code: string) => Promise<boolean>;
  onSuccess?: () => void;
  onCancel?: () => void;
  maxAttempts?: number;
  className?: string;
}

export default function CodeVerification({
  deliveryId,
  length = 6,
  onVerify,
  onSuccess,
  onCancel,
  maxAttempts = 3,
  className = "",
}: CodeVerificationProps) {
  const t = useTranslations("deliveries.verification");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Timer pour débloquer le composant après un certain temps
  useEffect(() => {
    if (timeLeft <= 0 || !isLocked) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isLocked]);

  // Vérifier le code
  const handleVerify = async () => {
    if (isLocked || isSubmitting || code.length !== length) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const success = await onVerify(code);

      if (success) {
        setIsSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= maxAttempts) {
          setIsLocked(true);
          setTimeLeft(60); // Bloquer pendant 60 secondes
          setError(t("tooManyAttempts", { timeLeft: 60 }));
        } else {
          setError(
            t("invalidCode", {
              attemptsLeft: maxAttempts - newAttempts,
            }),
          );
        }

        // Réinitialiser le code après une erreur
        setCode("");
      }
    } catch (err) {
      setError(t("verificationError"));
      console.error("Erreur lors de la vérification du code:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatter le temps restant
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
  };

  if (isSuccess) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-center text-green-600 flex items-center justify-center">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            {t("successTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">{t("successMessage")}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onCancel}>{t("backToDetails")}</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-center">
          <LockKeyhole className="mr-2 h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>

            {isLocked && timeLeft > 0 && (
              <p className="mt-2 font-medium">
                {t("timeLeft")}: {formatTimeLeft()}
              </p>
            )}
          </Alert>
        )}

        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={length}
            value={code}
            onChange={setCode}
            disabled={isLocked || isSubmitting}
            containerClassName="gap-2"
          >
            <InputOTPGroup>
              {Array.from({ length }).map((_, index) => (
                <div key={index}>
                  <InputOTPSlot index={index} />
                  {index !== length - 1 && index % 2 === 1 && (
                    <InputOTPSeparator />
                  )}
                </div>
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">{t("codeHelp")}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t("cancelButton")}
        </Button>
        <ButtonWithLoading
          onClick={handleVerify}
          disabled={isLocked || isSubmitting || code.length !== length}
          loading={isSubmitting}
        >
          {t("verifyButton")}
        </ButtonWithLoading>
      </CardFooter>
    </Card>
  );
}
