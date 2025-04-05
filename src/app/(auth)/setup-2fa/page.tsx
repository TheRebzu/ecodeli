import { Metadata } from "next";
import { Setup2FAForm } from "@/components/auth/setup-2fa-form";

export const metadata: Metadata = {
  title: "Configuration de la 2FA",
  description: "Configurez l'authentification à deux facteurs pour sécuriser votre compte",
};

export default function Setup2FAPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Authentification à deux facteurs
          </h1>
          <p className="text-sm text-muted-foreground">
            Scannez le QR code avec votre application d'authentification pour configurer la 2FA.
          </p>
        </div>
        <Setup2FAForm />
      </div>
    </div>
  );
} 