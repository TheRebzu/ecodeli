"use client";

import { useAuth } from "@/hooks/use-auth";
import ProviderServicesManager from "@/features/provider/components/services/provider-services-manager";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

export default function ProviderServicesListPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.services");
  const [providerId, setProviderId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviderData = async () => {
      if (!user?.id) return;

      try {
        // Essayer d'abord avec l'ID utilisateur directement
        const response = await fetch(`/api/provider/profile?userId=${user.id}`);

        if (response.ok) {
          const data = await response.json();
          if (data.provider?.id) {
            setProviderId(data.provider.id);
          } else {
            // Si pas de provider trouvé, utiliser l'ID utilisateur comme fallback
            setProviderId(user.id);
          }
        } else {
          // En cas d'erreur, utiliser l'ID utilisateur comme fallback
          setProviderId(user.id);
        }
      } catch (error) {
        console.error("Error fetching provider data:", error);
        // En cas d'erreur, utiliser l'ID utilisateur comme fallback
        setProviderId(user.id);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Services"
        description="Gérez vos services et leurs paramètres de réservation"
      />

      {providerId && <ProviderServicesManager providerId={providerId} />}
    </div>
  );
}
