"use client";

import { ProviderProfileValidation } from "@/features/provider/components/validation/profile-validation";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileValidationPage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="container mx-auto py-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <ProviderProfileValidation providerId={user.id} />
    </div>
  );
}
