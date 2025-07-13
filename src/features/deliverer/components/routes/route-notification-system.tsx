"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import {
  Route,
  Bell,
  BellRing,
  MapPin,
  Navigation,
  Clock,
  Calendar,
  Plus,
  Edit,
  Delete,
  CheckCircle,
  XCircle,
  AlertCircle,
  Car,
  Bike,
  Truck,
  Settings,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface RouteNotificationSystemProps {
  delivererId: string;
}

interface DelivererRoute {
  id: string;
  name: string;
  description?: string;
  startPoint: string;
  endPoint: string;
  waypoints: RouteWaypoint[];
  scheduledDays: string[]; // ['MONDAY', 'TUESDAY', etc.]
  startTime: string;
  endTime: string;
  vehicleType: "CAR" | "BIKE" | "SCOOTER" | "TRUCK" | "WALKING";
  maxCapacity: number;
  isActive: boolean;
  notificationsEnabled: boolean;
  radiusKm: number; // Rayon de notification autour de la route
  createdAt: string;
  lastUsed?: string;
}

interface RouteWaypoint {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  estimatedTime: string;
  order: number;
}

interface RouteNotification {
  id: string;
  routeId: string;
  announcementId: string;
  announcementTitle: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: number;
  estimatedPrice: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  matchPercentage: number;
  createdAt: string;
  isRead: boolean;
  action?: "ACCEPTED" | "DECLINED" | "IGNORED";
}

interface NotificationSettings {
  enabled: boolean;
  minMatchPercentage: number;
  maxDistance: number;
  minPrice: number;
  priorities: string[];
  soundEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export default function RouteNotificationSystem({
  delivererId,
}: RouteNotificationSystemProps) {
  const t = useTranslations("deliverer.routes.notifications");
  const [routes, setRoutes] = useState<DelivererRoute[]>([]);
  const [notifications, setNotifications] = useState<RouteNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    minMatchPercentage: 70,
    maxDistance: 5,
    minPrice: 10,
    priorities: ["HIGH", "URGENT"],
    soundEnabled: true,
    emailEnabled: false,
    smsEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<DelivererRoute | null>(null);
  const [routeForm, setRouteForm] = useState({
    name: "",
    description: "",
    startPoint: "",
    endPoint: "",
    scheduledDays: [] as string[],
    startTime: "",
    endTime: "",
    vehicleType: "CAR",
    maxCapacity: 5,
    radiusKm: 3,
  });

  useEffect(() => {
    fetchData();
    // Configurer les notifications en temps réel
    if (settings.enabled) {
      setupRealTimeNotifications();
    }
  }, [delivererId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routesRes, notificationsRes, settingsRes] = await Promise.all([
        fetch(`/api/deliverer/routes?delivererId=${delivererId}`),
        fetch(`/api/deliverer/routes/notifications?delivererId=${delivererId}`),
        fetch(
          `/api/deliverer/routes/notification-settings?delivererId=${delivererId}`,
        ),
      ]);

      if (routesRes.ok) {
        const data = await routesRes.json();
        setRoutes(data.routes || []);
      }

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data.notifications || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({ ...settings, ...data.settings });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t("error.fetch_failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeNotifications = () => {
    // Configuration WebSocket pour les notifications en temps réel
    if (typeof window !== "undefined" && "WebSocket" in window) {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/deliverer/${delivererId}/route-notifications`,
      );

      ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        handleNewNotification(notification);
      };

      return () => ws.close();
    }
  };

  const handleNewNotification = (notification: RouteNotification) => {
    setNotifications((prev) => [notification, ...prev]);

    // Jouer le son si activé
    if (settings.soundEnabled) {
      playNotificationSound();
    }

    // Notification push du navigateur
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(t("new_match_title"), {
        body: t("new_match_description", {
          title: notification.announcementTitle,
          match: notification.matchPercentage,
        }),
        icon: "/icons/ecodeli-192.png",
      });
    }

    // Toast notification
    toast({
      title: t("new_match_title"),
      description: t("new_match_description", {
        title: notification.announcementTitle,
        match: notification.matchPercentage,
      }),
    });
  };

  const playNotificationSound = () => {
    const audio = new Audio("/sounds/route-notification.mp3");
    audio.play().catch(() => {
      // Gérer l'erreur silencieusement (autoplay policy)
    });
  };

  const saveRoute = async () => {
    try {
      const routeData = {
        ...routeForm,
        delivererId,
        isActive: true,
        notificationsEnabled: true,
      };

      const url = editingRoute
        ? `/api/deliverer/routes/${editingRoute.id}`
        : "/api/deliverer/routes";

      const method = editingRoute ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeData),
      });

      if (response.ok) {
        toast({
          title: editingRoute
            ? t("success.route_updated")
            : t("success.route_created"),
          description: t("success.route_saved_desc"),
        });
        setShowRouteDialog(false);
        setEditingRoute(null);
        setRouteForm({
          name: "",
          description: "",
          startPoint: "",
          endPoint: "",
          scheduledDays: [],
          startTime: "",
          endTime: "",
          vehicleType: "CAR",
          maxCapacity: 5,
          radiusKm: 3,
        });
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to save route");
      }
    } catch (error) {
      toast({
        title: t("error.save_failed"),
        description:
          error instanceof Error ? error.message : t("error.generic"),
        variant: "destructive",
      });
    }
  };

  const deleteRoute = async (routeId: string) => {
    try {
      const response = await fetch(`/api/deliverer/routes/${routeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivererId }),
      });

      if (response.ok) {
        toast({
          title: t("success.route_deleted"),
          description: t("success.route_deleted_desc"),
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: t("error.delete_failed"),
        variant: "destructive",
      });
    }
  };

