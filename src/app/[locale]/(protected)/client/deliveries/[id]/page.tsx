"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Package, 
  MapPin, 
  User,
  Clock,
  Phone,
  Mail,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Truck,
  Navigation
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface DeliveryDetails {
  id: string;
  announcementId: string;
  announcementTitle: string;
  status: string;
  delivererName: string | null;
  delivererPhone: string | null;
  delivererEmail: string | null;
  delivererAvatar: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledDate: string | null;
  price: number;
  validationCode: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  instructions: string | null;
  packageDetails: {
    description: string;
    weight: number | null;
    dimensions: string | null;
    fragile: boolean;
  } | null;
  proofOfDelivery: {
    id: string;
    photos: string[];
    notes: string | null;
    recipientName: string | null;
    validatedWithCode: boolean;
    validatedWithNFC: boolean;
    uploadedAt: string | null;
  } | null;
  createdAt: string;
  history: Array<{
    status: string;
    timestamp: string;
    message: string;
    location?: string;
  }>;
}

export default function DeliveryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("client.deliveries");
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchDeliveryDetails();
    }
  }, [params.id]);

  const fetchDeliveryDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client/deliveries/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setDelivery(data);
      } else {
        console.error("API Error:", response.status, response.statusText);
        const errorData = await response.text();
        console.error("Error response:", errorData);
        toast.error(`Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching delivery details:", error);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "bg-gray-100 text-gray-800", label: "En attente", icon: Clock },
      ACCEPTED: { color: "bg-blue-100 text-blue-800", label: "Acceptée", icon: CheckCircle },
      IN_TRANSIT: { color: "bg-yellow-100 text-yellow-800", label: "En cours", icon: Truck },
      DELIVERED: { color: "bg-green-100 text-green-800", label: "Livrée", icon: CheckCircle },
      CANCELLED: { color: "bg-red-100 text-red-800", label: "Annulée", icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des détails...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Livraison non trouvée</h1>
          <p className="text-gray-600 mb-6">Cette livraison n'existe pas ou a été supprimée.</p>
          <Link href="/fr/client/deliveries">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux livraisons
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push("/fr/client/deliveries")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {delivery.announcementTitle}
          </h1>
          <p className="text-gray-600">
            Livraison #{delivery.id.slice(-8)}
          </p>
        </div>
        {getStatusBadge(delivery.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations de livraison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informations de livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Point de collecte</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-600">{delivery.pickupAddress}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Point de livraison</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-600">{delivery.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {delivery.scheduledDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Date programmée</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {new Date(delivery.scheduledDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Prix</p>
                    <p className="text-lg font-bold text-green-600">{delivery.price}€</p>
                  </div>
                </div>
              </div>

              {delivery.instructions && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Instructions spéciales</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {delivery.instructions}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Détails du colis */}
          {delivery.packageDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Détails du colis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-600">{delivery.packageDetails.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {delivery.packageDetails.weight && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Poids</p>
                      <p className="text-sm text-gray-600">{delivery.packageDetails.weight} kg</p>
                    </div>
                  )}
                  
                  {delivery.packageDetails.dimensions && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Dimensions</p>
                      <p className="text-sm text-gray-600">{delivery.packageDetails.dimensions}</p>
                    </div>
                  )}
                </div>
                
                {delivery.packageDetails.fragile && (
                  <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Colis fragile</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preuve de livraison */}
          {delivery.proofOfDelivery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Preuve de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {delivery.proofOfDelivery.photos && delivery.proofOfDelivery.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {delivery.proofOfDelivery.photos.map((photo, index) => (
                        <img 
                          key={index}
                          src={photo} 
                          alt={`Preuve de livraison ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {delivery.proofOfDelivery.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Notes du livreur</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {delivery.proofOfDelivery.notes}
                    </p>
                  </div>
                )}
                
                {delivery.proofOfDelivery.recipientName && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Remis à</p>
                    <p className="text-sm text-gray-600">{delivery.proofOfDelivery.recipientName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {["ACCEPTED", "IN_TRANSIT"].includes(delivery.status) && (
                <Link href={`/fr/client/deliveries/${delivery.id}/tracking`} className="block">
                  <Button className="w-full flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Suivre en temps réel
                  </Button>
                </Link>
              )}
              
              {delivery.delivererPhone && ["ACCEPTED", "IN_TRANSIT"].includes(delivery.status) && (
                <Button 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  onClick={() => window.open(`tel:${delivery.delivererPhone}`, '_self')}
                >
                  <Phone className="w-4 h-4" />
                  Appeler le livreur
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informations livreur */}
          {delivery.delivererName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Votre livreur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {delivery.delivererAvatar ? (
                    <img 
                      src={delivery.delivererAvatar} 
                      alt={delivery.delivererName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{delivery.delivererName}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-gray-600">4.8 (127 avis)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Code de validation */}
          {delivery.status === "IN_TRANSIT" && delivery.validationCode && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  Code de validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700 mb-3">
                  Donnez ce code au livreur pour confirmer la réception
                </p>
                <div className="bg-white border border-yellow-300 rounded-lg p-4 text-center">
                  <p className="text-2xl font-mono font-bold text-yellow-900">
                    {delivery.validationCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {delivery.history.map((event, index) => (
                  <div key={index} className="flex gap-3 pb-3 last:pb-0 border-b last:border-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{event.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-400">{event.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 