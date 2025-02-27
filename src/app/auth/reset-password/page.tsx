import { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe | EcoDeli",
  description: "Créez un nouveau mot de passe pour votre compte EcoDeli",
};

export default function ResetPasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Réinitialiser le mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez un nouveau mot de passe sécurisé
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}