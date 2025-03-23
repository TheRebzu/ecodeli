"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

// Define DeliveryStatus enum
enum DeliveryStatus {
  PENDING = "PENDING",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  CANCELED = "CANCELED"
}

// Define ClientShipment type
interface ClientShipment {
  id: string;
  createdAt: Date;
  status: DeliveryStatus;
  origin: string;
  destination: string;
  price: number;
}

// Define ClientNotification type
interface ClientNotification {
  id: string;
  createdAt: Date;
  title: string;
  message: string;
  actionLink?: string;
  actionText?: string;
}

// Define fallback components
const ClientRecentShipments = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Livraisons récentes</h3>
    <p>Chargement des livraisons...</p>
  </div>
);

const ClientNotifications = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Notifications</h3>
    <p>Chargement des notifications...</p>
  </div>
);

const RecentShipmentsSkeleton = () => (
  <div className="space-y-4">
    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
    <div className="space-y-2">
      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </div>
);

const NotificationsSkeleton = () => (
  <div className="space-y-4">
    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
    <div className="space-y-2">
      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </div>
);

const OverviewSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="rounded-lg border p-6 shadow-sm">
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
      </div>
    ))}
  </div>
);

// Simple client dashboard page that doesn't rely on server data fetching
export default function ClientDashboard() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
        <p className="text-muted-foreground">
          Bienvenue sur votre tableau de bord client EcoDeli
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="shipments">Livraisons</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <ClientOverviewContent />
        </TabsContent>
        <TabsContent value="shipments" className="space-y-4">
          <Suspense fallback={<RecentShipmentsSkeleton />}>
            <ClientRecentShipments />
          </Suspense>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <Suspense fallback={<NotificationsSkeleton />}>
            <ClientNotifications />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Client component for the overview content
function ClientOverviewContent() {
  // Create example shipments data
  const exampleShipments: ClientShipment[] = [
    {
      id: "ship_1",
      createdAt: new Date(),
      status: DeliveryStatus.DELIVERED,
      origin: "12 rue de Paris, 75001 Paris",
      destination: "23 avenue Victor Hugo, 75016 Paris",
      price: 12.99
    },
    {
      id: "ship_2",
      createdAt: new Date(Date.now() - 86400000),
      status: DeliveryStatus.PENDING,
      origin: "5 rue des Lilas, 75020 Paris",
      destination: "9 boulevard Haussmann, 75009 Paris",
      price: 9.99
    }
  ];
  
  const shipments = exampleShipments;
  
  const totalShipments = shipments.length;
  const completedShipments = shipments.filter((s: ClientShipment) => s.status === DeliveryStatus.DELIVERED).length;
  const pendingShipments = shipments.filter((s: ClientShipment) => s.status === DeliveryStatus.PENDING).length;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de livraisons
          </CardTitle>
          <Icons.package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalShipments}</div>
          <p className="text-xs text-muted-foreground">
            Toutes vos livraisons
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Livraisons terminées
          </CardTitle>
          <Icons.check className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedShipments}</div>
          <p className="text-xs text-muted-foreground">
            Livraisons avec statut "Livré"
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Livraisons en cours
          </CardTitle>
          <Icons.clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingShipments}</div>
          <p className="text-xs text-muted-foreground">
            Livraisons avec statut "En attente"
          </p>
        </CardContent>
      </Card>
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shipments.map((shipment: ClientShipment) => (
              <div key={shipment.id} className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="font-medium">Livraison #{shipment.id}</div>
                  <div className="text-sm text-muted-foreground">
                    De {shipment.origin} à {shipment.destination}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-sm ${
                    shipment.status === DeliveryStatus.DELIVERED ? "text-green-500" :
                    shipment.status === DeliveryStatus.PENDING ? "text-amber-500" : 
                    "text-blue-500"
                  }`}>
                    {shipment.status === DeliveryStatus.DELIVERED ? "Livré" : 
                    shipment.status === DeliveryStatus.PENDING ? "En attente" : 
                    "En transit"}
                  </div>
                  <div className="text-sm font-medium">
                    {shipment.price.toFixed(2)} €
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 