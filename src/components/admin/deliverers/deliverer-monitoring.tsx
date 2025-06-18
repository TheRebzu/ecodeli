"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Users, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Navigation,
  Phone,
  MessageSquare,
  Truck,
  Route,
  Timer,
  Zap
} from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate, formatDistance } from "@/lib/utils";

interface DelivererMetrics {
  totalDeliverers: number;
  activeDeliverers: number;
  onlineDeliverers: number;
  busyDeliverers: number;
  totalDeliveries: number;
  completedDeliveries: number;
  averageRating: number;
  averageDeliveryTime: number;
  totalDistance: number;
  todayDeliveries: number;
}

interface DelivererStatus {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ONLINE" | "OFFLINE" | "BUSY" | "INACTIVE";
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  activeDeliveries: number;
  todayDeliveries: number;
  rating: number;
  totalDeliveries: number;
  joinedDate: Date;
  lastActivity: Date;
  currentDelivery?: {
    id: string;
    pickupAddress: string;
    deliveryAddress: string;
    estimatedTime: number;
    startTime: Date;
  };
}

interface DelivererPerformance {
  id: string;
  name: string;
  completedDeliveries: number;
  averageTime: number;
  rating: number;
  onTimeRate: number;
  totalDistance: number;
  revenue: number;
}

