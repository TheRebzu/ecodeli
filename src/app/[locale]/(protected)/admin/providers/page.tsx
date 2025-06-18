"use client";

import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import { ProvidersManagement } from "@/components/admin/providers";

export default function AdminProvidersPage() {
  // Protection des routes - seuls les admins peuvent accéder
  useRoleProtection(["ADMIN"]);

  // Rendu du composant dédié selon le workflow EcoDeli
  return <ProvidersManagement />;
}
