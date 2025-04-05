import { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = {
  title: "Vérification de l'email",
  description: "Vérifiez votre adresse email pour activer votre compte",
};

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Vérifiez votre email
        </h1>
        <p className="text-sm text-muted-foreground">
          Un email de vérification a été envoyé à votre adresse email.
          Veuillez cliquer sur le lien dans l'email pour activer votre compte.
        </p>
      </div>
      <VerifyEmailForm />
    </div>
  );
} 