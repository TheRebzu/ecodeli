"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PackageIcon, UserIcon } from "lucide-react";

// Type pour les livraisons
type Shipment = {
  id: string;
  trackingNumber: string;
  clientName: string;
  clientAvatar?: string;
  status: 'PENDING' | 'ASSIGNED' | 'PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  price: number;
  createdAt: Date;
};

// Données factices pour la démo
const recentShipments: Shipment[] = [
  {
    id: "ship-1",
    trackingNumber: "ECO-1234",
    clientName: "Sophie Martin",
    clientAvatar: "",
    status: "DELIVERED",
    price: 15.99,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 heure
  },
  {
    id: "ship-2",
    trackingNumber: "ECO-1235",
    clientName: "Lucas Dubois",
    clientAvatar: "",
    status: "IN_TRANSIT",
    price: 24.50,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 heures
  },
  {
    id: "ship-3",
    trackingNumber: "ECO-1236",
    clientName: "Emma Bernard",
    clientAvatar: "",
    status: "PICKUP",
    price: 8.99,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 heures
  },
  {
    id: "ship-4",
    trackingNumber: "ECO-1237",
    clientName: "Noah Petit",
    clientAvatar: "",
    status: "ASSIGNED",
    price: 32.75,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 heures
  },
  {
    id: "ship-5",
    trackingNumber: "ECO-1238",
    clientName: "Chloé Leroy",
    clientAvatar: "",
    status: "PENDING",
    price: 17.25,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 heures
  },
];

// Traduction des statuts
const statusTranslations = {
  PENDING: 'En attente',
  ASSIGNED: 'Assigné',
  PICKUP: 'Ramassage',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé'
};

// Fonction pour obtenir la couleur du badge en fonction du statut
function getStatusColor(status: Shipment['status']) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'ASSIGNED':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'PICKUP':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
    case 'IN_TRANSIT':
      return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
}

export function RecentShipments() {
  return (
    <div className="space-y-8">
      {recentShipments.map((shipment) => (
        <div key={shipment.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={shipment.clientAvatar} alt={shipment.clientName} />
            <AvatarFallback className="bg-primary/10">
              <UserIcon className="h-4 w-4 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{shipment.clientName}</p>
            <div className="flex items-center gap-2">
              <PackageIcon className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{shipment.trackingNumber}</p>
            </div>
          </div>
          <div className="ml-auto text-right">
            <Badge className={`${getStatusColor(shipment.status)} border-none`}>
              {statusTranslations[shipment.status]}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(shipment.createdAt, "HH:mm", { locale: fr })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 