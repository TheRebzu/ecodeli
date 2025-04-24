import { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe | EcoDeli",
  description: "Créez un nouveau mot de passe pour votre compte EcoDeli",
};

interface ResetPasswordPageProps {
  params: {
    token: string;
  };
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Réinitialisation du mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez un nouveau mot de passe sécurisé pour votre compte
          </p>
        </div>
        <NewPasswordForm token={params.token} />
      </div>
    </div>
  );
} 