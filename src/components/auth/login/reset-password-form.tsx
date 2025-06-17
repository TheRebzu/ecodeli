"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";

interface ResetPasswordFormProps {
  mode?: "request" | "reset";
  token?: string;
}

// Schéma pour la demande de réinitialisation
const requestResetSchema = z.object({
  email: z.string()
    .email("Adresse email invalide")
    .min(1, "L'email est requis")
});

// Schéma pour la réinitialisation du mot de passe
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  newPassword: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

type RequestResetFormData = z.infer<typeof requestResetSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Composant de réinitialisation de mot de passe
 * Implémentation selon la Mission 1 - Sécurité et authentification
 */
export default function ResetPasswordForm({ mode = "request", token }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Déterminer le mode basé sur les paramètres de recherche
  const tokenFromUrl = searchParams.get("token");
  const currentMode = tokenFromUrl ? "reset" : mode;
  const resetToken = token || tokenFromUrl;

  // Mutation pour demander la réinitialisation
  const requestResetMutation = api.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setEmailSent(true);
      toast.success(t("emailSent"));
    },
    onError: (error) => {
      toast.error(error.message || t("requestError"));
    }
  });

  // Mutation pour réinitialiser le mot de passe
  const resetPasswordMutation = api.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success(t("resetSuccess"));
      router.push("/auth/signin?message=password-reset");
    },
    onError: (error) => {
      toast.error(error.message || t("resetError"));
    }
  });

  // Formulaire pour la demande de réinitialisation
  const requestForm = useForm<RequestResetFormData>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: ""
    }
  });

  // Formulaire pour la réinitialisation
  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: resetToken || "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const handleRequestReset = async (data: RequestResetFormData) => {
    await requestResetMutation.mutateAsync({
      email: data.email
    });
  };

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    await resetPasswordMutation.mutateAsync({
      token: data.token,
      newPassword: data.newPassword
    });
  };

  // Affichage de confirmation d'envoi d'email
  if (currentMode === "request" && emailSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            {t("emailSentTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {t("emailSentDescription")}
          </p>
          <p className="text-sm text-gray-500">
            {t("checkSpam")}
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToLogin")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Formulaire de demande de réinitialisation
  if (currentMode === "request") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Mail className="h-6 w-6 text-blue-500" />
            {t("requestTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                {...requestForm.register("email")}
                disabled={requestResetMutation.isPending}
              />
              {requestForm.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {requestForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={requestResetMutation.isPending}
            >
              {requestResetMutation.isPending ? t("sending") : t("sendResetLink")}
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/auth/signin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("backToLogin")}
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Formulaire de réinitialisation du mot de passe
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-6 w-6 text-blue-500" />
          {t("resetTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!resetToken && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("invalidToken")}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
          <input type="hidden" {...resetForm.register("token")} />

          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder={t("newPasswordPlaceholder")}
                {...resetForm.register("newPassword")}
                disabled={resetPasswordMutation.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {resetForm.formState.errors.newPassword && (
              <p className="text-sm text-red-500">
                {resetForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("confirmPasswordPlaceholder")}
                {...resetForm.register("confirmPassword")}
                disabled={resetPasswordMutation.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {resetForm.formState.errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {resetForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={resetPasswordMutation.isPending || !resetToken}
          >
            {resetPasswordMutation.isPending ? t("resetting") : t("resetPassword")}
          </Button>

          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/signin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToLogin")}
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
