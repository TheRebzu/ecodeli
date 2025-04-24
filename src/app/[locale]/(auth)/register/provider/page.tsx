import { Metadata } from "next";
import ProviderRegistrationForm from "@/components/auth/register-forms/provider-form";

export const metadata: Metadata = {
  title: "Inscription Prestataire | EcoDeli",
  description: "Inscrivez-vous comme prestataire de services et développez votre clientèle avec EcoDeli.",
};

export default function ProviderRegistrationPage() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <ProviderRegistrationForm />
    </div>
  );
} 