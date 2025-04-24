"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for account details with password
const accountDetailsSchema = z
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
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Vous devez accepter les conditions d&apos;utilisation",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type AccountDetailsData = z.infer<typeof accountDetailsSchema>;

interface AccountDetailsProps {
  onSubmit: (data: AccountDetailsData) => void;
  onBack: () => void;
}

export function AccountDetails({ onSubmit, onBack }: AccountDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountDetailsData>({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      acceptTerms: false,
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

  const handleFormSubmit = async (data: AccountDetailsData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6 w-full max-w-md mx-auto"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Détails du compte</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Créez un mot de passe sécurisé pour votre compte
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none"
          >
            Mot de passe <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.password
                  ? "border-destructive"
                  : "border-input"
              }`}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
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
            Confirmer le mot de passe <span className="text-destructive">*</span>
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
              errors.confirmPassword
                ? "border-destructive"
                : "border-input"
            }`}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="pt-2">
          <div className="flex items-start">
            <input
              id="acceptTerms"
              type="checkbox"
              className="h-4 w-4 mt-1 rounded border-input"
              {...register("acceptTerms")}
            />
            <label
              htmlFor="acceptTerms"
              className="ml-2 text-sm text-muted-foreground"
            >
              J&apos;accepte les{" "}
              <a
                href="/terms"
                className="text-primary underline"
                target="_blank"
              >
                conditions d&apos;utilisation
              </a>{" "}
              et la{" "}
              <a
                href="/privacy"
                className="text-primary underline"
                target="_blank"
              >
                politique de confidentialité
              </a>
              <span className="text-destructive">*</span>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-destructive mt-1">{errors.acceptTerms.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-input rounded-md text-sm font-medium"
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Chargement..." : "Continuer"}
        </button>
      </div>
    </form>
  );
}

export default AccountDetails;