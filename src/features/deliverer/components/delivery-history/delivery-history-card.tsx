import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  PackageIcon,
  TruckIcon,
  MapPinIcon,
  EuroIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeliveryHistory } from "@/features/deliverer/hooks/useDeliveryHistory";
import Link from "next/link";

interface DeliveryHistoryCardProps {
  delivery: DeliveryHistory;
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusLabels = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  IN_TRANSIT: "En cours",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

const typeLabels = {
  PACKAGE_DELIVERY: "Livraison de colis",
  PERSON_TRANSPORT: "Transport de personne",
  AIRPORT_TRANSFER: "Transfert aéroport",
  SHOPPING: "Courses",
  INTERNATIONAL_PURCHASE: "Achat international",
  PET_SITTING: "Garde d'animal",
  HOME_SERVICE: "Service à domicile",
  CART_DROP: "Lâcher de chariot",
};

export function DeliveryHistoryCard({ delivery }: DeliveryHistoryCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <CalendarIcon className="h-4 w-4" />;
      case "ACCEPTED":
      case "IN_TRANSIT":
        return <TruckIcon className="h-4 w-4" />;
      case "DELIVERED":
        return <PackageIcon className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">
              {delivery.announcement.title}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <TruckIcon className="h-4 w-4" />
                {delivery.trackingNumber}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {formatDate(delivery.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge
              className={cn(
                "flex items-center gap-1",
                statusColors[delivery.status as keyof typeof statusColors] ||
                  "bg-gray-100 text-gray-800",
              )}
            >
              {getStatusIcon(delivery.status)}
              {statusLabels[delivery.status as keyof typeof statusLabels] ||
                delivery.status}
            </Badge>
            <Badge variant="outline">
              {typeLabels[
                delivery.announcement.type as keyof typeof typeLabels
              ] || delivery.announcement.type}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Informations client */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Client</h4>
              <p className="text-sm">{delivery.client.name}</p>
            </div>

            {delivery.isPartial && (
              <div>
                <Badge variant="secondary" className="text-xs">
                  Livraison partielle
                </Badge>
              </div>
            )}
          </div>

          {/* Itinéraire */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">
                Itinéraire
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">
                    {delivery.announcement.pickupAddress}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPinIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">
                    {delivery.announcement.deliveryAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rémunération et dates */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">
                Rémunération
              </h4>
              <div className="flex items-center gap-1 text-lg font-semibold text-green-600">
                <EuroIcon className="h-4 w-4" />
                {formatPrice(delivery.delivererFee)}
              </div>
              <p className="text-xs text-gray-500">
                Prix total: {formatPrice(delivery.price)}
              </p>
            </div>

            {delivery.actualDeliveryDate && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">
                  Livré le
                </h4>
                <p className="text-sm">
                  {formatDate(delivery.actualDeliveryDate)}
                </p>
              </div>
            )}

            {delivery.pickupDate && !delivery.actualDeliveryDate && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">
                  Récupéré le
                </h4>
                <p className="text-sm">{formatDate(delivery.pickupDate)}</p>
              </div>
            )}

            {delivery.payment && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">
                  Paiement
                </h4>
                <Badge
                  variant={
                    delivery.payment.status === "COMPLETED"
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {delivery.payment.status === "COMPLETED"
                    ? "Payé"
                    : "En attente"}
                </Badge>
                {delivery.payment.paidAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Le {formatDate(delivery.payment.paidAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm text-gray-500">
            {delivery.announcement.description && (
              <p className="line-clamp-2">
                {delivery.announcement.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {delivery.status === "IN_TRANSIT" && (
              <Link href={`/fr/deliverer/deliveries/${delivery.id}`}>
                <Button size="sm">
                  <ExternalLinkIcon className="h-4 w-4 mr-1" />
                  Voir détails
                </Button>
              </Link>
            )}

            {delivery.validationCode && delivery.status === "IN_TRANSIT" && (
              <div className="text-sm">
                <span className="text-gray-500">Code: </span>
                <span className="font-mono font-bold">
                  {delivery.validationCode}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
