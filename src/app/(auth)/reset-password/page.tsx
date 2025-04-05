import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Réinitialisation du mot de passe",
  description: "Réinitialisez votre mot de passe pour accéder à votre compte",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Réinitialiser votre mot de passe
        </h1>
        <p className="text-sm text-muted-foreground">
          Créez un nouveau mot de passe sécurisé pour votre compte
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
} 