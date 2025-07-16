"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, MapPin, User, Clock, Phone, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function DeliveryTrackingPage() {
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
          deliverer: {
            name: "Marie Martin",
            phone: "06 98 76 54 32"
          },
          pickupAddress: "123 Rue de la Paix, Paris",
          deliveryAddress: "456 Avenue de la République, Lyon"
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
          <Link href="/client/deliveries" passHref>
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
              Suivi de livraison
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
                <h4 className="font-medium mb-2">Informations du livreur</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{delivery?.deliverer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{delivery?.deliverer?.phone}</span>
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

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  La carte de suivi en temps réel sera disponible prochainement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
