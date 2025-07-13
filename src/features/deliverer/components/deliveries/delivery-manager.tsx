"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  Truck,
  AlertCircle,
  Search,
  Filter,
  MessageCircle,
  Play,
  Pause,
  X,
  Camera,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DeliveryProofUpload from "../delivery-proof-upload";
import DeliveryCancelDialog from "../delivery-cancel-dialog";

interface DeliveryManagerProps {
  delivererId: string;
}

interface Delivery {
  id: string;
  status: string;
  pickupDate?: string;
  deliveryDate?: string;
  actualDeliveryDate?: string;
  price: number;
  delivererFee: number;
  platformFee: number;
  insuranceFee: number;
  createdAt: string;
  updatedAt: string;

  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    basePrice: number;
    finalPrice: number;
    currency: string;
    isUrgent: boolean;
    pickupAddress: string;
    deliveryAddress: string;

    client: {
      id: string;
      name: string;
      avatar?: string;
      phone?: string;
    };
  };

  payment?: {
    amount: number;
    status: string;
    paidAt?: string;
  };

  proofOfDelivery?: any;
  tracking?: any[];
}

export default function DeliveryManager({ delivererId }: DeliveryManagerProps) {
  const t = useTranslations("deliverer.deliveries");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelDeliveryId, setCancelDeliveryId] = useState<string | null>(null);
  const [validationCode, setValidationCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showProofUploadDialog, setShowProofUploadDialog] = useState(false);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching deliveries...");

      const response = await fetch("/api/deliverer/deliveries");
      console.log("📡 Fetch response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📦 Fetched deliveries data:", data);
        console.log("📋 Number of deliveries:", data.deliveries?.length || 0);

        if (data.deliveries && data.deliveries.length > 0) {
          console.log(
            "📊 Delivery statuses:",
            data.deliveries.map((d: any) => ({
              id: d.id,
              status: d.status,
            })),
          );
        }

        setDeliveries(data.deliveries || []);
      } else {
        console.error("❌ Failed to fetch deliveries:", response.status);
        const errorData = await response.json();
        console.error("❌ Error data:", errorData);
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    try {
      setActionLoading(deliveryId);
      console.log(`🔄 Updating delivery ${deliveryId} to status: ${status}`);

      // Utiliser l'API existante pour mettre à jour le statut
      let endpoint = "";
      let method = "PUT";

      switch (status) {
        case "picked_up":
          endpoint = `/api/deliverer/deliveries/${deliveryId}/pickup`;
          method = "POST";
          break;
        case "in_transit":
          endpoint = `/api/deliverer/deliveries/${deliveryId}/start`;
          method = "POST";
          break;
        default:
          endpoint = `/api/deliverer/deliveries/${deliveryId}/status`;
          method = "PUT";
      }

      console.log(`📡 Calling API: ${method} ${endpoint}`);

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      console.log(`📡 API Response status: ${response.status}`);

      if (response.ok) {
        const responseData = await response.json();
        console.log(`✅ Status update successful:`, responseData);
        toast.success(t(`success.status_updated_${status}`));

        // Force refresh the deliveries data
        console.log(`🔄 Refreshing deliveries data...`);
        await fetchDeliveries();
        console.log(`✅ Deliveries data refreshed`);
      } else {
        const errorData = await response.json();
        console.error(`❌ Status update failed:`, errorData);
        toast.error(errorData.error || t("error.status_update_failed"));
      }
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error(t("error.status_update_failed"));
    } finally {
      setActionLoading(null);
    }
  };

  const validateDelivery = async (deliveryId: string, code: string) => {
    try {
      setActionLoading(deliveryId);
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            validationCode: code,
            deliveryProof: {
              notes: "Livraison validée par le livreur",
            },
          }),
        },
      );

      if (response.ok) {
        toast.success(t("success.delivery_validated"));
        fetchDeliveries();
        setShowValidationDialog(false);
        setValidationCode("");
        setSelectedDelivery(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("error.validation_failed"));
      }
    } catch (error) {
      console.error("Error validating delivery:", error);
      toast.error(t("error.validation_failed"));
    } finally {
      setActionLoading(null);
    }
  };

  const cancelDelivery = async (deliveryId: string) => {
    try {
      setActionLoading(deliveryId);
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        toast.success(t("success.delivery_cancelled"));
        fetchDeliveries();
        setShowCancelDialog(false);
        setSelectedDelivery(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("error.cancel_failed"));
      }
    } catch (error) {
      console.error("Error cancelling delivery:", error);
      toast.error(t("error.cancel_failed"));
    } finally {
      setActionLoading(null);
    }
  };

  const contactClient = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowContactDialog(true);
  };

  useEffect(() => {
    fetchDeliveries();
  }, [delivererId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      accepted: {
        color: "bg-blue-100 text-blue-800",
        label: t("status.accepted"),
      },
      picked_up: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("status.picked_up"),
      },
      in_transit: {
        color: "bg-purple-100 text-purple-800",
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

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.accepted;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredDeliveries = deliveries.filter(
    (delivery) =>
      (delivery.announcement.title || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (delivery.announcement.client.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (delivery.announcement.pickupAddress || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const activeDeliveries = filteredDeliveries.filter(
    (d) => !["DELIVERED", "CANCELLED"].includes(d.status),
  );
  const completedDeliveries = filteredDeliveries.filter((d) =>
    ["DELIVERED", "CANCELLED"].includes(d.status),
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                {t("filters.title")}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchDeliveries}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Actualiser
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder={t("filters.search_placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              {t("tabs.active")} ({activeDeliveries.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t("tabs.completed")} ({completedDeliveries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeDeliveries.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("empty.no_active_deliveries")}
                  </h3>
                  <p className="text-gray-600">
                    {t("empty.active_description")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeDeliveries.map((delivery) => (
                <Card
                  key={delivery.id}
                  className="border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">
                            {delivery.announcement.title}
                          </h3>
                          {getStatusBadge(delivery.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">
                                {t("client")}:
                              </span>
                              <span>{delivery.announcement.client.name}</span>
                            </div>
                            {delivery.announcement.client.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <a
                                  href={`tel:${delivery.announcement.client.phone}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {delivery.announcement.client.phone}
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {delivery.pickupDate && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">
                                  {t("scheduled")}:
                                </span>
                                <span>
                                  {new Date(
                                    delivery.pickupDate,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm">
                                <span className="font-medium">
                                  {t("pickup")}:
                                </span>{" "}
                                {delivery.announcement.pickupAddress}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">
                                  {t("delivery")}:
                                </span>{" "}
                                {delivery.announcement.deliveryAddress}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-lg font-semibold text-green-600">
                            {delivery.price.toFixed(2)}€
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {/* Debug: Status = {delivery.status} */}
                        <div className="text-xs text-gray-500 mb-2">
                          Debug: Status = {delivery.status}
                        </div>

                        {/* Contact Client Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => contactClient(delivery)}
                          disabled={actionLoading === delivery.id}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {t("actions.contact")}
                        </Button>

                        {/* Test Button - Always visible */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log(
                              "Test button clicked for delivery:",
                              delivery.id,
                              "Status:",
                              delivery.status,
                            );
                            toast.info(`Status: ${delivery.status}`);
                          }}
                        >
                          Test Action
                        </Button>

                        {/* Status-specific actions */}
                        {/* Debug: Status = {delivery.status} */}
                        {(delivery.status === "accepted" ||
                          delivery.status === "ACCEPTED") && (
                          <>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <Package className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  Livraison acceptée
                                </span>
                              </div>
                              <p className="text-xs text-blue-700">
                                Rendez-vous à l'adresse de collecte pour
                                récupérer le colis
                              </p>
                            </div>

                            <Button
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700 w-full"
                              onClick={() =>
                                updateDeliveryStatus(delivery.id, "picked_up")
                              }
                              disabled={actionLoading === delivery.id}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              {actionLoading === delivery.id
                                ? "Mise à jour..."
                                : "Colis récupéré"}
                            </Button>
                          </>
                        )}

                        {(delivery.status === "picked_up" ||
                          delivery.status === "PICKED_UP") && (
                          <>
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <Truck className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-800">
                                  Colis récupéré
                                </span>
                              </div>
                              <p className="text-xs text-purple-700">
                                Démarrez la livraison vers l'adresse de
                                destination
                              </p>
                            </div>

                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 w-full"
                              onClick={() =>
                                updateDeliveryStatus(delivery.id, "in_transit")
                              }
                              disabled={actionLoading === delivery.id}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              {actionLoading === delivery.id
                                ? "Démarrage..."
                                : "Démarrer la livraison"}
                            </Button>
                          </>
                        )}

                        {(delivery.status === "in_transit" ||
                          delivery.status === "IN_TRANSIT" ||
                          delivery.status === "IN_PROGRESS") && (
                          <>
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                  Livraison en cours
                                </span>
                              </div>
                              <p className="text-xs text-yellow-700">
                                Demandez le code de validation au client pour
                                confirmer la livraison
                              </p>
                            </div>

                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 w-full mb-2"
                              onClick={() => {
                                setSelectedDelivery(delivery);
                                setShowValidationDialog(true);
                              }}
                              disabled={actionLoading === delivery.id}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Valider avec code client
                            </Button>

                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedDelivery(delivery);
                                  setShowProofUploadDialog(true);
                                }}
                                disabled={actionLoading === delivery.id}
                              >
                                <Camera className="w-4 h-4 mr-1" />
                                Photo
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedDelivery(delivery);
                                  setShowCancelDialog(true);
                                }}
                                disabled={actionLoading === delivery.id}
                              >
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Problème
                              </Button>
                            </div>
                          </>
                        )}

                        {/* Cancel Button for active deliveries */}
                        {[
                          "accepted",
                          "ACCEPTED",
                          "picked_up",
                          "PICKED_UP",
                          "in_transit",
                          "IN_TRANSIT",
                          "IN_PROGRESS",
                        ].includes(delivery.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setCancelDeliveryId(delivery.id);
                              setShowCancelDialog(true);
                            }}
                            disabled={actionLoading === delivery.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t("actions.cancel")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedDeliveries.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("empty.no_completed_deliveries")}
                  </h3>
                  <p className="text-gray-600">
                    {t("empty.completed_description")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedDeliveries.map((delivery) => (
                <Card
                  key={delivery.id}
                  className="border-l-4 border-l-green-500"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">
                            {delivery.announcement.title}
                          </h3>
                          {getStatusBadge(delivery.status)}
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>
                            <span className="font-medium">{t("client")}:</span>{" "}
                            {delivery.announcement.client.name}
                          </p>
                          <p>
                            <span className="font-medium">{t("pickup")}:</span>{" "}
                            {delivery.announcement.pickupAddress}
                          </p>
                          <p>
                            <span className="font-medium">
                              {t("delivery")}:
                            </span>{" "}
                            {delivery.announcement.deliveryAddress}
                          </p>
                        </div>

                        {delivery.actualDeliveryDate && (
                          <p className="text-sm text-green-600">
                            {t("completed_at")}:{" "}
                            {new Date(
                              delivery.actualDeliveryDate,
                            ).toLocaleString()}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-lg font-semibold text-green-600">
                            {delivery.price.toFixed(2)}€
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(delivery.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {/* Debug: Status = {delivery.status} */}
                        <div className="text-xs text-gray-500 mb-2">
                          Debug: Status = {delivery.status}
                        </div>

                        {/* Test Button - Always visible */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log(
                              "Test button clicked for completed delivery:",
                              delivery.id,
                              "Status:",
                              delivery.status,
                            );
                            toast.info(
                              `Livraison terminée - Status: ${delivery.status}`,
                            );
                          }}
                        >
                          Test Action
                        </Button>

                        {/* Contact Client Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => contactClient(delivery)}
                          disabled={actionLoading === delivery.id}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {t("actions.contact")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Validation Dialog */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              Validation de livraison
            </DialogTitle>
            <DialogDescription>
              Demandez le code de validation à 6 chiffres au client et
              saisissez-le ci-dessous pour confirmer la livraison
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Client</span>
                </div>
                <p className="text-sm">
                  {selectedDelivery.announcement.client.name}
                </p>
                <p className="text-xs text-blue-700">
                  {selectedDelivery.announcement.deliveryAddress}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Code de validation du client (6 chiffres)
                </label>
                <Input
                  placeholder="000000"
                  value={validationCode}
                  onChange={(e) =>
                    setValidationCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center font-mono text-2xl tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500">
                  Le client doit vous donner ce code pour confirmer qu'il a bien
                  reçu sa livraison
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowValidationDialog(false);
                setValidationCode("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() =>
                selectedDelivery &&
                validateDelivery(selectedDelivery.id, validationCode)
              }
              disabled={
                !validationCode.trim() ||
                validationCode.length !== 6 ||
                actionLoading === selectedDelivery?.id
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === selectedDelivery?.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Validation...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider la livraison
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Client Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contact.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("contact.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDelivery && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">
                    {selectedDelivery.announcement.client.name}
                  </span>
                </div>
                {selectedDelivery.announcement.client.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a
                      href={`tel:${selectedDelivery.announcement.client.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedDelivery.announcement.client.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContactDialog(false)}
            >
              {t("contact.dialog.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Delivery Dialog */}
      <DeliveryCancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        deliveryId={cancelDeliveryId || ""}
        onCancelComplete={() => {
          setShowCancelDialog(false);
          setCancelDeliveryId(null);
          fetchDeliveries();
        }}
      />

      {/* Proof Upload Dialog */}
      <Dialog
        open={showProofUploadDialog}
        onOpenChange={setShowProofUploadDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload de preuve de livraison</DialogTitle>
            <DialogDescription>
              Ajoutez une photo et des notes pour prouver la livraison
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDelivery && (
              <DeliveryProofUpload
                deliveryId={selectedDelivery.id}
                onUploadComplete={() => {
                  setShowProofUploadDialog(false);
                  setSelectedDelivery(null);
                  fetchDeliveries();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
