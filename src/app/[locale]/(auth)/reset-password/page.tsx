import { PasswordResetForm } from "@/components/auth/register-forms/password-reset";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réinitialisation de mot de passe | EcoDeli",
  description: "Définissez un nouveau mot de passe pour votre compte EcoDeli",
};

export default function ResetPasswordPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <PasswordResetForm />
    </div>
  );
}
