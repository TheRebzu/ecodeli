import { Metadata } from "next";
import DelivererRegistrationForm from "@/components/auth/register-forms/deliverer-form";

export const metadata: Metadata = {
  title: "Inscription Livreur | EcoDeli",
  description: "Devenez livreur freelance et gagnez de l'argent en livrant des colis avec EcoDeli.",
};

export default function DelivererRegistrationPage() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <DelivererRegistrationForm />
    </div>
  );
} 