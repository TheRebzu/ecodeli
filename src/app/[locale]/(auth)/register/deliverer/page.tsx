import { DelivererRegisterForm } from "@/components/auth/register-forms/deliverer-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription Livreur | EcoDeli",
  description: "Inscrivez-vous en tant que livreur sur EcoDeli",
};

export default function DelivererRegisterPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <DelivererRegisterForm />
    </div>
  );
}
