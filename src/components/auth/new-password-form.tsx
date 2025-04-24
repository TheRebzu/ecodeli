"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

// Schema for new password form
const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, {
        message: "Le mot de passe doit contenir au moins 8 caractères",
      })
      .regex(/[A-Z]/, {
        message: "Le mot de passe doit contenir au moins une lettre majuscule",
      })
      .regex(/[a-z]/, {
        message: "Le mot de passe doit contenir au moins une lettre minuscule",
      })
      .regex(/[0-9]/, {
        message: "Le mot de passe doit contenir au moins un chiffre",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type NewPasswordData = z.infer<typeof newPasswordSchema>;

interface NewPasswordFormProps {
  token: string;
}

export function NewPasswordForm({ token }: NewPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NewPasswordData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  // Calculate password strength
  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Character type checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  
  // Get strength label
  const getStrengthLabel = (strength: number) => {
    if (strength <= 1) return "Très faible";
    if (strength === 2) return "Faible";
    if (strength === 3) return "Moyen";
    if (strength === 4) return "Fort";
    return "Très fort";
  };

  // Get color for strength indicator
  const getStrengthColor = (strength: number) => {
    if (strength <= 1) return "bg-destructive";
    if (strength === 2) return "bg-amber-500";
    if (strength === 3) return "bg-yellow-500";
    if (strength === 4) return "bg-lime-500";
    return "bg-green-500";
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Here would be the actual API call to reset the password
      console.log("Reset password with token:", token);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // For demonstration, show success state
      setIsSuccess(true);
    } catch (error) {
      console.error("Password reset error:", error);
      setError("Une erreur est survenue. Veuillez réessayer plus tard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto px-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-green-600"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-4">Mot de passe réinitialisé</h2>
        <p className="text-muted-foreground mb-6">
          Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </p>
        <Link 
          href="/login" 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md inline-block"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Créer un nouveau mot de passe</h1>
        <p className="text-muted-foreground">
          Veuillez créer un nouveau mot de passe pour votre compte.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.password ? "border-destructive" : "border-input"
              }`}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}

            {password && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Force du mot de passe:</span>
                  <span>{getStrengthLabel(passwordStrength)}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStrengthColor(passwordStrength)}`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium leading-none"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.confirmPassword ? "border-destructive" : "border-input"
              }`}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Réinitialisation en cours..." : "Réinitialiser le mot de passe"}
        </button>
      </form>
    </div>
  );
}

export default NewPasswordForm; 