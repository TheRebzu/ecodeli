import { Metadata } from "next";
import { DocumentVerification } from "@/components/admin/document-verification";

export const metadata: Metadata = {
  title: "Vérification des prestataires | EcoDeli Admin",
  description: "Vérifiez et approuvez les documents des prestataires",
};

/**
 * Page d'administration pour la vérification des documents des prestataires
 */
export default function ProviderVerificationPage() {
  return (
    <div className="container py-6">
      <DocumentVerification userRole="PROVIDER" />
    </div>
  );
}
