import { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Mise à jour du mot de passe",
  description: "Mettez à jour votre mot de passe pour sécuriser votre compte",
};

export default function UpdatePasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Mettre à jour le mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">
            Entrez votre mot de passe actuel et votre nouveau mot de passe.
          </p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  );
} 