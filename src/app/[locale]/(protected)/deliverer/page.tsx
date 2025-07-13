"use client";

import { useAuth } from "@/hooks/use-auth";
import { DelivererDashboard } from "@/features/deliverer/components/recruitment/deliverer-recruitment-dashboard";
import { Loader2 } from "lucide-react";

export default function DelivererDashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <DelivererDashboard />;
}
