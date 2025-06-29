"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Activity, 
  MapPin, 
  Truck, 
  Clock, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Refresh,
  Phone,
  Navigation,
  Package,
  User,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeliveryMonitoringDashboardProps {
  adminId: string;
}

interface DeliveryStats {
  activeDeliveries: number;
  activeDeliverers: number;
  totalDeliverers: number;
  averageDeliveryTime: number;
  successRate: number;
  activeDeliveriesChange: number;
  pendingDeliveries: number;
  completedToday: number;
  cancelledToday: number;
  delayedDeliveries: number;
}

interface ActiveDelivery {
  id: string;
  announcementId: string;
  delivererId: string;
  delivererName: string;
  delivererPhone: string;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  createdAt: string;
  estimatedDeliveryTime: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdate: string;
  };
  priority: "low" | "medium" | "high" | "urgent";
  packageType: string;
  distance: number;
}

interface DeliveryIssue {
  id: string;
  deliveryId: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  type: "delay" | "lost" | "damaged" | "customer_complaint" | "deliverer_issue";
  createdAt: string;
  isResolved: boolean;
  delivererName?: string;
  clientName?: string;
}

interface DelivererLocation {
  delivererId: string;
  delivererName: string;
  latitude: number;
  longitude: number;
  status: string;
  currentDeliveryId?: string;
  lastUpdate: string;
  batteryLevel?: number;
  speed?: number;
}

