import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié | EcoDeli",
  description: "Réinitialisez votre mot de passe EcoDeli",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-8 md:py-0">
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  );
} 