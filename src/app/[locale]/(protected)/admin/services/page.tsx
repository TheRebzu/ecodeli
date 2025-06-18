"use client";

import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import ServicesManagement from "@/components/admin/services/services-management";

export default function AdminServicesPage() {
  // Protection des routes - seuls les admins peuvent accéder
  useRoleProtection(["ADMIN"]);

  // Rendu du composant dédié selon le workflow EcoDeli
  return <ServicesManagement />;
}