export default function DeliveryMonitoringDashboard({ adminId }: DeliveryMonitoringDashboardProps) {
  const t = useTranslations("admin.deliveries.monitoring");
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [deliveryIssues, setDeliveryIssues] = useState<DeliveryIssue[]>([]);
  const [delivererLocations, setDelivererLocations] = useState<DelivererLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/deliveries/monitoring?adminId=${adminId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setActiveDeliveries(data.activeDeliveries || []);
        setDeliveryIssues(data.issues || []);
        setDelivererLocations(data.delivererLocations || []);
      }
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const resolveIssue = async (issueId: string) => {
    try {
      const response = await fetch(`/api/admin/deliveries/issues/${issueId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (response.ok) {
        setDeliveryIssues(deliveryIssues.map(issue => 
          issue.id === issueId ? { ...issue, isResolved: true } : issue
        ));
        toast.success(t("success.issue_resolved"));
      }
    } catch (error) {
      console.error("Error resolving issue:", error);
      toast.error(t("error.resolve_failed"));
    }
  };

  const contactDeliverer = async (delivererId: string, phone: string) => {
    try {
      const response = await fetch("/api/admin/deliveries/contact-deliverer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, delivererId }),
      });

      if (response.ok) {
        toast.success(t("success.contact_sent"));
      }
    } catch (error) {
      console.error("Error contacting deliverer:", error);
      toast.error(t("error.contact_failed"));
    }
  };

  const reassignDelivery = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/admin/deliveries/${deliveryId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (response.ok) {
        toast.success(t("success.delivery_reassigned"));
        fetchMonitoringData();
      }
    } catch (error) {
      console.error("Error reassigning delivery:", error);
      toast.error(t("error.reassign_failed"));
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [adminId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      accepted: { color: "bg-blue-100 text-blue-800", label: t("status.accepted") },
      picking_up: { color: "bg-purple-100 text-purple-800", label: t("status.picking_up") },
      in_transit: { color: "bg-orange-100 text-orange-800", label: t("status.in_transit") },
      delivered: { color: "bg-green-100 text-green-800", label: t("status.delivered") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") },
      failed: { color: "bg-red-100 text-red-800", label: t("status.failed") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: "bg-gray-100 text-gray-800", label: t("priority.low") },
      medium: { color: "bg-blue-100 text-blue-800", label: t("priority.medium") },
      high: { color: "bg-orange-100 text-orange-800", label: t("priority.high") },
      urgent: { color: "bg-red-100 text-red-800", label: t("priority.urgent") },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: { color: "bg-gray-100 text-gray-800", label: t("severity.low") },
      medium: { color: "bg-yellow-100 text-yellow-800", label: t("severity.medium") },
      high: { color: "bg-orange-100 text-orange-800", label: t("severity.high") },
      critical: { color: "bg-red-100 text-red-800", label: t("severity.critical") },
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.medium;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredDeliveries = activeDeliveries.filter(delivery => {
    const matchesSearch = delivery.delivererName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || delivery.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.active_deliveries")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDeliveries}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {stats.activeDeliveriesChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              {Math.abs(stats.activeDeliveriesChange)} {t("stats.since_yesterday")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.active_deliverers")}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDeliverers}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.out_of_total", { total: stats.totalDeliverers })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.avg_delivery_time")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageDeliveryTime}min</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.average_completion")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.success_rate")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.today_deliveries")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("stats.pending_deliveries")}</p>
                <p className="text-2xl font-bold">{stats.pendingDeliveries}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("stats.completed_today")}</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("stats.cancelled_today")}</p>
                <p className="text-2xl font-bold">{stats.cancelledToday}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("stats.delayed_deliveries")}</p>
                <p className="text-2xl font-bold">{stats.delayedDeliveries}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("control_panel.title")}</CardTitle>
            <Button onClick={fetchMonitoringData} size="sm">
              <Refresh className="w-4 h-4 mr-2" />
              {t("control_panel.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t("control_panel.search_placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("control_panel.filter_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all_statuses")}</SelectItem>
                <SelectItem value="pending">{t("status.pending")}</SelectItem>
                <SelectItem value="accepted">{t("status.accepted")}</SelectItem>
                <SelectItem value="picking_up">{t("status.picking_up")}</SelectItem>
                <SelectItem value="in_transit">{t("status.in_transit")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("control_panel.filter_priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all_priorities")}</SelectItem>
                <SelectItem value="urgent">{t("priority.urgent")}</SelectItem>
                <SelectItem value="high">{t("priority.high")}</SelectItem>
                <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                <SelectItem value="low">{t("priority.low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Monitoring Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">{t("tabs.active_deliveries")}</TabsTrigger>
          <TabsTrigger value="issues">{t("tabs.issues")}</TabsTrigger>
          <TabsTrigger value="locations">{t("tabs.deliverer_locations")}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredDeliveries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("active.no_deliveries_title")}
                </h3>
                <p className="text-gray-600">
                  {t("active.no_deliveries_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{t("delivery.id")}: {delivery.id}</h4>
                          {getStatusBadge(delivery.status)}
                          {getPriorityBadge(delivery.priority)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{t("delivery.deliverer")}:</span>
                              <span>{delivery.delivererName}</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-1">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{delivery.delivererPhone}</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{t("delivery.client")}:</span>
                              <span>{delivery.clientName}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{t("delivery.pickup")}:</span>
                            </div>
                            <p className="text-xs text-gray-600 ml-6 mb-2">{delivery.pickupAddress}</p>
                            
                            <div className="flex items-center space-x-2 mb-1">
                              <Navigation className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{t("delivery.destination")}:</span>
                            </div>
                            <p className="text-xs text-gray-600 ml-6">{delivery.deliveryAddress}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{t("delivery.created")}: {new Date(delivery.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{t("delivery.estimated")}: {new Date(delivery.estimatedDeliveryTime).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Navigation className="w-3 h-3" />
                            <span>{delivery.distance}km</span>
                          </div>
                        </div>

                        {delivery.currentLocation && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                            <span className="font-medium">{t("delivery.last_location")}:</span> 
                            {delivery.currentLocation.latitude}, {delivery.currentLocation.longitude}
                            <span className="ml-2 text-gray-500">
                              ({new Date(delivery.currentLocation.lastUpdate).toLocaleString()})
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => contactDeliverer(delivery.delivererId, delivery.delivererPhone)}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          {t("actions.contact")}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => reassignDelivery(delivery.id)}
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          {t("actions.reassign")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {deliveryIssues.filter(issue => !issue.isResolved).length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("issues.no_issues_title")}
                </h3>
                <p className="text-gray-600">
                  {t("issues.no_issues_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {deliveryIssues.filter(issue => !issue.isResolved).map((issue) => (
                <Card key={issue.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{issue.title}</h4>
                          {getSeverityBadge(issue.severity)}
                          <Badge variant="outline">{t(`issue_types.${issue.type}`)}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>{t("issues.delivery_id")}: {issue.deliveryId}</p>
                          {issue.delivererName && (
                            <p>{t("issues.deliverer")}: {issue.delivererName}</p>
                          )}
                          {issue.clientName && (
                            <p>{t("issues.client")}: {issue.clientName}</p>
                          )}
                          <p>{t("issues.reported")}: {new Date(issue.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => resolveIssue(issue.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t("actions.resolve")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {delivererLocations.map((location) => (
              <Card key={location.delivererId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{location.delivererName}</h4>
                      <Badge variant={location.status === "active" ? "default" : "secondary"}>
                        {t(`deliverer_status.${location.status}`)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{t("location.coordinates")}:</span>
                        <span className="text-xs">{location.latitude}, {location.longitude}</span>
                      </div>
                      
                      {location.currentDeliveryId && (
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span>{t("location.current_delivery")}:</span>
                          <span className="text-xs">{location.currentDeliveryId}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{t("location.last_update")}:</span>
                        <span className="text-xs">{new Date(location.lastUpdate).toLocaleString()}</span>
                      </div>
                      
                      {location.speed && (
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          <span>{t("location.speed")}:</span>
                          <span className="text-xs">{location.speed} km/h</span>
                        </div>
                      )}
                      
                      {location.batteryLevel && (
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span>{t("location.battery")}:</span>
                          <span className="text-xs">{location.batteryLevel}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}