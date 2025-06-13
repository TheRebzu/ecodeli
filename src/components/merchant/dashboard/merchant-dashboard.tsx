"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/system/use-socket";
import { api } from "@/trpc/react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Icons
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ShoppingCart,
  Euro,
  Eye,
  Plus,
  Settings,
  BarChart3,
  Monitor,
  Store,
  Clock,
  Star,
  Users,
  MapPin,
  FileText,
  Sparkles,
} from "lucide-react";

// Types
interface MerchantStats {
  dailyRevenue: number;
  monthlyRevenue: number;
  orderCount: number;
  activeDeliveries: number;
  lowStockItems: number;
  averageOrderValue: number;
  customerSatisfaction: number;
  conversionRate: number;
}

interface Order {
  id: string;
  number: string;
  customer: {
    name: string;
    email: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: string;
  createdAt: string;
  deliveryAddress: string;
}

interface StockAlert {
  id: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  category: string;
}

type MerchantDashboardProps = {
  locale: string;
};

// Utilitaire pour les classes CSS
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Composant de carte de statistique
const StatCard = ({
  title,
  value,
  icon,
  trend,
  isLoading = false,
  onClick,
  color = "text-primary",
  bgColor = "bg-primary/10",
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  onClick?: () => void;
  color?: string;
  bgColor?: string;
}) => {
  if (isLoading) {
    return (
      <Card
        className={
          onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
        }
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={cn("p-3 rounded-full", bgColor)}>
                <div className="h-5 w-5 bg-gray-300 animate-pulse rounded" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            {trend && <Skeleton className="h-4 w-12" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={cn("p-3 rounded-full", bgColor)}>
              <div className={color}>{icon}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
          </div>
          {trend && (
            <div className="text-right">
              <p
                className={`text-xs flex items-center gap-1 ${
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.value >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </p>
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Composant de commande récente
const OrderCard = ({
  order,
  onView,
}: {
  order: Order;
  onView: (id: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
      case "PREPARING":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
      case "READY":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200";
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "En attente",
      CONFIRMED: "Confirmée",
      PREPARING: "En préparation",
      READY: "Prête",
      DELIVERED: "Livrée",
    };
    return labels[status] || status;
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onView(order.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">
              Commande #{order.number}
            </h4>
            <p className="text-xs text-muted-foreground">
              {order.customer.name}
            </p>
            <Badge className={cn("text-xs mt-1", getStatusColor(order.status))}>
              {getStatusLabel(order.status)}
            </Badge>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{order.total}€</p>
            <p className="text-xs text-muted-foreground">
              {order.items.length} article{order.items.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{order.deliveryAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant d'alerte stock
const StockAlertCard = ({ alert }: { alert: StockAlert }) => {
  const urgencyLevel =
    alert.currentStock <= alert.minimumStock * 0.5 ? "critical" : "warning";

  return (
    <Card
      className={cn(
        "border-l-4",
        urgencyLevel === "critical"
          ? "border-l-red-500 bg-red-50 dark:bg-red-950/20"
          : "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm">{alert.productName}</h4>
            <p className="text-xs text-muted-foreground">{alert.category}</p>
          </div>
          <AlertTriangle
            className={cn(
              "h-4 w-4",
              urgencyLevel === "critical" ? "text-red-600" : "text-orange-600",
            )}
          />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Stock actuel</span>
            <span className="font-medium">
              {alert.currentStock} / {alert.minimumStock} min
            </span>
          </div>
          <Progress
            value={(alert.currentStock / alert.minimumStock) * 100}
            className="h-2"
          />
          <p
            className={cn(
              "text-xs mt-1",
              urgencyLevel === "critical" ? "text-red-600" : "text-orange-600",
            )}
          >
            {urgencyLevel === "critical" ? "Stock critique !" : "Stock faible"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Actions rapides
const QuickActionsSection = () => {
  const router = useRouter();

  const quickActions = [
    {
      icon: <Plus className="h-5 w-5" />,
      label: "Nouvelle commande",
      description: "Créer une commande manuelle",
      action: () => router.push("/merchant/orders/create"),
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50",
    },
    {
      icon: <Monitor className="h-5 w-5" />,
      label: "Terminal chariot",
      description: "Lâcher chariot caisse",
      action: () => router.push("/merchant/cart-drop/terminal"),
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/50",
    },
    {
      icon: <Package className="h-5 w-5" />,
      label: "Gérer catalogue",
      description: "Produits et stock",
      action: () => router.push("/merchant/catalog"),
      color: "text-green-600 bg-green-100 dark:bg-green-900/50",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Voir analytics",
      description: "Statistiques ventes",
      action: () => router.push("/merchant/stats"),
      color: "text-orange-600 bg-orange-100 dark:bg-orange-900/50",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex-col p-4 space-y-2"
              onClick={action.action}
            >
              <div className={cn("p-2 rounded-lg", action.color)}>
                {action.icon}
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function MerchantDashboard({ locale }: MerchantDashboardProps) {
  const router = useRouter();
  const { socket } = useSocket();
  const [realtimeStats, setRealtimeStats] =
    useState<Partial<MerchantStats> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Récupérer les données du dashboard
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.merchant.getDashboardStats.useQuery();

  const { data: recentOrders, isLoading: isLoadingOrders } =
    api.merchant.getRecentOrders.useQuery({
      limit: 5,
    });

  const { data: stockAlerts } = api.merchant.getStockAlerts.useQuery();

  const { data: salesChart } = api.merchant.getSalesChart.useQuery({
    period: "week",
  });

  // Socket.io pour les mises à jour temps réel
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    // Écouter les nouvelles commandes
    socket.on("merchant:new:order", (order) => {
      refetchStats();
      // Ici on pourrait afficher une notification
    });

    // Écouter les mises à jour de stats
    socket.on("merchant:stats:update", (data) => {
      setRealtimeStats(data);
    });

    // Écouter les alertes stock
    socket.on("merchant:stock:alert", (alert) => {
      // Afficher notification d'alerte stock
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("merchant:new:order");
      socket.off("merchant:stats:update");
      socket.off("merchant:stock:alert");
    };
  }, [socket, refetchStats]);

  const handleViewOrder = (orderId: string) => {
    router.push(`/merchant/orders/${orderId}`);
  };

  const currentStats = realtimeStats || stats;

  return (
    <div className="space-y-6">
      {/* Alertes stock critiques */}
      {stockAlerts &&
        stockAlerts.filter(
          (alert) => alert.currentStock <= alert.minimumStock * 0.5,
        ).length > 0 && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alertes stock critiques</AlertTitle>
            <AlertDescription>
              {
                stockAlerts.filter(
                  (alert) => alert.currentStock <= alert.minimumStock * 0.5,
                ).length
              }{" "}
              produit(s) en rupture de stock.
              <Button
                variant="link"
                className="p-0 h-auto ml-2"
                onClick={() => router.push("/merchant/catalog")}
              >
                Gérer le stock
              </Button>
            </AlertDescription>
          </Alert>
        )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CA aujourd'hui"
          value={`${currentStats?.dailyRevenue || 0}€`}
          icon={<Euro className="h-5 w-5" />}
          trend={{ value: 12, label: "vs hier" }}
          isLoading={isLoadingStats}
          onClick={() => router.push("/merchant/stats/sales")}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/50"
        />

        <StatCard
          title="CA mensuel"
          value={`${currentStats?.monthlyRevenue || 0}€`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: 8, label: "vs mois dernier" }}
          isLoading={isLoadingStats}
          onClick={() => router.push("/merchant/stats")}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/50"
        />

        <StatCard
          title="Commandes jour"
          value={currentStats?.orderCount || 0}
          icon={<ShoppingCart className="h-5 w-5" />}
          isLoading={isLoadingStats}
          onClick={() => router.push("/merchant/orders")}
          color="text-purple-600"
          bgColor="bg-purple-100 dark:bg-purple-900/50"
        />

        <StatCard
          title="Livraisons actives"
          value={currentStats?.activeDeliveries || 0}
          icon={<Truck className="h-5 w-5" />}
          isLoading={isLoadingStats}
          onClick={() => router.push("/merchant/deliveries")}
          color="text-orange-600"
          bgColor="bg-orange-100 dark:bg-orange-900/50"
        />
      </div>

      {/* Actions rapides */}
      <QuickActionsSection />

      {/* Contenu principal avec onglets */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="stock">Alertes stock</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Commandes récentes */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Commandes récentes</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push("/merchant/orders")}
                    >
                      Voir tout
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {isLoadingOrders ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : recentOrders && recentOrders.length > 0 ? (
                      <div className="space-y-3">
                        {recentOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onView={handleViewOrder}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
                        <p className="text-muted-foreground">
                          Aucune commande récente
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar avec métriques et alertes */}
            <div className="space-y-4">
              {/* Performance du jour */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance du jour
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Panier moyen
                    </span>
                    <span className="font-medium">
                      {currentStats?.averageOrderValue || 0}€
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Satisfaction client
                    </span>
                    <span className="font-medium flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {currentStats?.customerSatisfaction || 0}/5
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Taux conversion
                    </span>
                    <span className="font-medium">
                      {currentStats?.conversionRate || 0}%
                    </span>
                  </div>

                  {/* Graphique de performance */}
                  {salesChart && salesChart.length > 0 && (
                    <div className="mt-4 h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesChart}>
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Tooltip />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alertes stock */}
              {stockAlerts && stockAlerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Alertes stock
                      </span>
                      <Badge variant="destructive">{stockAlerts.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px] pr-4">
                      <div className="space-y-3">
                        {stockAlerts.slice(0, 3).map((alert) => (
                          <StockAlertCard key={alert.id} alert={alert} />
                        ))}
                      </div>
                    </ScrollArea>
                    {stockAlerts.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => router.push("/merchant/catalog")}
                      >
                        Voir toutes les alertes ({stockAlerts.length})
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Statut de vérification */}
              <Card>
                <CardHeader>
                  <CardTitle>Statut de vérification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Compte vérifié</h3>
                    <p className="text-center text-sm text-muted-foreground">
                      Votre magasin est entièrement fonctionnel
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Gérez toutes vos commandes et leur statut de livraison
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockAlerts && stockAlerts.length > 0 ? (
              stockAlerts.map((alert) => (
                <StockAlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground opacity-25 mb-2" />
                  <p className="text-muted-foreground mb-4">
                    Aucune alerte stock
                  </p>
                  <Button onClick={() => router.push("/merchant/catalog")}>
                    Gérer le catalogue
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Graphique des ventes */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution des ventes</CardTitle>
              </CardHeader>
              <CardContent>
                {salesChart && salesChart.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Données non disponibles
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Métriques détaillées */}
            <Card>
              <CardHeader>
                <CardTitle>Métriques clés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {currentStats?.averageOrderValue || 0}€
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Panier moyen
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {currentStats?.conversionRate || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Conversion</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {currentStats?.customerSatisfaction || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Satisfaction
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {currentStats?.lowStockItems || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Alertes stock
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => router.push("/merchant/stats")}
                >
                  Voir le rapport complet
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Indicateur de connexion temps réel */}
      {isConnected && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-3 py-1.5 rounded-full text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Temps réel actif
        </div>
      )}
    </div>
  );
}
