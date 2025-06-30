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
  Filter
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

interface DeliveryManagerProps {
  delivererId: string;
}

interface Delivery {
  id: string;
  announcementId: string;
  announcementTitle: string;
  clientName: string;
  clientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  price: number;
  validationCode?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
}

export default function DeliveryManager({ delivererId }: DeliveryManagerProps) {
  const t = useTranslations("deliverer.deliveries");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationCode, setValidationCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/deliverer/deliveries");
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const validateDelivery = async (deliveryId: string, code: string) => {
    try {
      const response = await fetch(`/api/deliverer/deliveries/${deliveryId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validationCode: code }),
      });

      if (response.ok) {
        toast.success(t("success.delivery_validated"));
        fetchDeliveries();
        setShowValidationDialog(false);
        setValidationCode("");
        setSelectedDelivery(null);
      } else {
        toast.error(t("error.validation_failed"));
      }
    } catch (error) {
      console.error("Error validating delivery:", error);
      toast.error(t("error.validation_failed"));
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [delivererId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      accepted: { color: "bg-blue-100 text-blue-800", label: t("status.accepted") },
      picked_up: { color: "bg-yellow-100 text-yellow-800", label: t("status.picked_up") },
      in_transit: { color: "bg-purple-100 text-purple-800", label: t("status.in_transit") },
      delivered: { color: "bg-green-100 text-green-800", label: t("status.delivered") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.accepted;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredDeliveries = deliveries.filter(delivery =>
    (delivery.announcement?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (delivery.announcement?.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (delivery.announcement?.pickupAddress || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeDeliveries = filteredDeliveries.filter(d => !["delivered", "cancelled"].includes(d.status));
  const completedDeliveries = filteredDeliveries.filter(d => ["delivered", "cancelled"].includes(d.status));

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
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              {t("filters.title")}
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
                  <p className="text-gray-600">{t("empty.active_description")}</p>
                </CardContent>
              </Card>
            ) : (
              activeDeliveries.map((delivery) => (
                <Card key={delivery.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{delivery.announcementTitle}</h3>
                          {getStatusBadge(delivery.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{t("client")}:</span>
                              <span>{delivery.clientName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a href={`tel:${delivery.clientPhone}`} className="text-blue-600 hover:underline">
                                {delivery.clientPhone}
                              </a>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{t("scheduled")}:</span>
                              <span>{new Date(delivery.scheduledDate).toLocaleDateString()} {delivery.scheduledTime}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm">
                                <span className="font-medium">{t("pickup")}:</span> {delivery.pickupAddress}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">{t("delivery")}:</span> {delivery.deliveryAddress}
                              </p>
                            </div>
                          </div>
                        </div>

                        {delivery.validationCode && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm font-medium text-yellow-800">
                              {t("validation.code")}: <span className="font-mono text-lg">{delivery.validationCode}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-lg font-semibold text-green-600">
                            {delivery.price.toFixed(2)}€
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {delivery.status === "accepted" && (
                          <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                            <Truck className="w-4 h-4 mr-1" />
                            {t("actions.pickup")}
                          </Button>
                        )}
                        
                        {delivery.status === "picked_up" && (
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            <Truck className="w-4 h-4 mr-1" />
                            {t("actions.in_transit")}
                          </Button>
                        )}
                        
                        {delivery.status === "in_transit" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedDelivery(delivery);
                              setShowValidationDialog(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t("actions.validate")}
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
                  <p className="text-gray-600">{t("empty.completed_description")}</p>
                </CardContent>
              </Card>
            ) : (
              completedDeliveries.map((delivery) => (
                <Card key={delivery.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{delivery.announcementTitle}</h3>
                          {getStatusBadge(delivery.status)}
                        </div>

                        <div className="text-sm text-gray-600">
                          <p><span className="font-medium">{t("client")}:</span> {delivery.clientName}</p>
                          <p><span className="font-medium">{t("pickup")}:</span> {delivery.pickupAddress}</p>
                          <p><span className="font-medium">{t("delivery")}:</span> {delivery.deliveryAddress}</p>
                        </div>

                        {delivery.actualDelivery && (
                          <p className="text-sm text-green-600">
                            {t("completed_at")}: {new Date(delivery.actualDelivery).toLocaleString()}
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
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("validation.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("validation.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t("validation.dialog.code_placeholder")}
              value={validationCode}
              onChange={(e) => setValidationCode(e.target.value)}
              className="text-center font-mono text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              {t("validation.dialog.cancel")}
            </Button>
            <Button
              onClick={() => selectedDelivery && validateDelivery(selectedDelivery.id, validationCode)}
              disabled={!validationCode.trim()}
            >
              {t("validation.dialog.validate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 