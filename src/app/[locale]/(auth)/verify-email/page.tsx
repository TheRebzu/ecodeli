import { EmailVerification } from "@/components/auth/verification/email-verification";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vérification d'email | EcoDeli",
  description: "Vérifiez votre adresse email pour activer votre compte EcoDeli"};

export default function VerifyEmailPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <EmailVerification />
    </div>
  );
}
