import { Metadata } from "next";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Vérification d'email | EcoDeli",
  description: "Vérifiez votre adresse email pour activer votre compte EcoDeli",
};

export default function VerifyEmailPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Vérification d'email
          </h1>
          <p className="text-sm text-muted-foreground">
            Veuillez patienter pendant que nous vérifions votre email
          </p>
        </div>
        <VerifyEmailForm />
      </div>
    </div>
  );
}