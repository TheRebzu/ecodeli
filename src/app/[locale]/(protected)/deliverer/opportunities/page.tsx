"use client";

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import OpportunityManager from "@/features/deliverer/components/opportunities/opportunity-manager";

export default function DelivererOpportunitiesPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunités de livraison"
        description="Découvrez les opportunités de livraison disponibles"
      />
      
      <OpportunityManager delivererId={user.id} />
    </div>
  );
}