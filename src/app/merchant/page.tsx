"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, BarChart3Icon, FileTextIcon, CreditCardIcon, BellIcon } from "lucide-react";

export default function MerchantDashboard() {
  const router = useRouter();

  const stats = [
    {
      title: "Commandes en cours",
      value: "12",
      description: "↗︎ 2 depuis hier",
    },
    {
      title: "Chiffre d'affaires mensuel",
      value: "4,650 €",
      description: "↗︎ 12% depuis le mois dernier",
    },
    {
      title: "Livraisons en attente",
      value: "7",
      description: "↘︎ 3 depuis hier",
    },
    {
      title: "Satisfaction client",
      value: "4.8/5",
      description: "↗︎ 0.2 depuis le mois dernier",
    },
  ];

  const recentOrders = [
    { id: "ORD-7892", customer: "Martin Dupont", status: "En livraison", amount: "129.99 €", date: "Il y a 2h" },
    { id: "ORD-7891", customer: "Sophie Lefebvre", status: "Préparation", amount: "79.50 €", date: "Il y a 3h" },
    { id: "ORD-7890", customer: "Jean Dujardin", status: "Livré", amount: "249.99 €", date: "Il y a 5h" },
    { id: "ORD-7889", customer: "Marie Lambert", status: "En attente", amount: "59.90 €", date: "Il y a 6h" },
  ];

  const quickActions = [
    { title: "Créer une annonce", icon: <FileTextIcon className="h-5 w-5" />, href: "/merchant/announcements/new" },
    { title: "Voir les contrats", icon: <FileTextIcon className="h-5 w-5" />, href: "/merchant/contracts" },
    { title: "Gérer les factures", icon: <CreditCardIcon className="h-5 w-5" />, href: "/merchant/invoices" },
    { title: "Statistiques", icon: <BarChart3Icon className="h-5 w-5" />, href: "/merchant/dashboard/stats" },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord commerçant</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon">
            <BellIcon className="h-4 w-4" />
          </Button>
          <Button>Nouvelle annonce</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analytics">Analytiques</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="announcements">Annonces</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Commandes récentes</CardTitle>
                <CardDescription>
                  Vous avez reçu {recentOrders.length} commandes aujourd'hui
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{order.customer}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.id} · {order.status}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">{order.amount}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => router.push("/merchant/orders")}>
                  Voir toutes les commandes
                </Button>
              </CardFooter>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
                <CardDescription>
                  Accédez rapidement aux fonctionnalités principales
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {quickActions.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="justify-start"
                    onClick={() => router.push(action.href)}
                  >
                    {action.icon}
                    <span className="ml-2">{action.title}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytiques</CardTitle>
              <CardDescription>
                Visualisez les performances de votre boutique
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Les graphiques détaillés seront disponibles prochainement</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commandes</CardTitle>
              <CardDescription>
                Gérez toutes vos commandes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => router.push("/merchant/orders")}>
                  Voir toutes les commandes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Annonces</CardTitle>
              <CardDescription>
                Gérez vos annonces de produits et services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => router.push("/merchant/announcements")}>
                  Voir toutes les annonces
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
