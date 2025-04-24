import { Metadata } from "next";
import ProviderRegistrationForm from "@/components/auth/register-forms/provider-form";

export const metadata: Metadata = {
  title: "Inscription Prestataire | EcoDeli",
  description: "Inscrivez-vous comme prestataire de services et développez votre clientèle avec EcoDeli.",
};

export default function ProviderRegistrationPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <ProviderRegistrationForm />
    </div>
  );
} 