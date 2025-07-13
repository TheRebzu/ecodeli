"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Package,
  MapPin,
  Clock,
  User,
  Phone,
  MessageSquare,
  Camera,
  CheckCircle,
  AlertCircle,
  Navigation,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AdvancedDeliveryManagerProps {
  delivererId: string;
}

interface Delivery {
  id: string;
  announcementId: string;
  title: string;
  status: "assigned" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  pickupAddress: string;
  deliveryAddress: string;
  clientName: string;
  clientPhone: string;
  estimatedDuration: number;
  actualPrice: number;
  scheduledDate: string;
  validationCode?: string;
  specialInstructions?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  trackingEvents: TrackingEvent[];
}

interface TrackingEvent {
  id: string;
  type:
    | "assigned"
    | "started"
    | "picked_up"
    | "in_transit"
    | "delivered"
    | "issue";
  timestamp: string;
  location?: string;
  description: string;
  photo?: string;
}

export default function AdvancedDeliveryManager({
  delivererId,
}: AdvancedDeliveryManagerProps) {
  const t = useTranslations("deliverer.deliveries");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );
  const [validationCode, setValidationCode] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    fetchDeliveries();
    getCurrentLocation();
  }, [delivererId]);

  const fetchDeliveries = async () => {
    try {
      const response = await fetch(
        `/api/deliverer/deliveries?delivererId=${delivererId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Error getting location:", error),
      );
    }
  };

  const handleStartDelivery = async (deliveryId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delivererId,
            location: currentLocation,
          }),
        },
      );

      if (response.ok) {
        await fetchDeliveries();
      }
    } catch (error) {
      console.error("Error starting delivery:", error);
    }
  };

  const handlePickupConfirmation = async (deliveryId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/pickup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delivererId,
            location: currentLocation,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (response.ok) {
        await fetchDeliveries();
      }
    } catch (error) {
      console.error("Error confirming pickup:", error);
    }
  };

  const handleDeliveryValidation = async (deliveryId: string) => {
    if (!validationCode.trim()) return;

    try {
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delivererId,
            validationCode: validationCode.trim(),
            location: currentLocation,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (response.ok) {
        await fetchDeliveries();
        setValidationCode("");
        setSelectedDelivery(null);
      } else {
        const error = await response.json();
        alert(error.message || "Code de validation invalide");
      }
    } catch (error) {
      console.error("Error validating delivery:", error);
    }
  };

  const handleReportIssue = async (deliveryId: string) => {
    if (!issueDescription.trim()) return;

    try {
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/issue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delivererId,
            description: issueDescription,
            location: currentLocation,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (response.ok) {
        await fetchDeliveries();
        setIssueDescription("");
      }
    } catch (error) {
      console.error("Error reporting issue:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      assigned: {
        color: "bg-blue-100 text-blue-800",
        label: t("status.assigned"),
      },
      picked_up: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("status.picked_up"),
      },
      in_transit: {
        color: "bg-orange-100 text-orange-800",
        label: t("status.in_transit"),
      },
      delivered: {
        color: "bg-green-100 text-green-800",
        label: t("status.delivered"),
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        label: t("status.cancelled"),
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getActionButton = (delivery: Delivery) => {
    switch (delivery.status) {
      case "assigned":
        return (
          <Button onClick={() => handleStartDelivery(delivery.id)}>
            {t("actions.start_delivery")}
          </Button>
        );
      case "picked_up":
        return (
          <Button onClick={() => handlePickupConfirmation(delivery.id)}>
            {t("actions.confirm_pickup")}
          </Button>
        );
      case "in_transit":
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedDelivery(delivery)}>
                {t("actions.validate_delivery")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("validation_dialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("validation_dialog.description")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="validationCode">
                    {t("validation_dialog.code_label")}
                  </Label>
                  <Input
                    id="validationCode"
                    value={validationCode}
                    onChange={(e) => setValidationCode(e.target.value)}
                    placeholder={t("validation_dialog.code_placeholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => handleDeliveryValidation(delivery.id)}>
                  {t("validation_dialog.confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
          <TabsTrigger value="completed">{t("tabs.completed")}</TabsTrigger>
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {deliveries
            .filter((d) =>
              ["assigned", "picked_up", "in_transit"].includes(d.status),
            )
            .map((delivery) => (
              <Card key={delivery.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {delivery.title}
                      </CardTitle>
                      <CardDescription>
                        {delivery.announcementId}
                      </CardDescription>
                    </div>
                    {getStatusBadge(delivery.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          {t("pickup")}: {delivery.pickupAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-600" />
                        <span className="text-sm">
                          {t("delivery")}: {delivery.deliveryAddress}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm">{delivery.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{delivery.clientPhone}</span>
                      </div>
                    </div>
                  </div>

                  {delivery.specialInstructions && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>{t("special_instructions")}:</strong>{" "}
                        {delivery.specialInstructions}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        {t("price")}: €{delivery.actualPrice}
                      </span>
                      <span className="text-sm">
                        {t("duration")}: {delivery.estimatedDuration}min
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {t("actions.contact_client")}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Navigation className="h-4 w-4 mr-1" />
                        {t("actions.navigate")}
                      </Button>
                      {getActionButton(delivery)}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {t("actions.report_issue")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("issue_dialog.title")}</DialogTitle>
                          <DialogDescription>
                            {t("issue_dialog.description")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="issueDescription">
                              {t("issue_dialog.description_label")}
                            </Label>
                            <Textarea
                              id="issueDescription"
                              value={issueDescription}
                              onChange={(e) =>
                                setIssueDescription(e.target.value)
                              }
                              placeholder={t(
                                "issue_dialog.description_placeholder",
                              )}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => handleReportIssue(delivery.id)}
                          >
                            {t("issue_dialog.submit")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {delivery.trackingEvents.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">
                        {t("tracking_events")}
                      </h4>
                      <div className="space-y-2">
                        {delivery.trackingEvents.slice(-3).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                            <span>-</span>
                            <span>{event.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {deliveries
            .filter((d) => d.status === "delivered")
            .map((delivery) => (
              <Card key={delivery.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{delivery.title}</CardTitle>
                    {getStatusBadge(delivery.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {delivery.pickupAddress} → {delivery.deliveryAddress}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">€{delivery.actualPrice}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      {t("completed_at")}:{" "}
                      {delivery.completedAt
                        ? new Date(delivery.completedAt).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{delivery.title}</CardTitle>
                  {getStatusBadge(delivery.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">
                      {delivery.pickupAddress} → {delivery.deliveryAddress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">€{delivery.actualPrice}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(delivery.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {deliveries.filter((d) =>
        ["assigned", "picked_up", "in_transit"].includes(d.status),
      ).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
            <p className="text-gray-600 text-center">
              {t("empty.description")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
