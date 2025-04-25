"use client";

import {
  ArrowUp,
  Package,
  CreditCard,
  DollarSign,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const progress = 78;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue sur votre tableau de bord EcoDeli. Voici un aperçu de vos
          activités.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Livraisons totales
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">
              +3% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1 452,89 €</div>
            <div className="flex items-center pt-1">
              <ArrowUp className="h-4 w-4 text-green-500" />
              <p className="text-xs text-green-500">+12,3%</p>
              <p className="ml-1 text-xs text-muted-foreground">
                depuis la semaine dernière
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Livraisons en cours
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <div className="mt-3">
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solde disponible
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">320,50 €</div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2">
                  Retirer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Retirer des fonds</DialogTitle>
                  <DialogDescription>
                    Entrez le montant que vous souhaitez retirer vers votre
                    compte bancaire.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Montant</Label>
                    <Input
                      id="amount"
                      placeholder="0.00"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Confirmer le retrait</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="livraisons" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="livraisons">Livraisons récentes</TabsTrigger>
          <TabsTrigger value="revenus">Revenus</TabsTrigger>
          <TabsTrigger value="annonces">Mes annonces</TabsTrigger>
        </TabsList>
        <TabsContent value="livraisons">
          <Card>
            <CardHeader>
              <CardTitle>Livraisons récentes</CardTitle>
              <CardDescription>
                Vous avez effectué 12 livraisons ce mois-ci
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      id: "LIV-1234",
                      address: "123 Rue de Paris, 75001 Paris",
                      date: "11 Mai 2023",
                      status: "Livrée",
                      amount: "24,00 €",
                    },
                    {
                      id: "LIV-1235",
                      address: "45 Avenue Victor Hugo, 75016 Paris",
                      date: "10 Mai 2023",
                      status: "En cours",
                      amount: "18,50 €",
                    },
                    {
                      id: "LIV-1236",
                      address: "8 Boulevard Haussmann, 75009 Paris",
                      date: "9 Mai 2023",
                      status: "Livrée",
                      amount: "32,00 €",
                    },
                    {
                      id: "LIV-1237",
                      address: "12 Rue Saint-Antoine, 75004 Paris",
                      date: "8 Mai 2023",
                      status: "Livrée",
                      amount: "15,00 €",
                    },
                    {
                      id: "LIV-1238",
                      address: "63 Rue de Rivoli, 75001 Paris",
                      date: "7 Mai 2023",
                      status: "Annulée",
                      amount: "0,00 €",
                    },
                  ].map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">
                        {delivery.id}
                      </TableCell>
                      <TableCell>{delivery.address}</TableCell>
                      <TableCell>{delivery.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            delivery.status === "Livrée"
                              ? "default"
                              : delivery.status === "En cours"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {delivery.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {delivery.amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Exporter</Button>
              <Button>Voir toutes les livraisons</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="revenus">
          <Card>
            <CardHeader>
              <CardTitle>Revenus mensuels</CardTitle>
              <CardDescription>Vos gains des 6 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full rounded-md border border-dashed flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Graphique des revenus (placeholder)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="annonces">
          <Card>
            <CardHeader>
              <CardTitle>Mes annonces actives</CardTitle>
              <CardDescription>Vous avez 3 annonces actives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Livraison petit colis Paris - Lyon",
                    date: "15 Mai 2023",
                    price: "35,00 €",
                    views: 12,
                  },
                  {
                    title: "Transport de courses supermarché",
                    date: "18 Mai 2023",
                    price: "15,00 €",
                    views: 8,
                  },
                  {
                    title: "Livraison d'un meuble IKEA",
                    date: "20 Mai 2023",
                    price: "50,00 €",
                    views: 15,
                  },
                ].map((announcement, index) => (
                  <Card key={index} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {announcement.title}
                      </CardTitle>
                      <CardDescription>
                        {announcement.date} · {announcement.views} vues
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 flex justify-between">
                      <div className="font-bold">{announcement.price}</div>
                      <Button size="sm" variant="outline">
                        Modifier
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Créer une nouvelle annonce</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
