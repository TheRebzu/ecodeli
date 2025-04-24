"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

// Schema for password reset request
const resetRequestSchema = z.object({
  email: z.string().email({
    message: "Veuillez saisir une adresse email valide",
  }),
});

type ResetRequestData = z.infer<typeof resetRequestSchema>;

export function PasswordResetForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetRequestData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetRequestData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Here would be the actual API call to request password reset
      console.log("Password reset request for:", data.email);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // For demonstration, show success state
      setIsSubmitted(true);
    } catch (error) {
      console.error("Password reset request error:", error);
      setError("Une erreur est survenue. Veuillez réessayer plus tard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
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
        <h2 className="text-2xl font-semibold mb-4">Email envoyé</h2>
        <p className="text-muted-foreground mb-6">
          Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation de mot de passe dans quelques minutes.
        </p>
        <p className="text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Réinitialiser votre mot de passe</h1>
        <p className="text-muted-foreground">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            placeholder="nom@exemple.com"
            className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
              errors.email ? "border-destructive" : "border-input"
            }`}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
        </button>

        <div className="mt-4 text-center text-sm">
          <p className="text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default PasswordResetForm; 