"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionCardProps {
  plan: string | undefined;
  remainingDays: number | undefined;
  isLoading?: boolean;
  className?: string;
}

export function SubscriptionCard({
  plan = "Standard",
  remainingDays = 0,
  isLoading = false,
  className,
}: SubscriptionCardProps) {
  // Mapping des plans d'abonnement pour l'affichage
  const planConfig: Record<string, { label: string; color: string; }> = {
    FREE: { 
      label: "Gratuit", 
      color: "from-gray-600 to-gray-700",
    },
    STARTER: { 
      label: "Standard", 
      color: "from-blue-600 to-indigo-600",
    },
    PREMIUM: { 
      label: "Premium", 
      color: "from-amber-500 to-amber-700",
    },
  };
  
  const planLabel = planConfig[plan]?.label || plan;
  const gradientColor = planConfig[plan]?.color || "from-blue-600 to-indigo-600";
  
  return (
    <div className={cn(`bg-gradient-to-r ${gradientColor} rounded-lg shadow-md p-6 text-white`, className)}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          {isLoading ? (
            <>
              <div className="h-6 w-24 bg-white/20 animate-pulse rounded" />
              <div className="h-4 w-48 bg-white/20 animate-pulse rounded mt-2" />
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">{planLabel}</h3>
              <p className="opacity-90 mt-1">
                {remainingDays 
                  ? `Votre abonnement expire dans ${remainingDays} jour${remainingDays > 1 ? 's' : ''}`
                  : "Abonnement sans date d'expiration"}
              </p>
            </>
          )}
        </div>
        
        {(plan !== 'PREMIUM' && !isLoading) && (
          <div className="mt-4 md:mt-0">
            <Link 
              href="/client/subscription/upgrade" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Passer à Premium
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 