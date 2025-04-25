"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schéma de validation pour le formulaire de réinitialisation de mot de passe
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(
        /[A-Z]/,
        "Le mot de passe doit contenir au moins une lettre majuscule",
      )
      .regex(
        /[a-z]/,
        "Le mot de passe doit contenir au moins une lettre minuscule",
      )
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTranslations("auth");

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Mutation tRPC pour la réinitialisation de mot de passe
  const resetPasswordMutation = api.auth.resetPassword.useMutation({
    onSuccess: (data) => {
      setStatus({
        success: true,
        message: t("resetPassword.success"),
      });

      // Redirection vers la page de connexion après 3 secondes
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    },
    onError: (error) => {
      setStatus({
        success: false,
        message: error.message || t("resetPassword.error"),
      });
      setIsLoading(false);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setStatus({
        success: false,
        message: t("resetPassword.error"),
      });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      resetPasswordMutation.mutate({
        token,
        password: data.password,
      });
    } catch (error) {
      console.error("Reset password error:", error);
      setStatus({
        success: false,
        message: t("resetPassword.error"),
      });
      setIsLoading(false);
    }
  };

  // Si aucun token n'est fourni, afficher une erreur
  if (!token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {t("resetPassword.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{t("resetPassword.error")}</AlertDescription>
          </Alert>
          <Button className="w-full mt-4" onClick={() => router.push("/login")}>
            {t("resetPassword.backToLogin")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          {t("resetPassword.title")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("resetPassword.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status ? (
          <div className="space-y-4">
            <Alert variant={status.success ? "default" : "destructive"}>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
            {status.success ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("resetPassword.redirecting")}
              </p>
            ) : (
              <Button className="w-full" onClick={() => router.push("/login")}>
                {t("resetPassword.backToLogin")}
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {t("resetPassword.form.password")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("resetPassword.form.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? t("resetPassword.form.submitting")
                : t("resetPassword.form.submit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
