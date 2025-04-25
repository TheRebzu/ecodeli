import { Metadata } from "next";
import ClientRegistrationForm from "@/components/auth/register-forms/client-form";

export const metadata: Metadata = {
  title: "Inscription Client | EcoDeli",
  description:
    "Créez votre compte client pour envoyer des colis et réserver des services avec EcoDeli.",
};

export default function ClientRegistrationPage() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <ClientRegistrationForm />
    </div>
  );
}
