"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Percent,
  TrendingUp,
  Building2,
} from "lucide-react";

interface ContractsStatsProps {
  stats?: {
    totalContracts: number;
    activeContracts: number;
    expiringSoon: number;
    draftContracts: number;
    suspendedContracts: number;
    contractsByType: Array<{ type: string; _count: number }>;
    contractsByCategory: Array<{ merchantCategory: string; _count: number }>;
    averageCommission: number;
    totalMonthlyRevenue: number;
  };
  isLoading: boolean;
}

export function ContractsStats({ stats, isLoading }: ContractsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Protection contre les valeurs undefined
  const totalContracts = stats.totalContracts ?? 0;
  const activeContracts = stats.activeContracts ?? 0;
  const expiringSoon = stats.expiringSoon ?? 0;
  const draftContracts = stats.draftContracts ?? 0;
  const suspendedContracts = stats.suspendedContracts ?? 0;
  const averageCommission = stats.averageCommission ?? 0;
  const totalMonthlyRevenue = stats.totalMonthlyRevenue ?? 0;
  const contractsByType = stats.contractsByType ?? [];

  const activePercentage =
    totalContracts > 0
      ? Math.round((activeContracts / totalContracts) * 100)
      : 0;

  const expiringSoonPercentage =
    activeContracts > 0
      ? Math.round((expiringSoon / activeContracts) * 100)
      : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Contrats totaux */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contrats totaux</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalContracts.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Tous les contrats de la plateforme
          </p>
        </CardContent>
      </Card>

      {/* Contrats actifs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contrats actifs</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {activeContracts.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {activePercentage}% du total ({activeContracts}/{totalContracts})
          </p>
        </CardContent>
      </Card>

      {/* Expirant bientôt */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Expirant bientôt
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {expiringSoon.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Dans les 30 prochains jours ({expiringSoonPercentage}% des actifs)
          </p>
        </CardContent>
      </Card>

      {/* Brouillons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En brouillon</CardTitle>
          <FileText className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">
            {draftContracts.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            En attente de finalisation
          </p>
        </CardContent>
      </Card>

      {/* Suspendus */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Suspendus</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {suspendedContracts.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Nécessitent une attention
          </p>
        </CardContent>
      </Card>

      {/* Revenus mensuels */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Revenus mensuels
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(totalMonthlyRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">Frais mensuels actifs</p>
        </CardContent>
      </Card>

      {/* Commission moyenne */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Commission moyenne
          </CardTitle>
          <Percent className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {(averageCommission * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Taux moyen sur contrats actifs
          </p>
        </CardContent>
      </Card>

      {/* Types de contrats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Types principaux
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {contractsByType.slice(0, 3).map((type, index) => (
              <div
                key={type.type}
                className="flex justify-between items-center"
              >
                <span className="text-sm font-medium capitalize">
                  {type.type.toLowerCase()}
                </span>
                <span className="text-sm text-muted-foreground">
                  {type._count}
                </span>
              </div>
            ))}
            {contractsByType.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{contractsByType.length - 3} autres types
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