export default function DelivererMonitoring() {
  const t = useTranslations("admin.monitoring");
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeliverer, setSelectedDeliverer] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Requêtes tRPC en temps réel
  const {
    data: delivererMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = api.admin.monitoring.getDelivererMetrics.useQuery();

  const {
    data: delivererStatuses = [],
    isLoading: statusesLoading,
    refetch: refetchStatuses
  } = api.admin.monitoring.getDelivererStatuses.useQuery({
    status: statusFilter !== "ALL" ? statusFilter as any : undefined,
    search: searchTerm || undefined,
  });

  const {
    data: delivererPerformance = [],
    isLoading: performanceLoading
  } = api.admin.monitoring.getDelivererPerformance.useQuery({
    period: "today",
  });

  // Mutations pour actions admin
  const sendMessageMutation = api.admin.monitoring.sendMessageToDeliverer.useMutation({
    onSuccess: () => {
      toast({
        title: t("message.sent"),
        description: t("message.sentSuccess"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDelivererStatusMutation = api.admin.monitoring.updateDelivererStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t("status.updated"),
        description: t("status.updatedSuccess"),
      });
      refetchStatuses();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Données par défaut
  const defaultMetrics: DelivererMetrics = {
    totalDeliverers: delivererStatuses.length || 0,
    activeDeliverers: delivererStatuses.filter(d => d.status !== "INACTIVE").length || 0,
    onlineDeliverers: delivererStatuses.filter(d => d.status === "ONLINE").length || 0,
    busyDeliverers: delivererStatuses.filter(d => d.status === "BUSY").length || 0,
    totalDeliveries: delivererStatuses.reduce((sum, d) => sum + d.totalDeliveries, 0) || 0,
    completedDeliveries: delivererStatuses.reduce((sum, d) => sum + d.todayDeliveries, 0) || 0,
    averageRating: delivererStatuses.reduce((sum, d) => sum + d.rating, 0) / delivererStatuses.length || 0,
    averageDeliveryTime: 28,
    totalDistance: 0,
    todayDeliveries: delivererStatuses.reduce((sum, d) => sum + d.todayDeliveries, 0) || 0,
  };

  const metrics = delivererMetrics || defaultMetrics;

  const getStatusBadge = (status: DelivererStatus["status"]) => {
    const statusConfig = {
      ONLINE: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: t("status.online") },
      OFFLINE: { color: "bg-gray-100 text-gray-800", icon: XCircle, label: t("status.offline") },
      BUSY: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: t("status.busy") },
      INACTIVE: { color: "bg-red-100 text-red-800", icon: AlertTriangle, label: t("status.inactive") },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchMetrics(), refetchStatuses()]);
    setIsRefreshing(false);
    toast({
      title: t("refresh.success"),
      description: t("refresh.dataUpdated"),
    });
  };

  const handleSendMessage = (delivererId: string, message: string) => {
    sendMessageMutation.mutate({ delivererId, message });
  };

  const handleStatusUpdate = (delivererId: string, status: DelivererStatus["status"]) => {
    updateDelivererStatusMutation.mutate({ delivererId, status });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  if (metricsLoading || statusesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("deliverers.title")}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("deliverers.title")}</h1>
          <p className="text-muted-foreground">{t("deliverers.description")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t("common.refresh")}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      {/* Métriques en temps réel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.totalDeliverers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalDeliverers}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.activeDeliverers} {t("metrics.active")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.onlineNow")}</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{metrics.onlineDeliverers}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.busyDeliverers} {t("metrics.busy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.todayDeliveries")}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.todayDeliveries}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(metrics.averageDeliveryTime)} {t("metrics.avgTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.averageRating")}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <p className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</p>
              <Star className="w-5 h-5 ml-1 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedDeliveries} {t("metrics.completedToday")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("deliverers.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("status.all")}</SelectItem>
            <SelectItem value="ONLINE">{t("status.online")}</SelectItem>
            <SelectItem value="BUSY">{t("status.busy")}</SelectItem>
            <SelectItem value="OFFLINE">{t("status.offline")}</SelectItem>
            <SelectItem value="INACTIVE">{t("status.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">{t("tabs.liveStatus")}</TabsTrigger>
          <TabsTrigger value="performance">{t("tabs.performance")}</TabsTrigger>
          <TabsTrigger value="location">{t("tabs.location")}</TabsTrigger>
          <TabsTrigger value="communication">{t("tabs.communication")}</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <div className="grid gap-4">
            {delivererStatuses.map((deliverer) => (
              <Card key={deliverer.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-medium">{deliverer.name}</h4>
                        <p className="text-sm text-muted-foreground">{deliverer.email}</p>
                      </div>
                      {getStatusBadge(deliverer.status)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4 mr-1" />
                        {t("actions.call")}
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {t("actions.message")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("deliverer.activeDeliveries")}</p>
                      <p className="font-semibold">{deliverer.activeDeliveries}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("deliverer.todayDeliveries")}</p>
                      <p className="font-semibold">{deliverer.todayDeliveries}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("deliverer.rating")}</p>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{deliverer.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("deliverer.lastActivity")}</p>
                      <p className="font-semibold">{formatDate(deliverer.lastActivity)}</p>
                    </div>
                  </div>

                  {deliverer.currentDelivery && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">{t("deliverer.currentDelivery")}</p>
                          <p className="text-sm text-blue-700">
                            {deliverer.currentDelivery.pickupAddress} → {deliverer.currentDelivery.deliveryAddress}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-700">{t("deliverer.estimatedTime")}</p>
                          <p className="font-medium text-blue-900">
                            {formatTime(deliverer.currentDelivery.estimatedTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {deliverer.currentLocation && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-600" />
                        <span className="text-sm text-gray-700">{deliverer.currentLocation.address}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("performance.dailyPerformance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {delivererPerformance.map((deliverer, index) => (
                  <div key={deliverer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{deliverer.name}</h4>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {deliverer.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-8 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{deliverer.completedDeliveries}</p>
                        <p className="text-muted-foreground">{t("performance.deliveries")}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{formatTime(deliverer.averageTime)}</p>
                        <p className="text-muted-foreground">{t("performance.avgTime")}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{deliverer.onTimeRate}%</p>
                        <p className="text-muted-foreground">{t("performance.onTime")}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{formatCurrency(deliverer.revenue)}</p>
                        <p className="text-muted-foreground">{t("performance.revenue")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                {t("location.realTimeTracking")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {delivererStatuses
                  .filter(d => d.currentLocation && d.status !== "OFFLINE")
                  .map((deliverer) => (
                  <div key={deliverer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${
                          deliverer.status === "ONLINE" ? "bg-green-500" : 
                          deliverer.status === "BUSY" ? "bg-yellow-500" : "bg-gray-400"
                        }`}></div>
                        {deliverer.status === "BUSY" && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{deliverer.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {deliverer.currentLocation?.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {deliverer.currentDelivery && (
                        <Badge variant="outline">
                          <Route className="w-3 h-3 mr-1" />
                          {t("location.enRoute")}
                        </Badge>
                      )}
                      <Button variant="outline" size="sm">
                        <Navigation className="w-4 h-4 mr-1" />
                        {t("location.track")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {t("communication.broadcastMessage")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("communication.recipients")}</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t("communication.selectRecipients")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("communication.allDeliverers")}</SelectItem>
                      <SelectItem value="online">{t("communication.onlineOnly")}</SelectItem>
                      <SelectItem value="active">{t("communication.activeDeliveries")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("communication.message")}</label>
                  <textarea 
                    className="w-full p-3 border rounded-md"
                    rows={4}
                    placeholder={t("communication.messagePlaceholder")}
                  />
                </div>
                <Button className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t("communication.sendMessage")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {t("communication.alerts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">{t("alerts.deliveryDelay")}</p>
                        <p className="text-sm text-red-700">Pierre M. - Commande #1234</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      {t("alerts.resolve")}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-900">{t("alerts.offlineDeliverer")}</p>
                        <p className="text-sm text-yellow-700">Marie L. - Hors ligne 2h</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      {t("alerts.contact")}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">{t("alerts.highDemand")}</p>
                        <p className="text-sm text-blue-700">Zone Centre-ville</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      {t("alerts.assignMore")}
                    </Button>
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
