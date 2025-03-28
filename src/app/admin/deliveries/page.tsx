import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, Filter, Clock, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryStatus } from "@prisma/client";

export default async function DeliveriesPage() {
  // Récupération des livraisons depuis la base de données
  const deliveries = await prisma.delivery.findMany({
    include: {
      deliveryPerson: {
        include: {
          user: true
        }
      },
      customer: {
        include: {
          user: true
        }
      }
    },
    orderBy: {
      pickupDate: "desc",
    },
  });

  // Statistiques
  const totalDeliveries = deliveries.length;
  const pendingDeliveries = deliveries.filter(d => d.status === DeliveryStatus.PENDING).length;
  const completedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
  const inProgressDeliveries = deliveries.filter(d => d.status === DeliveryStatus.IN_TRANSIT).length;

  // Formatter le statut pour l'affichage
  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.PENDING:
        return <Badge variant="default" className="flex items-center gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
      case DeliveryStatus.IN_TRANSIT:
        return <Badge variant="default" className="flex items-center gap-1"><Package className="h-3 w-3" /> En cours</Badge>;
      case DeliveryStatus.DELIVERED:
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Complétée</Badge>;
      case DeliveryStatus.CANCELLED:
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Annulée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Supervision des livraisons</h1>
          <p className="text-slate-500">
            Suivez en temps réel l&apos;état des livraisons sur la plateforme
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          <span>Filtres avancés</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total livraisons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Complétées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedDeliveries}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Liste des livraisons</CardTitle>
              <CardDescription>
                Superviser toutes les livraisons de la plateforme
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Rechercher une livraison..."
                className="w-full pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="in-progress">En cours</TabsTrigger>
              <TabsTrigger value="completed">Complétées</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left font-medium">ID</th>
                      <th className="px-4 py-3 text-left font-medium">Client</th>
                      <th className="px-4 py-3 text-left font-medium">Livreur</th>
                      <th className="px-4 py-3 text-left font-medium">Statut</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="border-b">
                        <td className="px-4 py-3 font-medium">
                          {delivery.id.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          {delivery.customer?.user?.name || "Non assigné"}
                        </td>
                        <td className="px-4 py-3">
                          {delivery.deliveryPerson?.user?.name || "Non assigné"}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(delivery.status)}
                        </td>
                        <td className="px-4 py-3">
                          {new Date(delivery.pickupDate).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/deliveries/${delivery.id}`}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Voir les détails</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 