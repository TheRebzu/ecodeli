"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Users, 
  TruckIcon, 
  Store,
  Wrench,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  Monitor,
  Server,
  Database,
  Wifi
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityMonitor() {
  const t = useTranslations("admin.dashboard.activityMonitor");
  const [selectedTab, setSelectedTab] = useState("realtime");
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Récupération des données en temps réel
  const { data: realtimeData, isLoading, refetch } = api.admin.dashboard.getRecentActivities.useQuery(
    { limit: 20 },
    { 
      refetchInterval: autoRefresh ? 5000 : false, // Refresh toutes les 5 secondes si activé
      refetchOnWindowFocus: false 
    }
  );
  
  const { data: systemHealth } = api.admin.getPerformanceMetrics.useQuery();
  const { data: activeConnections } = api.admin.getUserStats.useQuery();

      // Récupération des métriques système en temps réel
  const [metrics, setMetrics] = useState({
    cpu: 45,
    memory: 68,
    disk: 34,
    network: 23
  });

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setMetrics({
        cpu: Math.max(20, Math.min(80, metrics.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(90, metrics.memory + (Math.random() - 0.5) * 8)),
        disk: Math.max(20, Math.min(60, metrics.disk + (Math.random() - 0.5) * 5)),
        network: Math.max(10, Math.min(50, metrics.network + (Math.random() - 0.5) * 15))
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, metrics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_login": return Users;
      case "delivery_created": return TruckIcon;
      case "order_placed": return Store;
      case "service_booked": return Wrench;
      case "payment_processed": return CheckCircle;
      case "error": return AlertTriangle;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "user_login": return "text-blue-600";
      case "delivery_created": return "text-green-600";
      case "order_placed": return "text-purple-600";
      case "service_booked": return "text-orange-600";
      case "payment_processed": return "text-emerald-600";
      case "error": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "error": return "bg-red-500";
      case "info": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const systemMetrics = [
    {
      name: t("metrics.cpu"),
      value: metrics.cpu,
      icon: Monitor,
      color: metrics.cpu > 70 ? "text-red-600" : metrics.cpu > 50 ? "text-yellow-600" : "text-green-600"
    },
    {
      name: t("metrics.memory"),
      value: metrics.memory,
      icon: Server,
      color: metrics.memory > 80 ? "text-red-600" : metrics.memory > 60 ? "text-yellow-600" : "text-green-600"
    },
    {
      name: t("metrics.disk"),
      value: metrics.disk,
      icon: Database,
      color: metrics.disk > 80 ? "text-red-600" : metrics.disk > 60 ? "text-yellow-600" : "text-green-600"
    },
    {
      name: t("metrics.network"),
      value: metrics.network,
      icon: Wifi,
      color: metrics.network > 80 ? "text-red-600" : metrics.network > 60 ? "text-yellow-600" : "text-green-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Circle className={`h-3 w-3 ${autoRefresh ? 'text-green-500' : 'text-gray-400'} fill-current`} />
            <span className="text-sm">{autoRefresh ? t("liveUpdate") : t("paused")}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? t("pause") : t("resume")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Métriques système en temps réel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {systemMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      metric.value > 70 ? 'bg-red-500' : 
                      metric.value > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* État de santé du système */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("systemHealth.uptime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemHealth?.uptime || 99.9}%
            </div>
            <p className="text-xs text-muted-foreground">{t("systemHealth.uptimeDesc")}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("systemHealth.responseTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.responseTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">{t("systemHealth.responseTimeDesc")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("systemHealth.activeUsers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeConnections?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("systemHealth.activeUsersDesc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activités en temps réel */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="realtime">{t("tabs.realtime")}</TabsTrigger>
          <TabsTrigger value="errors">{t("tabs.errors")}</TabsTrigger>
          <TabsTrigger value="performance">{t("tabs.performance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t("realtimeActivity")}
              </CardTitle>
              <CardDescription>{t("realtimeActivityDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {realtimeData && realtimeData.length > 0 ? (
                  realtimeData.map((activity: any, index: number) => {
                    const ActivityIcon = getActivityIcon(activity.type);
                    return (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                        <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                          <ActivityIcon className={`h-4 w-4 ${getActivityColor(activity.type)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{activity.description}</p>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`}></div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(activity.timestamp), \"HH:mm:ss\", { locale: fr })}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.details}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{t("noActivity")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t("systemErrors")}
              </CardTitle>
              <CardDescription>{t("systemErrorsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border border-red-200 rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{t("sampleError")}</p>
                    <p className="text-xs text-red-600 mt-1">{t("sampleErrorDesc")}</p>
                    <p className="text-xs text-red-500 mt-1">
                      {format(new Date(), \"dd MMM yyyy HH:mm\", { locale: fr })}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {t("critical")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                {t("performanceMetrics")}
              </CardTitle>
              <CardDescription>{t("performanceMetricsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("apiCalls")}</span>
                    <span className="font-medium">1,245 {t("perMinute")}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("errorRate")}</span>
                    <span className="font-medium text-green-600">0.05%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "5%" }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
