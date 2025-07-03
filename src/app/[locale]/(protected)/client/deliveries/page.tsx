"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Search, 
  Clock, 
  MapPin, 
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import DeliveryValidation from "@/features/client/components/delivery-validation";

interface Delivery {
  id: string;
  status: string;
  announcement: {
    title: string;
    pickupAddress: string;
    deliveryAddress: string;
    price: number;
  };
  deliverer: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
        phone?: string;
      };
    };
  };
  ProofOfDelivery?: {
    photoUrl: string;
    notes: string;
    uploadedAt: string;
  };
  createdAt: string;
  scheduledAt: string;
  completedAt?: string;
}

export default function ClientDeliveriesPage() {
  const t = useTranslations("client.deliveries");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/deliveries");
      
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      } else {
        toast.error(t("error.fetch_failed"));
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "bg-gray-100 text-gray-800", label: "En attente" },
      ACCEPTED: { color: "bg-blue-100 text-blue-800", label: "Acceptée" },
      IN_TRANSIT: { color: "bg-yellow-100 text-yellow-800", label: "En cours de livraison" },
      DELIVERED: { color: "bg-green-100 text-green-800", label: "Livrée" },
      CANCELLED: { color: "bg-red-100 text-red-800", label: "Annulée" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (delivery.deliverer.user.profile?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (delivery.deliverer.user.profile?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesTab = activeTab === "active" 
      ? ["PENDING", "ACCEPTED", "IN_TRANSIT"].includes(delivery.status)
      : ["DELIVERED", "CANCELLED"].includes(delivery.status);
    
    return matchesSearch && matchesTab;
  });

  const activeDeliveries = deliveries.filter(d => ["PENDING", "ACCEPTED", "IN_TRANSIT"].includes(d.status));
  const completedDeliveries = deliveries.filter(d => ["DELIVERED", "CANCELLED"].includes(d.status));

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("page.title")}
        </h1>
        <p className="text-gray-600">
          {t("page.description")}
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{deliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">En cours</p>
                <p className="text-2xl font-bold">{activeDeliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Livrées</p>
                <p className="text-2xl font-bold">{completedDeliveries.filter(d => d.status === "DELIVERED").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Annulées</p>
                <p className="text-2xl font-bold">{completedDeliveries.filter(d => d.status === "CANCELLED").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche et filtres */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder={t("search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            {t("tabs.active")} ({activeDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            {t("tabs.history")} ({completedDeliveries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredDeliveries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("empty.no_active_deliveries")}
                </h3>
                <p className="text-gray-600">
                  {t("empty.active_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDeliveries.map((delivery) => (
              <DeliveryValidation
                key={delivery.id}
                delivery={delivery}
                onValidationComplete={fetchDeliveries}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {filteredDeliveries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("empty.no_completed_deliveries")}
                </h3>
                <p className="text-gray-600">
                  {t("empty.completed_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDeliveries.map((delivery) => (
              <Card key={delivery.id} className="border-l-4 border-l-gray-500">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      {delivery.announcement.title}
                    </span>
                    {getStatusBadge(delivery.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{t("pickup")}:</span>
                        <span>{delivery.announcement.pickupAddress}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{t("delivery")}:</span>
                        <span>{delivery.announcement.deliveryAddress}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{t("deliverer")}:</span>
                        <span>
                          {delivery.deliverer.user.profile ? (
                            `${delivery.deliverer.user.profile.firstName || 'Non renseigné'} ${delivery.deliverer.user.profile.lastName || 'Non renseigné'}`
                          ) : (
                            'Profil non disponible'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{t("completed_at")}:</span>
                        <span>
                          {delivery.completedAt 
                            ? new Date(delivery.completedAt).toLocaleDateString()
                            : new Date(delivery.createdAt).toLocaleDateString()
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preuve de livraison si disponible */}
                  {delivery.ProofOfDelivery && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Preuve de livraison
                      </h4>
                      
                      {delivery.ProofOfDelivery.photoUrl && (
                        <div className="mb-3">
                          <img 
                            src={delivery.ProofOfDelivery.photoUrl} 
                            alt="Preuve de livraison"
                            className="w-full max-w-md rounded-lg border"
                          />
                        </div>
                      )}
                      
                      {delivery.ProofOfDelivery.notes && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Notes:</strong> {delivery.ProofOfDelivery.notes}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Uploadé le: {new Date(delivery.ProofOfDelivery.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}