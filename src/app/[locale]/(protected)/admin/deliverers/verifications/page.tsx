import { Metadata } from "next";
import { DocumentVerification } from "@/components/admin/document-verification";

export const metadata: Metadata = {
  title: "Vérification des livreurs | EcoDeli Admin",
  description: "Vérifiez et approuvez les documents des livreurs",
};

/**
 * Page d'administration pour la vérification des documents des livreurs
 */
export default function DelivererVerificationPage() {
  return (
    <div className="container py-6">
      <DocumentVerification userRole="DELIVERER" />
    </div>
  );
}
