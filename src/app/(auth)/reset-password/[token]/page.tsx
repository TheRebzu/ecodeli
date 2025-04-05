import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe | EcoDeli",
  description: "Réinitialisez votre mot de passe EcoDeli",
};

interface ResetPasswordPageProps {
  params: {
    token: string;
  };
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  return (
    <ResetPasswordForm token={params.token} />
  );
} 