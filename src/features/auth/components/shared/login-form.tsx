"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginFormProps {
  redirectTo?: string;
  showRememberMe?: boolean;
  showSocialLogin?: boolean;
}

/**
 * Formulaire de connexion unifié avec NextAuth
 * Gestion des erreurs et redirections selon le rôle
 */
export function LoginForm({
  redirectTo = "/dashboard",
  showRememberMe = true,
  showSocialLogin = true,
}: LoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const email = watch("email");

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Vérifier d'abord le statut de l'utilisateur
      const statusResponse = await fetch("/api/auth/check-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const statusCheck = await statusResponse.json();

      if (!statusCheck.exists) {
        setError(
          "Aucun compte trouvé avec cet email. Souhaitez-vous vous inscrire ?",
        );
        setIsLoading(false);
        return;
      }

      if (!statusCheck.canLogin) {
        // Rediriger vers l'étape appropriée selon le statut
        if (statusCheck.needsAction.includes("EMAIL_VERIFICATION")) {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        if (statusCheck.needsAction.includes("DOCUMENT_UPLOAD")) {
          router.push("/onboarding/documents");
          return;
        }
        if (statusCheck.needsAction.includes("ADMIN_VALIDATION")) {
          router.push("/onboarding/pending");
          return;
        }

        setError(
          statusCheck.needsAction.join(", ") ||
            "Compte non autorisé à se connecter",
        );
        setIsLoading(false);
        return;
      }

      // Connexion avec NextAuth
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Erreur de connexion");
        setIsLoading(false);
        return;
      }

      // Redirection selon le rôle
      const roleRedirects = {
        CLIENT: "/client/dashboard",
        DELIVERER: "/deliverer/dashboard",
        MERCHANT: "/merchant/dashboard",
        PROVIDER: "/provider/dashboard",
        ADMIN: "/admin/dashboard",
      };

      const targetRedirect = roleRedirects[statusCheck.role] || redirectTo;
      router.push(targetRedirect);
    } catch (error) {
      console.error("❌ Erreur connexion:", error);
      setError("Erreur inattendue lors de la connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="votre@email.com"
            className="pl-10"
            {...register("email")}
            disabled={isLoading}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10 pr-10"
            {...register("password")}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Options */}
      <div className="flex items-center justify-between">
        {showRememberMe && (
          <div className="flex items-center space-x-2">
            <Checkbox id="rememberMe" {...register("rememberMe")} />
            <Label htmlFor="rememberMe" className="text-sm">
              Se souvenir de moi
            </Label>
          </div>
        )}

        <Button
          type="button"
          variant="link"
          className="text-sm px-0"
          onClick={() => router.push("/forgot-password")}
          disabled={isLoading}
        >
          Mot de passe oublié ?
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bouton de connexion */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connexion en cours...
          </>
        ) : (
          "Se connecter"
        )}
      </Button>

      {/* Séparateur et inscription */}
      <div className="text-center">
        <Separator className="my-4" />
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() => router.push("/register")}
            disabled={isLoading}
          >
            S'inscrire
          </Button>
        </p>
      </div>

      {/* TODO: Social Login */}
      {showSocialLogin && (
        <div className="space-y-2">
          <Separator />
          <p className="text-xs text-center text-muted-foreground">
            Connexion sociale (bientôt disponible)
          </p>
        </div>
      )}
    </form>
  );
}
