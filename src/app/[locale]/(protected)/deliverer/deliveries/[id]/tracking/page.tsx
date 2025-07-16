"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, MapPin, User, Clock, Phone, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function DelivererDeliveryTrackingPage() {
  const params = useParams();
  const deliveryId = params.id as string;
  const t = useTranslations("tracking");
  const [isClient, setIsClient] = useState(false);
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && deliveryId) {
      // Simuler le chargement des données
      setTimeout(() => {
        setDelivery({
          id: deliveryId,
          status: "IN_TRANSIT",
          client: {
            name: "Jean Dupont",
            phone: "06 12 34 56 78"
          },
          pickupAddress: "123 Rue de la Paix, Paris",
          deliveryAddress: "456 Avenue de la République, Lyon",
          validationCode: "123456"
        });
        setLoading(false);
      }, 1000);
    }
  }, [isClient, deliveryId]);

  if (!isClient) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto">
          <div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Chargement du suivi...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/deliverer/deliveries" passHref>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux livraisons
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Suivi de livraison - Vue livreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">
                  {delivery?.status}
                </Badge>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Informations du client</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{delivery?.client?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{delivery?.client?.phone}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Adresses</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <div>
                      <p className="text-sm text-muted-foreground">Collecte</p>
                      <p>{delivery?.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <div>
                      <p className="text-sm text-muted-foreground">Livraison</p>
                      <p>{delivery?.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {delivery?.validationCode && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Code de validation</h4>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{delivery.validationCode}</p>
                    <p className="text-sm text-blue-800">
                      Demandez ce code au destinataire pour confirmer la livraison.
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  La navigation GPS sera disponible prochainement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 