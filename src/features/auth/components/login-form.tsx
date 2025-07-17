"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import {
  loginSchema,
  type LoginData,
} from "@/features/auth/schemas/auth.schema";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertTriangle } from "lucide-react";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationButton, setShowVerificationButton] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const router = useRouter();
  const t = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);
    setShowVerificationButton(false);

    try {
      // Utiliser NextAuth signIn
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Vérifier si c'est un utilisateur inactif
        if (result.error.includes("Account pending validation") || result.error.includes("inactive")) {
          setShowVerificationButton(true);
          setVerificationEmail(data.email);
          setError("Votre compte n'est pas encore activé. Veuillez vérifier votre email.");
        } else {
          setError("Email ou mot de passe incorrect");
        }
        return;
      }

      if (result?.ok) {
        // Récupérer le paramètre redirect de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get("redirect");

        if (redirectUrl) {
          // Rediriger vers l'URL demandée
          window.location.href = redirectUrl;
        } else {
          // Rediriger vers la page d'accueil par défaut
          const locale = window.location.pathname.split("/")[1] || "fr";
          window.location.href = `/${locale}`;
        }
      }
    } catch (err) {
      console.error("Erreur de connexion:", err);
      setError(t("auth.login.errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!verificationEmail) return;

    setIsSendingVerification(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: verificationEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationSent(true);
        setShowVerificationButton(false);
      } else {
        setError(data.error || "Erreur lors de l'envoi de l'email de vérification");
      }
    } catch (error) {
      console.error("Erreur envoi email vérification:", error);
      setError("Erreur de connexion au serveur");
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {verificationSent && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Email de vérification envoyé ! Vérifiez votre boîte de réception et cliquez sur le lien pour activer votre compte.
          </AlertDescription>
        </Alert>
      )}

      {showVerificationButton && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p>Votre compte n'est pas encore activé. Cliquez sur le bouton ci-dessous pour recevoir un email de vérification.</p>
              <Button
                type="button"
                onClick={handleSendVerificationEmail}
                disabled={isSendingVerification}
                className="w-full"
                variant="outline"
              >
                {isSendingVerification ? "Envoi en cours..." : "📧 Envoyer email de vérification"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("auth.login.email")}
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder={t("auth.login.emailPlaceholder")}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("auth.login.password")}
        </label>
        <input
          {...register("password")}
          type="password"
          id="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder={t("auth.login.passwordPlaceholder")}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="flex justify-end mb-4">
        <Link
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? t("auth.login.signing") : t("auth.login.loginButton")}
      </button>
    </form>
  );
}
