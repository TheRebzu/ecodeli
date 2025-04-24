import { Metadata } from "next";
import PasswordResetForm from "@/components/auth/password-reset-form";

export const metadata: Metadata = {
  title: "Réinitialiser votre mot de passe | EcoDeli",
  description: "Récupérez l'accès à votre compte EcoDeli en réinitialisant votre mot de passe.",
};

export default function PasswordResetPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <PasswordResetForm />
    </div>
  );
} 