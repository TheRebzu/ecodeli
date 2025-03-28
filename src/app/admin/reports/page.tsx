import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import { DeliveryStatus, SubscriptionPlan } from "@prisma/client";
import { DeliveryChart } from "./components/delivery-chart";
import { UsersDistribution } from "./components/users-distribution";
import { ReportTabs } from "./components/tabs-content";

export default async function ReportsPage() {
  // Statistiques générales
  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: {
      id: true,
    },
  });

  // Pour les livraisons, filtrer sur pickupDate au lieu de createdAt
  const deliveriesThisMonth = await prisma.delivery.count({
    where: {
      pickupDate: {
        gte: new Date(new Date().setDate(1)), // Premier jour du mois courant
      },
    },
  });

  const deliveriesLastMonth = await prisma.delivery.count({
    where: {
      pickupDate: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 1, 1)), // Premier jour du mois précédent
        lt: new Date(new Date().setDate(1)), // Premier jour du mois courant
      },
    },
  });

  const pendingDeliveries = await prisma.delivery.count({
    where: {
      status: DeliveryStatus.PENDING,
    },
  });

  const inProgressDeliveries = await prisma.delivery.count({
    where: {
      status: DeliveryStatus.IN_TRANSIT,
    },
  });

  const completedDeliveries = await prisma.delivery.count({
    where: {
      status: DeliveryStatus.DELIVERED,
    },
  });

  // Pour les clients premium
  const premiumClients = await prisma.customer.count({
    where: {
      subscriptionPlan: SubscriptionPlan.PREMIUM,
    },
  });

  // Données pour le graphique (exemple)
  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const chartData = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const deliveries = await prisma.delivery.count({
        where: {
          pickupDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });
      
      return {
        name: months[month.getMonth()],
        livraisons: deliveries,
      };
    })
  );

  chartData.reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rapports et Statistiques</h1>
          <p className="text-slate-500">
            Analysez les performances de la plateforme et générez des rapports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span>Sélectionner une période</span>
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Livraisons ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveriesThisMonth}</div>
            <p className="text-xs text-slate-500">
              {deliveriesThisMonth > deliveriesLastMonth
                ? `+${deliveriesThisMonth - deliveriesLastMonth} par rapport au mois dernier`
                : `${deliveriesLastMonth - deliveriesThisMonth} de moins que le mois dernier`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Livraisons en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Livraisons en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressDeliveries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clients premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{premiumClients}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activité de livraison (6 derniers mois)</CardTitle>
            <CardDescription>
              Nombre de livraisons par mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeliveryChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition des utilisateurs</CardTitle>
            <CardDescription>
              Par type de rôle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersDistribution usersByRole={usersByRole} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Livraisons terminées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedDeliveries}</div>
            <p className="text-xs text-slate-500">
              {Math.round((completedDeliveries / (completedDeliveries + pendingDeliveries + inProgressDeliveries)) * 100)}% du total
            </p>
          </CardContent>
        </Card>
      </div>

      <ReportTabs usersByRole={usersByRole} />
    </div>
  );
} 