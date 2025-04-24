"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schéma de validation pour le formulaire de mot de passe oublié
const forgotPasswordSchema = z.object({
  email: z.string().email("Veuillez saisir une adresse email valide"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Mutation tRPC pour la demande de réinitialisation de mot de passe
  const forgotPasswordMutation = api.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setStatus({
        success: true,
        message: t("forgotPassword.success"),
      });
      setIsLoading(false);
    },
    onError: (error) => {
      setStatus({
        success: false,
        message: error.message,
      });
      setIsLoading(false);
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setStatus(null);
    
    try {
      forgotPasswordMutation.mutate({ email: data.email.toLowerCase() });
    } catch (error) {
      console.error("Forgot password error:", error);
      setStatus({
        success: false,
        message: t("forgotPassword.errors.unexpected"),
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">{t("forgotPassword.title")}</CardTitle>
        <CardDescription className="text-center">
          {t("forgotPassword.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status ? (
          <div className="space-y-4">
            <Alert variant={status.success ? "default" : "destructive"}>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
            <Button
              className="w-full"
              onClick={() => router.push("/login")}
            >
              {t("forgotPassword.backToLogin")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("forgotPassword.form.email.label")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("forgotPassword.form.email.placeholder")}
                autoComplete="email"
                disabled={isLoading}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("forgotPassword.form.submitting") : t("forgotPassword.form.submit")}
            </Button>
            
            <div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">
                {t("forgotPassword.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
