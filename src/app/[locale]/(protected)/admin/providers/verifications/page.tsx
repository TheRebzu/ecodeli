import { Metadata } from "next";
import UsersVerificationList from "@/components/admin/verification/users-verification-list";

export const metadata: Metadata = {
  title: "Vérification des prestataires | EcoDeli Admin",
  description: "Vérifiez et approuvez les documents des prestataires",
};

/**
 * Page d'administration pour la vérification des documents des prestataires
 */
export default function ProviderVerificationsPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">
        Vérifications des prestataires
      </h1>
      <UsersVerificationList />
    </div>
  );
}
