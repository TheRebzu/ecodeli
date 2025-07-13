"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Package,
  Users,
  ShoppingCart,
  Target,
  MapPin,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CalendarIcon,
  ShoppingCartIcon,
  PackageIcon,
  EuroIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  overview: {
    revenue: {
      totalRevenue: number;
      growthRate: number;
      averageOrderValue: number;
      totalOrders: number;
      revenueByDay: Array<{
        date: string;
        revenue: number;
        orders: number;
      }>;
    };
    customers: {
      totalCustomers: number;
      newCustomers: number;
      returningCustomers: number;
      customerRetentionRate: number;
    };
    deliveries: {
      totalDeliveries: number;
      successfulDeliveries: number;
      onTimeDeliveryRate: number;
    };
    cartDrop: {
      totalCartDropOrders: number;
      cartDropRevenue: number;
      averageCartValue: number;
    };
  };
  lastUpdated: string;
}

export default function MerchantAnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        timeRange,
        ...(dateRange?.from && { startDate: dateRange.from.toISOString() }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString() }),
      });

      const response = await fetch(
        `/api/merchant/analytics/dashboard?${params}`,
      );
      if (!response.ok)
        throw new Error("Erreur lors du chargement des analytics");

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Erreur analytics:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("fr-FR").format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Impossible de charger les données analytics
            </p>
            <Button onClick={fetchAnalyticsData} className="mt-4">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview } = analyticsData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Business</h1>
          <p className="text-muted-foreground">
            Tableau de bord et métriques de performance
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">3 derniers mois</SelectItem>
              <SelectItem value="1y">12 derniers mois</SelectItem>
              <SelectItem value="custom">Période personnalisée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenus */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Chiffre d'affaires
            </CardTitle>
            <EuroIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.revenue.totalRevenue)}
            </div>
            <div className="flex items-center mt-1">
              {overview.revenue.growthRate >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm ${
                  overview.revenue.growthRate >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {formatPercentage(overview.revenue.growthRate)}
              </span>
              <span className="text-sm text-muted-foreground ml-1">
                vs période précédente
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Commandes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.revenue.totalOrders.toLocaleString("fr-FR")}
            </div>
            <p className="text-sm text-muted-foreground">
              Panier moyen: {formatCurrency(overview.revenue.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.customers.totalCustomers.toLocaleString("fr-FR")}
            </div>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">
                {overview.customers.newCustomers} nouveaux
              </Badge>
              <Badge variant="outline">
                {overview.customers.returningCustomers} récurrents
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Lâcher de chariot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lâcher de chariot
            </CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.cartDrop.totalCartDropOrders.toLocaleString("fr-FR")}
            </div>
            <p className="text-sm text-muted-foreground">
              CA: {formatCurrency(overview.cartDrop.cartDropRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métriques détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance des livraisons */}
        <Card>
          <CardHeader>
            <CardTitle>Performance des livraisons</CardTitle>
            <CardDescription>
              Suivi de la qualité du service de livraison
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total des livraisons</span>
              <span className="text-lg font-bold">
                {overview.deliveries.totalDeliveries.toLocaleString("fr-FR")}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Livraisons réussies</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">
                  {overview.deliveries.successfulDeliveries.toLocaleString(
                    "fr-FR",
                  )}
                </span>
                <Badge variant="secondary">
                  {(
                    (overview.deliveries.successfulDeliveries /
                      overview.deliveries.totalDeliveries) *
                    100
                  ).toFixed(1)}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Livraisons à l'heure</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  {overview.deliveries.onTimeDeliveryRate.toFixed(1)}%
                </span>
                <Badge
                  variant={
                    overview.deliveries.onTimeDeliveryRate >= 90
                      ? "default"
                      : "destructive"
                  }
                >
                  {overview.deliveries.onTimeDeliveryRate >= 90
                    ? "Excellent"
                    : "À améliorer"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fidélisation clients */}
        <Card>
          <CardHeader>
            <CardTitle>Fidélisation clients</CardTitle>
            <CardDescription>
              Analyse du comportement et de la rétention client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Taux de rétention</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">
                  {overview.customers.customerRetentionRate.toFixed(1)}%
                </span>
                <Badge
                  variant={
                    overview.customers.customerRetentionRate >= 75
                      ? "default"
                      : "secondary"
                  }
                >
                  {overview.customers.customerRetentionRate >= 75
                    ? "Bon"
                    : "Moyen"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {overview.customers.newCustomers}
                </div>
                <div className="text-sm text-muted-foreground">
                  Nouveaux clients
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {overview.customers.returningCustomers}
                </div>
                <div className="text-sm text-muted-foreground">
                  Clients récurrents
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accès direct aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="h-16">
              <a href="/merchant/cart-drop">
                <div className="text-center">
                  <ShoppingCartIcon className="h-6 w-6 mx-auto mb-1" />
                  <div className="text-sm">Configurer lâcher de chariot</div>
                </div>
              </a>
            </Button>

            <Button asChild variant="outline" className="h-16">
              <a href="/merchant/announcements">
                <div className="text-center">
                  <PackageIcon className="h-6 w-6 mx-auto mb-1" />
                  <div className="text-sm">Gérer les annonces</div>
                </div>
              </a>
            </Button>

            <Button asChild variant="outline" className="h-16">
              <a href="/merchant/payments">
                <div className="text-center">
                  <EuroIcon className="h-6 w-6 mx-auto mb-1" />
                  <div className="text-sm">Gérer les paiements</div>
                </div>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
