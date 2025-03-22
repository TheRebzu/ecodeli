"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Package, 
  DollarSign, 
  Truck, 
  CheckCircle, 
  Loader2,
  ShoppingBag,
  ChevronRight,
  XCircle,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Types d'expédition et statuts
export type ShipmentStatus = 
  | "PENDING" 
  | "ACCEPTED" 
  | "PICKED_UP" 
  | "IN_TRANSIT" 
  | "DELIVERED" 
  | "CANCELLED";

export type ShipmentSize = "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";

export type Shipment = {
  id: string;
  origin: {
    address: string;
    city: string;
    postalCode: string;
  };
  destination: {
    address: string;
    city: string;
    postalCode: string;
  };
  scheduledDate: string;
  scheduledTime?: string;
  price: number;
  status: ShipmentStatus;
  size: ShipmentSize;
  clientId: string;
  courierId?: string;
  client: {
    name: string;
    email: string;
    phone?: string;
  };
  courier?: {
    name: string;
    phone?: string;
    transportType?: string;
  };
  description?: string;
  createdAt: string;
  updatedAt: string;
  distance?: number;
  expectedDuration?: number;
};

type ShipmentCardProps = {
  shipment: Shipment;
  onStatusChange?: (shipmentId: string, newStatus: ShipmentStatus) => Promise<void>;
  className?: string;
  detailed?: boolean;
};

export function ShipmentCard({ 
  shipment, 
  onStatusChange,
  className,
  detailed = false,
}: ShipmentCardProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Récupérer le rôle de l'utilisateur connecté
  const userRole = session?.user?.role || "CLIENT";
  
  // Traduire les statuts en français
  const statusLabels: Record<ShipmentStatus, string> = {
    PENDING: "En attente",
    ACCEPTED: "Acceptée",
    PICKED_UP: "Récupérée",
    IN_TRANSIT: "En transit",
    DELIVERED: "Livrée",
    CANCELLED: "Annulée",
  };

  // Traduire les tailles en français
  const sizeLabels: Record<ShipmentSize, string> = {
    SMALL: "Petit",
    MEDIUM: "Moyen",
    LARGE: "Grand",
    EXTRA_LARGE: "Très grand",
  };
  
  // Déterminer la couleur du badge de statut
  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "PICKED_UP":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "DELIVERED":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  // Formater la date
  const formattedDate = shipment.scheduledDate 
    ? format(new Date(shipment.scheduledDate), "PPP", { locale: fr })
    : "Non programmée";
  
  // Formater l'heure
  const formattedTime = shipment.scheduledTime || "Flexible";

  // Formater le prix
  const formattedPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(shipment.price);

  // Gérer le changement de statut
  const handleStatusChange = async (newStatus: ShipmentStatus) => {
    if (!onStatusChange) return;
    
    setIsLoading(true);
    try {
      await onStatusChange(shipment.id, newStatus);
      toast({
        title: "Statut mis à jour",
        description: `La livraison est maintenant ${statusLabels[newStatus].toLowerCase()}.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Déterminer les actions disponibles en fonction du rôle et du statut
  const renderActions = () => {
    switch (userRole) {
      case "CLIENT":
        return (
          <>
            {shipment.status === "PENDING" && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleStatusChange("CANCELLED")}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Annuler
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/shipments/${shipment.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Détails
              </Link>
            </Button>
          </>
        );
      
      case "COURIER":
        return (
          <>
            {shipment.status === "PENDING" && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleStatusChange("ACCEPTED")}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Accepter
              </Button>
            )}
            {shipment.status === "ACCEPTED" && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleStatusChange("PICKED_UP")}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
                Récupérer
              </Button>
            )}
            {shipment.status === "PICKED_UP" && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleStatusChange("IN_TRANSIT")}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
                En transit
              </Button>
            )}
            {shipment.status === "IN_TRANSIT" && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleStatusChange("DELIVERED")}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Livrer
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/deliveries/${shipment.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Détails
              </Link>
            </Button>
          </>
        );
      
      case "MERCHANT":
        return (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders/${shipment.id}`}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Suivre la livraison
            </Link>
          </Button>
        );
      
      case "PROVIDER":
        return (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/requests/${shipment.id}`}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Voir les détails
            </Link>
          </Button>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-lg font-semibold">
              <Package className="h-5 w-5 mr-2 text-primary" />
              Livraison #{shipment.id.slice(0, 8)}
            </CardTitle>
            <CardDescription>Créée le {format(new Date(shipment.createdAt), "PPP", { locale: fr })}</CardDescription>
          </div>
          <Badge className={cn("ml-2", getStatusColor(shipment.status))}>
            {statusLabels[shipment.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Départ</div>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">{shipment.origin.city}</div>
                  <div className="text-sm text-muted-foreground">
                    {shipment.origin.address}, {shipment.origin.postalCode}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Arrivée</div>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">{shipment.destination.city}</div>
                  <div className="text-sm text-muted-foreground">
                    {shipment.destination.address}, {shipment.destination.postalCode}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Date</div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <span>{formattedDate}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Heure</div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                <span>{formattedTime}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Taille</div>
              <div className="flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2 text-primary" />
                <span>{sizeLabels[shipment.size]}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Prix</div>
              <div className="flex items-center font-semibold">
                <DollarSign className="h-4 w-4 mr-2 text-primary" />
                <span>{formattedPrice}</span>
              </div>
            </div>
          </div>

          {detailed && (
            <>
              <div className="pt-2">
                <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                <p className="text-sm">
                  {shipment.description || "Aucune description fournie."}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Client</div>
                  <div className="flex items-start">
                    <div>
                      <div className="font-medium">{shipment.client.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {shipment.client.email}<br />
                        {shipment.client.phone && `Tél: ${shipment.client.phone}`}
                      </div>
                    </div>
                  </div>
                </div>
                
                {shipment.courier && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Livreur</div>
                    <div className="flex items-start">
                      <div>
                        <div className="font-medium">{shipment.courier.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {shipment.courier.phone && `Tél: ${shipment.courier.phone}`}<br />
                          {shipment.courier.transportType && `Véhicule: ${shipment.courier.transportType}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-0">
        <div className="flex space-x-2">
          {renderActions()}
        </div>
        
        {!detailed && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/shipments/${shipment.id}`}>
              Plus de détails
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 