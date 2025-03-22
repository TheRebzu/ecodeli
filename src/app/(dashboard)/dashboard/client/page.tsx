import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCurrentUser, loadDashboardData } from "@/lib/loaders/dashboard-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryStatus } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DashboardShipment, DashboardNotification } from "@/lib/schema/dashboard";

// Définition temporaire des types en attendant de charger les données réelles
interface ClientShipment {
  id: string;
  createdAt: Date;
  status: DeliveryStatus;
  origin: string;
  destination: string;
  price: number;
}

interface ClientNotification {
  id: string;
  createdAt: Date;
  title: string;
  message: string;
  actionLink?: string;
  actionText?: string;
}

export default async function ClientDashboardPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="shipments">Mes livraisons</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<OverviewSkeleton />}>
            <ClientOverview />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="shipments" className="space-y-4">
          <Suspense fallback={<ShipmentSkeleton />}>
            <ClientShipments />
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

async function ClientOverview() {
  const user = await loadCurrentUser();
  const dashboardData = await loadDashboardData();
  
  if (!user || !dashboardData) {
    return <div>Impossible de charger les données</div>;
  }
  
  // Exemple de données pour développement
  const shipments: ClientShipment[] = dashboardData.shipments || [
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
  
  const totalShipments = shipments.length;
  const completedShipments = shipments.filter(s => s.status === DeliveryStatus.DELIVERED).length;
  const pendingShipments = shipments.filter(s => s.status === DeliveryStatus.PENDING).length;
  
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
            {Math.round((completedShipments / totalShipments) * 100) || 0}% de vos livraisons
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Livraisons en attente
          </CardTitle>
          <Icons.clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingShipments}</div>
          <p className="text-xs text-muted-foreground">
            En attente de traitement
          </p>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Vos dernières livraisons et activités
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments && shipments.length > 0 ? (
            <div className="space-y-4">
              {shipments.slice(0, 5).map((shipment) => (
                <div 
                  key={shipment.id} 
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      Livraison #{shipment.id.substring(0, 8)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(shipment.createdAt), "PPP", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs ${
                        shipment.status === DeliveryStatus.DELIVERED
                          ? "bg-green-100 text-green-800"
                          : shipment.status === DeliveryStatus.PENDING
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {shipment.status}
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/client/shipments/${shipment.id}`}>
                        Voir
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40">
              <Icons.inbox className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Aucune livraison récente</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/dashboard/client/create-shipment">
                  Créer une livraison
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function ClientShipments() {
  const dashboardData = await loadDashboardData();
  
  // Exemple de données pour développement
  const shipments: ClientShipment[] = dashboardData?.shipments || [
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
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Toutes vos livraisons</h3>
        <Button asChild>
          <Link href="/dashboard/client/create-shipment">
            Nouvelle livraison
          </Link>
        </Button>
      </div>
      
      {shipments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shipments.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    Livraison #{shipment.id.substring(0, 8)}
                  </CardTitle>
                  <span 
                    className={`px-2 py-1 rounded-full text-xs ${
                      shipment.status === DeliveryStatus.DELIVERED
                        ? "bg-green-100 text-green-800"
                        : shipment.status === DeliveryStatus.PENDING
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {shipment.status}
                  </span>
                </div>
                <CardDescription>
                  {format(new Date(shipment.createdAt), "PPP", { locale: fr })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">De:</span>
                    <span className="font-medium">{shipment.origin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">À:</span>
                    <span className="font-medium">{shipment.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix:</span>
                    <span className="font-medium">{shipment.price} €</span>
                  </div>
                  <Button className="w-full mt-2" variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/client/shipments/${shipment.id}`}>
                      Détails
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-60 border rounded-lg">
          <Icons.inbox className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">Vous n&apos;avez pas encore de livraisons</p>
          <Button asChild>
            <Link href="/dashboard/client/create-shipment">
              Créer votre première livraison
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

async function ClientNotifications() {
  const dashboardData = await loadDashboardData();
  
  // Exemple de données pour développement
  const notifications: ClientNotification[] = dashboardData?.notifications || [
    {
      id: "notif_1",
      createdAt: new Date(),
      title: "Livraison en cours",
      message: "Votre colis est en cours de livraison",
      actionLink: "/dashboard/client/shipments/ship_1",
      actionText: "Suivre"
    },
    {
      id: "notif_2",
      createdAt: new Date(Date.now() - 86400000),
      title: "Nouvelle offre",
      message: "Profitez de 20% de réduction sur votre prochaine livraison",
      actionLink: "/dashboard/client/offers",
      actionText: "Voir l'offre"
    }
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Notifications</h3>
      
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">
                    {notification.title}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notification.createdAt), "PPP", { locale: fr })}
                  </span>
                </div>
                <CardDescription>
                  {notification.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notification.actionLink && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={notification.actionLink}>
                      {notification.actionText || "Voir"}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 border rounded-lg">
          <Icons.bell className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Pas de notifications</p>
        </div>
      )}
    </div>
  );
}

// Composants de squelette pour le chargement
function OverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ShipmentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-24 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 