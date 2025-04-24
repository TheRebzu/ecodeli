"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for login form
const loginSchema = z.object({
  email: z.string().email({
    message: "Veuillez saisir une adresse email valide",
  }),
  password: z.string().min(1, {
    message: "Veuillez saisir votre mot de passe",
  }),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setAuthError(null);
    
    try {
      // Here would be the actual API call to authenticate the user
      console.log("Login attempt:", data.email);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // For demonstration, let's simulate a successful login
      // In a real implementation, this would check the response from the server
      if (data.email === "demo@ecodeli.fr" && data.password === "password") {
        // Redirect to dashboard after successful login
        router.push("/dashboard");
      } else {
        // Show authentication error
        setAuthError("Email ou mot de passe incorrect");
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthError("Une erreur est survenue. Veuillez réessayer plus tard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Connexion</h1>
        <p className="text-muted-foreground">
          Accédez à votre compte EcoDeli
        </p>
      </div>

      {authError && (
        <div className="mb-6 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.email ? "border-destructive" : "border-input"
              }`}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none"
              >
                Mot de passe
              </label>
              <Link
                href="/reset-password"
                className="text-sm text-primary hover:underline"
              >
                Mot de passe oublié?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.password ? "border-destructive" : "border-input"
              }`}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="rememberMe"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              {...register("rememberMe")}
            />
            <label
              htmlFor="rememberMe"
              className="text-sm text-muted-foreground"
            >
              Se souvenir de moi
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Connexion en cours..." : "Se connecter"}
        </button>

        <div className="mt-4 text-center text-sm">
          <p className="text-muted-foreground">
            Vous n&apos;avez pas de compte?{" "}
            <Link href="/register" className="text-primary hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </div>

        {/* Social login options would go here */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continuer avec
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            type="button"
            className="flex items-center justify-center py-2 px-4 border border-input rounded-md text-sm font-medium bg-background"
          >
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center py-2 px-4 border border-input rounded-md text-sm font-medium bg-background"
          >
            Facebook
          </button>
        </div>
      </form>
    </div>
  );
}

export default LoginForm;