  const respondToNotification = async (
    notificationId: string,
    action: "ACCEPTED" | "DECLINED",
  ) => {
    try {
      const response = await fetch(
        `/api/deliverer/routes/notifications/${notificationId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delivererId, action }),
        },
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, action, isRead: true } : n,
          ),
        );

        if (action === "ACCEPTED") {
          toast({
            title: t("success.notification_accepted"),
            description: t("success.notification_accepted_desc"),
          });
        }
      }
    } catch (error) {
      toast({
        title: t("error.response_failed"),
        variant: "destructive",
      });
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };

      const response = await fetch(
        "/api/deliverer/routes/notification-settings",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delivererId, settings: updatedSettings }),
        },
      );

      if (response.ok) {
        setSettings(updatedSettings);
        toast({
          title: t("success.settings_updated"),
          description: t("success.settings_updated_desc"),
        });
      }
    } catch (error) {
      toast({
        title: t("error.settings_failed"),
        variant: "destructive",
      });
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "CAR":
        return <Car className="h-4 w-4" />;
      case "BIKE":
        return <Bike className="h-4 w-4" />;
      case "TRUCK":
        return <Truck className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeRoutes = routes.filter((r) => r.isActive);
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
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
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("stats.active_routes")}
                </p>
                <p className="text-2xl font-bold">{activeRoutes.length}</p>
              </div>
              <Route className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("stats.new_notifications")}
                </p>
                <p className="text-2xl font-bold">
                  {unreadNotifications.length}
                </p>
              </div>
              <BellRing className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("stats.notifications_enabled")}
                </p>
                <p className="text-2xl font-bold">
                  {settings.enabled ? t("yes") : t("no")}
                </p>
              </div>
              <Bell className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {t("stats.match_threshold")}
                </p>
                <p className="text-2xl font-bold">
                  {settings.minMatchPercentage}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => setShowRouteDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("actions.add_route")}
        </Button>
        <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
          <Settings className="h-4 w-4 mr-2" />
          {t("actions.settings")}
        </Button>
      </div>

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="routes">{t("tabs.my_routes")}</TabsTrigger>
          <TabsTrigger value="notifications">
            {t("tabs.notifications")}
            {unreadNotifications.length > 0 && (
              <Badge className="ml-2 bg-red-500">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          {routes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("routes.empty_title")}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t("routes.empty_description")}
                </p>
                <Button onClick={() => setShowRouteDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("actions.add_first_route")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map((route) => (
                <Card
                  key={route.id}
                  className={`${route.isActive ? "border-green-200" : "border-gray-200"}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(route.vehicleType)}
                        <CardTitle className="text-lg">{route.name}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={route.isActive ? "default" : "secondary"}
                        >
                          {route.isActive
                            ? t("status.active")
                            : t("status.inactive")}
                        </Badge>
                        {route.notificationsEnabled && (
                          <Badge variant="outline">
                            <Bell className="h-3 w-3 mr-1" />
                            {t("status.notifications_on")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {route.description && (
                      <p className="text-sm text-gray-600">
                        {route.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{t("route.start")}:</span>
                        <span className="text-gray-600">
                          {route.startPoint}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-red-600" />
                        <span className="font-medium">{t("route.end")}:</span>
                        <span className="text-gray-600">{route.endPoint}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">
                          {t("route.schedule")}:
                        </span>
                        <span className="text-gray-600">
                          {route.startTime} - {route.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">{t("route.days")}:</span>
                        <span className="text-gray-600">
                          {route.scheduledDays
                            .map((day) => t(`days.${day.toLowerCase()}`))
                            .join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        {t("route.radius")}: {route.radiusKm}km •{" "}
                        {t("route.capacity")}: {route.maxCapacity}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRoute(route);
                            setRouteForm({
                              name: route.name,
                              description: route.description || "",
                              startPoint: route.startPoint,
                              endPoint: route.endPoint,
                              scheduledDays: route.scheduledDays,
                              startTime: route.startTime,
                              endTime: route.endTime,
                              vehicleType: route.vehicleType,
                              maxCapacity: route.maxCapacity,
                              radiusKm: route.radiusKm,
                            });
                            setShowRouteDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRoute(route.id)}
                        >
                          <Delete className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {route.lastUsed && (
                      <div className="text-xs text-gray-500">
                        {t("route.last_used")}: {formatDate(route.lastUsed)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("notifications.empty_title")}
                </h3>
                <p className="text-gray-600">
                  {t("notifications.empty_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`${!notification.isRead ? "border-l-4 border-l-blue-500 bg-blue-50" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {notification.announcementTitle}
                          </h4>
                          <Badge
                            className={getPriorityColor(notification.priority)}
                          >
                            {t(
                              `priority.${notification.priority.toLowerCase()}`,
                            )}
                          </Badge>
                          <Badge variant="outline">
                            {notification.matchPercentage}% {t("match")}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
                                {t("pickup")}:
                              </span>
                            </div>
                            <p className="text-gray-600 ml-6">
                              {notification.pickupAddress}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Navigation className="h-4 w-4 text-red-600" />
                              <span className="font-medium">
                                {t("delivery")}:
                              </span>
                            </div>
                            <p className="text-gray-600 ml-6">
                              {notification.deliveryAddress}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {t("distance")}: {notification.distance}km
                          </span>
                          <span className="font-semibold">
                            {t("price")}: {notification.estimatedPrice}€
                          </span>
                          <span>
                            {t("received")}:{" "}
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                      </div>

                      {!notification.action && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() =>
                              respondToNotification(notification.id, "ACCEPTED")
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t("actions.accept")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              respondToNotification(notification.id, "DECLINED")
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {t("actions.decline")}
                          </Button>
                        </div>
                      )}

                      {notification.action && (
                        <Badge
                          className={
                            notification.action === "ACCEPTED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {notification.action === "ACCEPTED" ? (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          {t(`actions.${notification.action.toLowerCase()}`)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog pour ajouter/modifier une route */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRoute
                ? t("route_dialog.edit_title")
                : t("route_dialog.add_title")}
            </DialogTitle>
            <DialogDescription>
              {t("route_dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t("route_dialog.name")}</Label>
                <Input
                  id="name"
                  value={routeForm.name}
                  onChange={(e) =>
                    setRouteForm({ ...routeForm, name: e.target.value })
                  }
                  placeholder={t("route_dialog.name_placeholder")}
                />
              </div>
              <div>
                <Label htmlFor="vehicleType">
                  {t("route_dialog.vehicle_type")}
                </Label>
                <Select
                  value={routeForm.vehicleType}
                  onValueChange={(value) =>
                    setRouteForm({ ...routeForm, vehicleType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAR">{t("vehicles.car")}</SelectItem>
                    <SelectItem value="BIKE">{t("vehicles.bike")}</SelectItem>
                    <SelectItem value="SCOOTER">
                      {t("vehicles.scooter")}
                    </SelectItem>
                    <SelectItem value="TRUCK">{t("vehicles.truck")}</SelectItem>
                    <SelectItem value="WALKING">
                      {t("vehicles.walking")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">
                {t("route_dialog.description")}
              </Label>
              <Textarea
                id="description"
                value={routeForm.description}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, description: e.target.value })
                }
                placeholder={t("route_dialog.description_placeholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startPoint">
                  {t("route_dialog.start_point")}
                </Label>
                <Input
                  id="startPoint"
                  value={routeForm.startPoint}
                  onChange={(e) =>
                    setRouteForm({ ...routeForm, startPoint: e.target.value })
                  }
                  placeholder={t("route_dialog.start_placeholder")}
                />
              </div>
              <div>
                <Label htmlFor="endPoint">{t("route_dialog.end_point")}</Label>
                <Input
                  id="endPoint"
                  value={routeForm.endPoint}
                  onChange={(e) =>
                    setRouteForm({ ...routeForm, endPoint: e.target.value })
                  }
                  placeholder={t("route_dialog.end_placeholder")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startTime">
                  {t("route_dialog.start_time")}
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={routeForm.startTime}
                  onChange={(e) =>
                    setRouteForm({ ...routeForm, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endTime">{t("route_dialog.end_time")}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={routeForm.endTime}
                  onChange={(e) =>
                    setRouteForm({ ...routeForm, endTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="radiusKm">{t("route_dialog.radius")}</Label>
                <Input
                  id="radiusKm"
                  type="number"
                  min="1"
                  max="50"
                  value={routeForm.radiusKm}
                  onChange={(e) =>
                    setRouteForm({
                      ...routeForm,
                      radiusKm: parseInt(e.target.value) || 3,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRouteDialog(false)}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={saveRoute}>
              {editingRoute ? t("actions.update") : t("actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog des paramètres */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("settings_dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">
                  {t("settings.notifications_enabled")}
                </Label>
                <p className="text-sm text-gray-600">
                  {t("settings.notifications_enabled_desc")}
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  updateSettings({ enabled: checked })
                }
              />
            </div>

            <div>
              <Label htmlFor="minMatch">
                {t("settings.min_match_percentage")}:{" "}
                {settings.minMatchPercentage}%
              </Label>
              <Input
                id="minMatch"
                type="range"
                min="50"
                max="100"
                value={settings.minMatchPercentage}
                onChange={(e) =>
                  updateSettings({
                    minMatchPercentage: parseInt(e.target.value),
                  })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="maxDistance">
                {t("settings.max_distance")}: {settings.maxDistance}km
              </Label>
              <Input
                id="maxDistance"
                type="range"
                min="1"
                max="20"
                value={settings.maxDistance}
                onChange={(e) =>
                  updateSettings({ maxDistance: parseInt(e.target.value) })
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="minPrice">
                {t("settings.min_price")}: {settings.minPrice}€
              </Label>
              <Input
                id="minPrice"
                type="range"
                min="5"
                max="100"
                value={settings.minPrice}
                onChange={(e) =>
                  updateSettings({ minPrice: parseInt(e.target.value) })
                }
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">
                  {t("settings.sound_enabled")}
                </Label>
                <p className="text-sm text-gray-600">
                  {t("settings.sound_enabled_desc")}
                </p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) =>
                  updateSettings({ soundEnabled: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)}>
              {t("actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
