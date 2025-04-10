import { Metadata } from "next";
import { ClientRegisterForm } from "@/components/auth/ClientRegisterForm";

export const metadata: Metadata = {
  title: "Inscription Client | EcoDeli",
  description: "Créez un compte client sur EcoDeli pour commander vos produits locaux avec livraison écologique.",
};

export default function ClientRegisterPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <ClientRegisterForm />
      </div>
    </div>
  );
}
