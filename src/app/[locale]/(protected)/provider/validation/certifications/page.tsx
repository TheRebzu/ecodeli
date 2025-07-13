"use client";

import { ProviderCertificationsValidation } from "@/features/provider/components/validation/certifications-validation";
import { useAuth } from "@/hooks/use-auth";

export default function CertificationsValidationPage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="container mx-auto py-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <ProviderCertificationsValidation providerId={user.id} />
    </div>
  );
}
