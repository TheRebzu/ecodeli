"use client";

import { 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  PackageIcon, 
  UserCheck, 
  Clock
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: number;
  footer?: string;
  footerLink?: string;
  className?: string;
  trendText?: string;
  isMonetary?: boolean;
  isPercentage?: boolean;
};

export function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  footer, 
  footerLink, 
  className,
  trendText,
  isMonetary = false,
  isPercentage = false
}: StatCardProps) {
  // Formater la valeur si nécessaire
  const formattedValue = (() => {
    if (isMonetary) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(Number(value));
    } else if (isPercentage) {
      return `${value}%`;
    } else {
      return value;
    }
  })();

  // Déterminer les classes pour la tendance
  const trendClass = trend && trend > 0 
    ? "text-green-600" 
    : trend && trend < 0 
      ? "text-red-600" 
      : "text-gray-600";

  // Déterminer l'icône de tendance
  const trendIcon = trend && trend > 0 
    ? <TrendingUp className="h-4 w-4 mr-1" /> 
    : trend && trend < 0 
      ? <TrendingDown className="h-4 w-4 mr-1" /> 
      : null;

  // Formater le texte de tendance
  const formattedTrendText = trend 
    ? trendText || `${Math.abs(trend)}% depuis le mois dernier` 
    : '';

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend !== undefined && (
          <div className={cn("flex items-center mt-2 text-xs", trendClass)}>
            {trendIcon}
            <span>{formattedTrendText}</span>
          </div>
        )}
      </CardContent>
      {footer && (
        <CardFooter className="pt-0">
          {footerLink ? (
            <Link href={footerLink} className="text-xs text-primary hover:underline">
              {footer}
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">{footer}</p>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

type DashboardStatsProps = {
  stats: {
    totalRevenue: number;
    pendingShipments: number;
    completedShipments: number;
    activeUsers: number;
    avgDeliveryTime?: number;
    monthlyGrowth?: number;
  };
  className?: string;
};

export function DashboardStats({ stats, className }: DashboardStatsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", className)}>
      <StatCard
        title="Chiffre d'affaires"
        value={stats.totalRevenue}
        icon={<DollarSign className="h-4 w-4" />}
        trend={stats.monthlyGrowth}
        isMonetary={true}
        footer="Voir les détails financiers"
        footerLink="/dashboard/finances"
      />
      <StatCard
        title="Livraisons en attente"
        value={stats.pendingShipments}
        icon={<PackageIcon className="h-4 w-4" />}
        footer="Voir toutes les livraisons"
        footerLink="/dashboard/shipments"
      />
      <StatCard
        title="Livraisons terminées"
        value={stats.completedShipments}
        icon={<UserCheck className="h-4 w-4" />}
        footer="Consulter l'historique"
        footerLink="/dashboard/shipments/history"
      />
      <StatCard
        title="Temps moyen"
        value={stats.avgDeliveryTime || 0}
        description="Minutes de livraison"
        icon={<Clock className="h-4 w-4" />}
        trend={-5}
        trendText="5% plus rapide ce mois-ci"
        footer="Voir les performances"
        footerLink="/dashboard/performance"
      />
    </div>
  );
} 