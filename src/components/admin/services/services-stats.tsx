"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Package,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Calendar,
} from "lucide-react";

interface ServicesStatsProps {
  stats?: {
    totalServices: number;
    activeServices: number;
    inactiveServices: number;
    totalCategories: number;
    totalRevenue: number;
    monthlyRevenue: number;
    averageRating: number;
    totalBookings: number;
    recentServices: Array<{
      id: string;
      name: string;
      category: string;
      bookingsCount: number;
      revenue: number;
    }>;
    categoryStats: Array<{
      category: string;
      count: number;
      revenue: number;
    }>;
  };
  isLoading?: boolean;
}

export function ServicesStats({ stats, isLoading }: ServicesStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Aucune donnée disponible
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusColor = (count: number, total: number) => {
    const percentage = (count / total) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Services
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              <span
                className={getStatusColor(
                  stats.activeServices,
                  stats.totalServices,
                )}
              >
                {stats.activeServices} actifs
              </span>
              {" • "}
              <span className="text-muted-foreground">
                {stats.inactiveServices} inactifs
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.monthlyRevenue)} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {stats.averageRating.toFixed(1)}
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              Sur {stats.totalBookings} réservations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              Types de services disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services récents et performances */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Services Populaires</CardTitle>
            <CardDescription>Services les plus demandés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {service.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {service.category}
                    </Badge>
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">
                    {formatCurrency(service.revenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {service.bookingsCount} réservations
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par Catégorie</CardTitle>
            <CardDescription>Services et revenus par catégorie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.categoryStats.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {category.category}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {category.count} services
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="w-full bg-secondary rounded-full h-2 mr-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(category.revenue / stats.totalRevenue) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium min-w-0">
                    {formatCurrency(category.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
