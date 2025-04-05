import { Metadata } from "next";
import { ClientRegisterForm } from "@/components/auth/client-register-form";

export const metadata: Metadata = {
  title: "Inscription Client | EcoDeli",
  description: "Inscrivez-vous en tant que client pour commander des produits auprès de commerçants locaux avec une livraison éco-responsable",
};

export default function CustomerRegisterPage() {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <ClientRegisterForm className="w-full flex-1 flex flex-col" />
    </div>
  );
} 