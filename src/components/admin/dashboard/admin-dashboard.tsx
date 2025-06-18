"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/system/use-socket";
import { api } from "@/trpc/react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area} from "recharts";

// Icons
import {
  RefreshCw,
  DownloadIcon,
  Users,
  Truck,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  BarChart3,
  Settings,
  Shield,
  Database,
  Monitor,
  Bell,
  FileText,
  Eye,
  UserCheck,
  UserX,
  Sparkles,
  Home,
  Star,
  MapPin,
  Calendar,
  Euro,
  Target,
  Zap,
  AlertCircle,
  Plus,
  Search} from "lucide-react";
import { toast } from "sonner";

// Types
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalDeliveries: number;
  activeDeliveries: number;
  completedToday: number;
  pendingVerifications: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  commissionEarned: number;
  revenueGrowth: number;
  platformHealth: number;
  systemAlerts: number;
}

interface Alert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  timestamp: string;
  isResolved: boolean;
}

interface DashboardOverviewProps {
  className?: string;
}

// Utility function
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Composant de carte de statistique
const AdminStatCard = ({
  title,
  value,
  icon,
  trend,
  isLoading = false,
  onClick,
  color = "text-primary",
  bgColor = "bg-primary/10",
  subtitle}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  onClick?: () => void;
  color?: string;
  bgColor?: string;
  subtitle?: string;
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
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
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

// Composant d'alerte
const AlertCard = ({
  alert,
  onResolve}: {
  alert: Alert;
  onResolve: (id: string) => void;
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case "high":
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "medium":
        return <Bell className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card className={cn("border-l-4", getSeverityColor(alert.severity))}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getSeverityIcon(alert.severity)}
            <div className="flex-1">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {alert.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(alert.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                alert.severity === "critical" ? "destructive" : "secondary"
              }
            >
              {alert.severity}
            </Badge>
            {!alert.isResolved && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResolve(alert.id)}
              >
                Résoudre
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Actions rapides admin
const AdminQuickActions = () => {
  const router = useRouter();

  const quickActions = [
    {
      icon: <UserCheck className="h-5 w-5" />,
      label: "Vérifications",
      description: "Valider les documents",
      action: () => router.push("/admin/verifications"),
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50",
      badge: "5 en attente"},
    {
      icon: <Shield className="h-5 w-5" />,
      label: "Sécurité",
      description: "Logs et audit",
      action: () => router.push("/admin/audit"),
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/50"},
    {
      icon: <Settings className="h-5 w-5" />,
      label: "Configuration",
      description: "Paramètres système",
      action: () => router.push("/admin/settings"),
      color: "text-green-600 bg-green-100 dark:bg-green-900/50"},
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Rapports",
      description: "Analytics avancés",
      action: () => router.push("/admin/reports"),
      color: "text-orange-600 bg-orange-100 dark:bg-orange-900/50"}];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Actions administrateur
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex-col p-4 space-y-2 relative"
              onClick={action.action}
            >
              {action.badge && (
                <Badge
                  className="absolute -top-1 -right-1 text-xs px-1 py-0"
                  variant="destructive"
                >
                  {action.badge}
                </Badge>
              )}
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

export function DashboardOverview({ className }: DashboardOverviewProps) {
  const router = useRouter();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState("overview");
  const [realtimeStats, setRealtimeStats] =
    useState<Partial<AdminStats> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date() });

  // Queries pour récupérer les données
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard} = api.adminDashboard.getDashboardData.useQuery();

  const { data: recentActivities, isLoading: isLoadingActivities } =
    api.adminDashboard.getRecentActivities.useQuery({ limit: 10  });

  const { data: actionItems, isLoading: isLoadingActions } =
    api.adminDashboard.getActionItems.useQuery();

  // Socket.io pour les mises à jour temps réel
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    // Écouter les nouvelles alertes système
    socket.on("admin:new:alert", (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      toast.error(`Nouvelle alerte: ${alert.title}`);
    });

    // Écouter les mises à jour de stats
    socket.on("admin:stats:update", (data) => {
      setRealtimeStats(data);
    });

    // Écouter les événements critiques
    socket.on("admin:critical:event", (event) => {
      toast.error(`Événement critique: ${event.message}`);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("admin:new:alert");
      socket.off("admin:stats:update");
      socket.off("admin:critical:event");
    };
  }, [socket]);

  const handleRefresh = () => {
    refetchDashboard();
    toast.success("Données actualisées");
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/export/dashboard-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          activeTab })});

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-overview-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Export réussi");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, isResolved: true } : alert,
      ),
    );
    toast.success("Alerte résolue");
  };

  const isLoading =
    isLoadingDashboard || isLoadingActivities || isLoadingActions;

  // Statistiques calculées à partir des données réelles
  const currentStats: AdminStats = {
    totalUsers: dashboardData?.userStats?.total || 0,
    activeUsers: dashboardData?.userStats?.active || 0,
    newUsersToday: dashboardData?.userStats?.newToday || 0,
    newUsersWeek: dashboardData?.userStats?.newWeek || 0,
    totalDeliveries: dashboardData?.deliveryStats?.total || 0,
    activeDeliveries: dashboardData?.deliveryStats?.active || 0,
    completedToday: dashboardData?.deliveryStats?.completedToday || 0,
    pendingVerifications: dashboardData?.documentStats?.pending || 0,
    monthlyRevenue: dashboardData?.transactionStats?.monthlyRevenue || 0,
    dailyRevenue: dashboardData?.transactionStats?.dailyRevenue || 0,
    commissionEarned: dashboardData?.transactionStats?.commissionEarned || 0,
    revenueGrowth: dashboardData?.transactionStats?.growth || 0,
    platformHealth: 98,
    systemAlerts: alerts.filter((a) => !a.isResolved).length};

  // Récupérer les données réelles depuis l'API
  const { data: analyticsData, isLoading: analyticsLoading } =
    api.admin.analytics.getDashboardOverview.useQuery();
  const { data: alertsData } = api.admin.system.getAlerts.useQuery();
  const { data: activityData } =
    api.admin.analytics.getRecentActivity.useQuery();

  const overviewData = {
    activityChart: analyticsData?.activityChart || [],
    alerts: alertsData?.alerts || [],
    recentActivity: activityData?.recentActivity || []};

  // Récupérer les données réelles des différentes sections
  const { data: deliveryAnalytics } =
    api.admin.analytics.getDeliveryStats.useQuery();
  const { data: userAnalytics } = api.admin.analytics.getUserStats.useQuery();
  const { data: financialAnalytics } =
    api.admin.analytics.getFinancialData.useQuery();
  const { data: announcementAnalytics } =
    api.admin.analytics.getAnnouncementStats.useQuery();

  const deliveryData = {
    statusDistribution: deliveryAnalytics?.statusDistribution || []};

  const userData = {
    signupTrend: userAnalytics?.signupTrend || [],
    usersByRole: userAnalytics?.usersByRole || [],
    totalUsers: userAnalytics?.totalUsers || 0,
    pendingVerifications: userAnalytics?.pendingVerifications || 0,
    approvedVerifications: userAnalytics?.approvedVerifications || 0,
    rejectedVerifications: userAnalytics?.rejectedVerifications || 0};

  const financialData = {
    revenueChart: financialAnalytics?.revenueChart || [],
    monthlyRevenue: financialAnalytics?.monthlyRevenue || 0,
    monthlyCommissions: financialAnalytics?.monthlyCommissions || 0,
    revenueGrowth: financialAnalytics?.revenueGrowth || 0};

  const announcementData = {
    creationTrend: announcementAnalytics?.creationTrend || []};

  // Fonctions utilitaires
  const generateChartColors = (length: number): string[] => {
    const colors = [
      "#3b82f6",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4"];
    return colors.slice(0, length);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"}).format(value);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec actions */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Administrateur
          </h1>
          <p className="text-muted-foreground">
            Supervision globale de la plateforme EcoDeli
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Alertes critiques */}
      {alerts.filter(
        (a) =>
          !a.isResolved && (a.severity === "critical" || a.severity === "high"),
      ).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertes système critiques</AlertTitle>
          <AlertDescription>
            {
              alerts.filter(
                (a) =>
                  !a.isResolved &&
                  (a.severity === "critical" || a.severity === "high"),
              ).length
            }{" "}
            alerte(s) nécessitent votre attention immédiate.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => setActiveTab("alerts")}
            >
              Voir les alertes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Cartes de statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Utilisateurs Total"
          value={currentStats.totalUsers.toLocaleString()}
          subtitle={`${currentStats.newUsersToday} nouveaux aujourd'hui`}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 12, label: "vs semaine dernière" }}
          isLoading={isLoading}
          onClick={() => router.push("/admin/users")}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/50"
        />

        <AdminStatCard
          title="Livraisons Actives"
          value={currentStats.activeDeliveries}
          subtitle={`${currentStats.completedToday} terminées aujourd'hui`}
          icon={<Truck className="h-5 w-5" />}
          isLoading={isLoading}
          onClick={() => router.push("/admin/deliveries")}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/50"
        />

        <AdminStatCard
          title="Revenus Mensuel"
          value={`${currentStats.monthlyRevenue.toLocaleString()}€`}
          subtitle={`${currentStats.dailyRevenue}€ aujourd'hui`}
          icon={<Euro className="h-5 w-5" />}
          trend={{
            value: currentStats.revenueGrowth,
            label: "vs mois dernier"}}
          isLoading={isLoading}
          onClick={() => router.push("/admin/finance")}
          color="text-purple-600"
          bgColor="bg-purple-100 dark:bg-purple-900/50"
        />

        <AdminStatCard
          title="Santé Plateforme"
          value={`${currentStats.platformHealth}%`}
          subtitle={`${currentStats.systemAlerts} alertes actives`}
          icon={<Monitor className="h-5 w-5" />}
          isLoading={isLoading}
          onClick={() => setActiveTab("system")}
          color="text-orange-600"
          bgColor="bg-orange-100 dark:bg-orange-900/50"
        />
      </div>

      {/* Actions rapides */}
      <AdminQuickActions />

      {/* Onglets pour différentes vues */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="deliveries">Livraisons</TabsTrigger>
          <TabsTrigger value="announcements">Annonces</TabsTrigger>
          <TabsTrigger value="finance">Finances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Activité générale */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activité Générale
                </CardTitle>
                <CardDescription>
                  Évolution des métriques clés sur les 30 derniers jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {overviewData?.activityChart && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overviewData.activityChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="users"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="deliveries"
                          stroke="#22c55e"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="announcements"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statut des livraisons */}
            <Card>
              <CardHeader>
                <CardTitle>Statut des Livraisons</CardTitle>
                <CardDescription>Répartition actuelle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {deliveryData?.statusDistribution && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deliveryData.statusDistribution}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label
                        >
                          {deliveryData.statusDistribution.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  generateChartColors(
                                    deliveryData.statusDistribution.length,
                                  )[index]
                                }
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {deliveryData?.statusDistribution?.map((status, index) => (
                    <div
                      key={status.status}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: generateChartColors(
                              deliveryData.statusDistribution.length,
                            )[index]}}
                        />
                        <span>{status.status}</span>
                      </div>
                      <Badge variant="outline">{status.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertes et problèmes */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alertes Actives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overviewData?.alerts?.map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            alert.severity === "high"
                              ? "bg-red-500"
                              : alert.severity === "medium"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          alert.severity === "high"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>Aucune alerte active</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Activité Récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overviewData?.recentActivity?.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-6 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Croissance des Utilisateurs</CardTitle>
                <CardDescription>Inscriptions sur 30 jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {userData?.signupTrend && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userData.signupTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="signups"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par Rôle</CardTitle>
                <CardDescription>Utilisateurs actifs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userData?.usersByRole?.map((role, index) => (
                    <div
                      key={role.role}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium">{role.role}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(role.count / (userData.totalUsers || 1)) * 100}%`,
                              backgroundColor: generateChartColors(
                                userData.usersByRole.length,
                              )[index]}}
                          />
                        </div>
                        <Badge variant="outline">{role.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérifications</CardTitle>
                <CardDescription>Statut des documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">En attente</span>
                    <Badge variant="secondary">
                      {userData?.pendingVerifications || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Approuvées</span>
                    <Badge variant="default">
                      {userData?.approvedVerifications || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rejetées</span>
                    <Badge variant="destructive">
                      {userData?.rejectedVerifications || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Statut des Livraisons
                </CardTitle>
                <CardDescription>Répartition par statut</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deliveryData.statusDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métriques Livraisons</CardTitle>
                <CardDescription>Aujourd'hui</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Actives</p>
                    <p className="text-2xl font-bold">
                      {currentStats.activeDeliveries}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Terminées</p>
                    <p className="text-xl font-semibold">
                      {currentStats.completedToday}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-xl font-semibold">
                      {currentStats.totalDeliveries.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Créations d'Annonces
                </CardTitle>
                <CardDescription>Tendance sur 7 jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={announcementData.creationTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="created"
                        stroke="#f59e0b"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Annonces Actives</CardTitle>
                <CardDescription>Statut actuel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Publiées</span>
                    <Badge variant="default">156</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">En cours</span>
                    <Badge variant="secondary">89</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Terminées</span>
                    <Badge variant="outline">234</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Évolution des Revenus
                </CardTitle>
                <CardDescription>
                  Revenus et commissions sur 30 jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {financialData?.revenueChart && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialData.revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stackId="1"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="commissions"
                          stackId="1"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicateurs Financiers</CardTitle>
                <CardDescription>Résumé mensuel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Revenus bruts
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(financialData?.monthlyRevenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commissions</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(financialData?.monthlyCommissions || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Revenus nets
                    </p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(
                        (financialData?.monthlyRevenue || 0) -
                          (financialData?.monthlyCommissions || 0),
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Croissance</p>
                    <p
                      className={`text-lg font-semibold ${
                        (financialData?.revenueGrowth || 0) > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {financialData?.revenueGrowth > 0 ? "+" : ""}
                      {financialData?.revenueGrowth?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
