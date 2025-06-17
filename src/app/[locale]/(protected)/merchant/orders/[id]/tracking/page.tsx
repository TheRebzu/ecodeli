"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Truck, 
  Package, 
  CheckCircle, 
  Phone, 
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Navigation,
  User,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [refreshing, setRefreshing] = useState(false);

  // Récupérer les détails de la commande et du tracking
  const { data: order, refetch } = api.merchant.getOrderById.useQuery({ id: orderId });
  const { data: tracking } = api.delivery.getTrackingInfo.useQuery({ 
    orderId 
  }, {
    enabled: !!orderId,
    refetchInterval: 30000 // Actualiser toutes les 30 secondes
  });

  const refreshTracking = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success("Informations actualisées");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED": return "bg-blue-100 text-blue-800";
      case "IN_TRANSIT": return "bg-purple-100 text-purple-800";
      case "DELIVERED": return "bg-green-100 text-green-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return "En attente";
      case "CONFIRMED": return "Confirmée";
      case "IN_TRANSIT": return "En cours de livraison";
      case "DELIVERED": return "Livrée";
      case "CANCELLED": return "Annulée";
      default: return status;
    }
  };

  const trackingSteps = [
    {
      id: "order_placed",
      title: "Commande passée",
      description: "La commande a été enregistrée",
      icon: Package,
      completed: true,
      timestamp: order?.createdAt
    },
    {
      id: "order_confirmed",
      title: "Commande confirmée",
      description: "Un livreur a été assigné",
      icon: CheckCircle,
      completed: order?.status !== "PENDING",
      timestamp: order?.confirmedAt
    },
    {
      id: "in_transit",
      title: "En cours de livraison",
      description: "Le livreur est en route",
      icon: Truck,
      completed: order?.status === "IN_TRANSIT" || order?.status === "DELIVERED",
      timestamp: order?.pickedUpAt
    },
    {
      id: "delivered",
      title: "Livraison effectuée",
      description: "Commande remise au client",
      icon: MapPin,
      completed: order?.status === "DELIVERED",
      timestamp: order?.deliveredAt
    }
  ];

  if (!order) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/merchant/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux commandes
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Suivi de commande</h1>
            <p className="text-muted-foreground">Commande #{order.id.slice(-8)}</p>
          </div>
        </div>
        
        <Button variant="outline" onClick={refreshTracking} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Statut actuel */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(order.status)}`}>
                {order.status === "DELIVERED" ? (
                  <CheckCircle className="h-6 w-6" />
                ) : order.status === "IN_TRANSIT" ? (
                  <Truck className="h-6 w-6" />
                ) : order.status === "CANCELLED" ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <Clock className="h-6 w-6" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{getStatusText(order.status)}</h2>
                <p className="text-muted-foreground">
                  Dernière mise à jour : {format(new Date(order.updatedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
            
            <Badge className={getStatusColor(order.status)}>
              {getStatusText(order.status)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline de livraison */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Progression de la livraison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {trackingSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.title}
                        </p>
                        {step.timestamp && (
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(step.timestamp), 'HH:mm', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      
                      {step.timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(step.timestamp), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                    
                    {index < trackingSteps.length - 1 && (
                      <div className={`w-px h-12 ml-4 ${
                        step.completed ? 'bg-green-200' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Informations de livraison */}
          {tracking && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Position actuelle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Dernière position connue</p>
                      <p className="text-sm text-muted-foreground">
                        {tracking.currentLocation || "Position non disponible"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">ETA</p>
                      <p className="text-sm text-muted-foreground">
                        {tracking.estimatedArrival 
                          ? format(new Date(tracking.estimatedArrival), 'HH:mm', { locale: fr })
                          : "Non estimé"
                        }
                      </p>
                    </div>
                  </div>

                  {tracking.notes && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Note du livreur</p>
                      <p className="text-sm text-blue-700 mt-1">{tracking.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Informations de contact et commande */}
        <div className="space-y-6">
          {/* Contact livreur */}
          {order.deliverer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact livreur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{order.deliverer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ⭐ {order.deliverer.rating || '4.8'}/5
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Phone className="h-4 w-4 mr-2" />
                    Appeler
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Détails de la commande */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails de livraison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Adresse de récupération</p>
                <p className="text-sm text-muted-foreground">{order.pickupAddress}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium">Adresse de livraison</p>
                <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium">Client</p>
                <p className="text-sm text-muted-foreground">{order.client?.name || "Non spécifié"}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Montant total</p>
                <p className="text-lg font-bold">{order.totalAmount}€</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" disabled={order.status === "DELIVERED"}>
                <Calendar className="h-4 w-4 mr-2" />
                Modifier la livraison
              </Button>
              
              <Button variant="outline" className="w-full" disabled={order.status === "DELIVERED"}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Signaler un problème
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
