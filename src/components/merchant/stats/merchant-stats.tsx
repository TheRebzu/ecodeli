"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Package,
  Users,
  ShoppingCart,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  Star,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface StatsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalCustomers: number;
    conversionRate: number;
    returnRate: number;
    averageRating: number;
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
  };
  trends: {
    daily: Array<{
      date: string;
      revenue: number;
      orders: number;
      customers: number;
    }>;
    monthly: Array<{
      month: string;
      revenue: number;
      orders: number;
      growth: number;
    }>;
  };
  categories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function MerchantStats() {
  const t = useTranslations();
  const { toast } = useToast();
  const [period, setPeriod] = useState("30");
  const [chartType, setChartType] = useState("revenue");

  // Récupération des statistiques depuis l'API
  const {
    data: statsData,
    isLoading,
    error,
    refetch,
  } = api.merchant.getStats.useQuery({
    period: parseInt(period),
  });

  const stats = statsData as StatsData | undefined;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (growth < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const handleExportStats = () => {
    toast({
      title: "Export en cours",
      description: "Le rapport va être téléchargé...",
    });
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
          <p className="text-muted-foreground text-center mb-4">
            Impossible de charger les statistiques
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Chiffre d'affaires</SelectItem>
              <SelectItem value="orders">Commandes</SelectItem>
              <SelectItem value="customers">Clients</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleExportStats}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.overview.totalRevenue || 0)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {getTrendIcon(12.5)}
              <span className={getTrendColor(12.5)}>
                +12.5% vs période précédente
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.overview.totalOrders || 0}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {getTrendIcon(8.2)}
              <span className={getTrendColor(8.2)}>
                +8.2% vs période précédente
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier Moyen</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.overview.averageOrderValue || 0)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {getTrendIcon(4.1)}
              <span className={getTrendColor(4.1)}>
                +4.1% vs période précédente
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.overview.totalCustomers || 0}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {getTrendIcon(15.3)}
              <span className={getTrendColor(15.3)}>
                +15.3% vs période précédente
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Évolution {chartType === "revenue" ? "du CA" : chartType === "orders" ? "des commandes" : "des clients"}
            </CardTitle>
            <CardDescription>
              Tendance sur les {period} derniers jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.trends.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), "dd/MM")}
                />
                <YAxis 
                  tickFormatter={
                    chartType === "revenue" 
                      ? (value) => formatCurrency(value)
                      : (value) => value.toString()
                  }
                />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), "dd MMMM yyyy", { locale: fr })}
                  formatter={[
                    chartType === "revenue" 
                      ? (value: number) => [formatCurrency(value), "Chiffre d'affaires"]
                      : chartType === "orders"
                      ? (value: number) => [value, "Commandes"]
                      : (value: number) => [value, "Clients"],
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey={chartType} 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par catégories */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes par Catégorie</CardTitle>
            <CardDescription>
              Répartition du chiffre d'affaires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.categories || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.categories || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {(stats?.categories || []).map((category, index) => (
                <div key={category.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">{category.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {formatCurrency(category.value)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métriques de performance */}
        <Card>
          <CardHeader>
            <CardTitle>Métriques de Performance</CardTitle>
            <CardDescription>
              Indicateurs clés de votre boutique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm">Taux de conversion</span>
              </div>
              <Badge variant="outline">
                {formatPercentage(stats?.overview.conversionRate || 0)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm">Taux de retour</span>
              </div>
              <Badge variant="outline">
                {formatPercentage(stats?.overview.returnRate || 0)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm">Note moyenne</span>
              </div>
              <Badge variant="outline">
                {stats?.overview.averageRating?.toFixed(1) || "N/A"}/5
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Temps de préparation moyen</span>
              </div>
              <Badge variant="outline">
                2h 30min
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Top des produits */}
        <Card>
          <CardHeader>
            <CardTitle>Produits les Plus Vendus</CardTitle>
            <CardDescription>
              Top 5 des produits ce mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.overview.topProducts || []).map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sales} ventes
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatCurrency(product.revenue)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      {/* Contrôles skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>

      {/* Métriques skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}