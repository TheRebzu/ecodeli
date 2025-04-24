import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié | EcoDeli",
  description: "Réinitialisez le mot de passe de votre compte EcoDeli",
};

export default function ForgotPasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Mot de passe oublié
          </h1>
          <p className="text-sm text-muted-foreground">
            Saisissez votre adresse email pour recevoir un lien de réinitialisation
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
} 