"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Package, TrendingUp, DollarSign, AlertCircle, CheckCircle, 
  Clock, Star, FileText, CreditCard, MapPin, Calendar, BarChart3,
  Activity, Shield, Database, Zap, Globe, Settings
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AdminComprehensiveDashboardProps {
  adminId: string;
}

interface DashboardMetrics {
  users: {
    total: number;
    clients: number;
    providers: number;
    deliverers: number;
    merchants: number;
    newThisMonth: number;
    activeToday: number;
    growthRate: number;
  };
  
  business: {
    totalRevenue: number;
    monthlyRevenue: number;
    commissionsEarned: number;
    activeContracts: number;
    completedDeliveries: number;
    avgOrderValue: number;
    profitMargin: number;
  };
  
  operations: {
    pendingValidations: number;
    activeDeliveries: number;
    availableProviders: number;
    systemUptime: number;
    avgResponseTime: number;
    errorRate: number;
    supportTickets: number;
  };
  
  performance: {
    avgRating: number;
    totalReviews: number;
    customerSatisfaction: number;
    deliverySuccessRate: number;
    onTimeDeliveryRate: number;
    providerRetentionRate: number;
  };
  
  financial: {
    totalPayments: number;
    pendingPayments: number;
    refundsIssued: number;
    chargebackRate: number;
    processingFees: number;
    netProfit: number;
  };
}

interface RecentActivity {
  id: string;
  type: "user_registration" | "delivery_completed" | "payment_processed" | "issue_reported" | "contract_signed";
  description: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "success";
  userId?: string;
  amount?: number;
}

interface SystemAlert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  priority: "low" | "medium" | "high" | "critical";
}

export default function AdminComprehensiveDashboard({ adminId }: AdminComprehensiveDashboardProps) {
  const t = useTranslations("admin.dashboard");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [adminId, timeRange]);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, activityRes, alertsRes] = await Promise.all([
        fetch(`/api/admin/dashboard/metrics?adminId=${adminId}&timeRange=${timeRange}`),
        fetch(`/api/admin/dashboard/activity?adminId=${adminId}&limit=20`),
        fetch(`/api/admin/dashboard/alerts?adminId=${adminId}&unresolved=true`)
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }

      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data.activities || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setSystemAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadge = (priority: string) => {
    const priorityConfig = {
      critical: { color: "bg-red-100 text-red-800", label: t("priority.critical") },
      high: { color: "bg-orange-100 text-orange-800", label: t("priority.high") },
      medium: { color: "bg-yellow-100 text-yellow-800", label: t("priority.medium") },
      low: { color: "bg-blue-100 text-blue-800", label: t("priority.low") }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_registration":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "delivery_completed":
        return <Package className="h-4 w-4 text-green-500" />;
      case "payment_processed":
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case "issue_reported":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "contract_signed":
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  if (!metrics) {
    return <div className="flex justify-center p-8">{t("error_loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("description")}</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">{t("timeRange.24h")}</SelectItem>
                <SelectItem value="7d">{t("timeRange.7d")}</SelectItem>
                <SelectItem value="30d">{t("timeRange.30d")}</SelectItem>
                <SelectItem value="90d">{t("timeRange.90d")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchDashboardData}>
              {t("refresh")}
            </Button>
          </div>
        </div>
      </div>

      {/* Alertes critiques */}
      {systemAlerts.filter(alert => alert.priority === "critical").length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t("critical_alerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemAlerts.filter(alert => alert.priority === "critical").slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <span className="font-medium text-red-800">{alert.title}</span>
                  </div>
                  <Button size="sm" onClick={() => handleResolveAlert(alert.id)}>
                    {t("resolve")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
          <TabsTrigger value="business">{t("tabs.business")}</TabsTrigger>
          <TabsTrigger value="operations">{t("tabs.operations")}</TabsTrigger>
          <TabsTrigger value="financial">{t("tabs.financial")}</TabsTrigger>
          <TabsTrigger value="system">{t("tabs.system")}</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("metrics.total_users")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.users.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +{metrics.users.growthRate}% {t("this_month")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("metrics.monthly_revenue")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.business.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t("profit_margin")}: {metrics.business.profitMargin}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("metrics.active_deliveries")}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.operations.activeDeliveries}</div>
                <p className="text-xs text-muted-foreground">
                  {t("success_rate")}: {metrics.performance.deliverySuccessRate}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("metrics.avg_rating")}</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.performance.avgRating.toFixed(1)}/5</div>
                <Progress value={metrics.performance.avgRating * 20} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t("recent_activity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {activity.amount && (
                        <span className="text-sm font-medium">€{activity.amount}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("system_alerts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemAlerts.slice(0, 6).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getAlertIcon(alert.type)}
                        <div>
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-gray-500">{alert.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAlertBadge(alert.priority)}
                        {!alert.resolved && (
                          <Button size="sm" variant="outline" onClick={() => handleResolveAlert(alert.id)}>
                            {t("resolve")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("users.clients")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.users.clients.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("users.providers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.users.providers.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("users.deliverers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.users.deliverers.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("users.merchants")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.users.merchants.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("user_activity")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>{t("active_today")}:</span>
                    <span className="font-bold">{metrics.users.activeToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("new_this_month")}:</span>
                    <span className="font-bold">{metrics.users.newThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("growth_rate")}:</span>
                    <span className="font-bold text-green-600">+{metrics.users.growthRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("user_distribution")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{t("users.clients")}</span>
                      <span className="text-sm">{((metrics.users.clients / metrics.users.total) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(metrics.users.clients / metrics.users.total) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{t("users.providers")}</span>
                      <span className="text-sm">{((metrics.users.providers / metrics.users.total) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(metrics.users.providers / metrics.users.total) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{t("users.deliverers")}</span>
                      <span className="text-sm">{((metrics.users.deliverers / metrics.users.total) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(metrics.users.deliverers / metrics.users.total) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business */}
        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("business.total_revenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.business.totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("business.commissions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.business.commissionsEarned.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("business.active_contracts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.business.activeContracts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("business.completed_deliveries")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.business.completedDeliveries.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("business.avg_order_value")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.business.avgOrderValue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("business.profit_margin")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.business.profitMargin}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Opérations */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("operations.pending_validations")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.operations.pendingValidations}</div>
                {metrics.operations.pendingValidations > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {t("requires_attention")}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("operations.available_providers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.operations.availableProviders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("operations.system_uptime")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.operations.systemUptime}%</div>
                <Progress value={metrics.operations.systemUptime} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("operations.avg_response_time")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.operations.avgResponseTime}ms</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("operations.error_rate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.operations.errorRate}%</div>
                {metrics.operations.errorRate > 1 && (
                  <Badge variant="destructive" className="mt-2">
                    {t("high")}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("operations.support_tickets")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.operations.supportTickets}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financier */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("financial.total_payments")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.financial.totalPayments.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("financial.pending_payments")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.financial.pendingPayments.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("financial.refunds_issued")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.financial.refundsIssued.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("financial.chargeback_rate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.financial.chargebackRate}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("financial.processing_fees")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics.financial.processingFees.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("financial.net_profit")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">€{metrics.financial.netProfit.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Système */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {t("system_health")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>{t("uptime")}:</span>
                    <Badge className="bg-green-100 text-green-800">
                      {metrics.operations.systemUptime}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t("response_time")}:</span>
                    <span className="font-medium">{metrics.operations.avgResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t("error_rate")}:</span>
                    <span className="font-medium">{metrics.operations.errorRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t("quick_actions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    {t("manage_users")}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    {t("review_validations")}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t("financial_reports")}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    {t("system_settings")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}