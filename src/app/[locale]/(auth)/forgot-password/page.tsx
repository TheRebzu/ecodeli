import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/login/forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié | EcoDeli",
  description: "Réinitialisez votre mot de passe EcoDeli",
};

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen py-12">
      <ForgotPasswordForm />
    </div>
  );
}
