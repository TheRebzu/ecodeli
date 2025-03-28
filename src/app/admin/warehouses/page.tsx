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
import { Eye, Search, MapPin, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Warehouse } from "@prisma/client";

export default async function WarehousesPage() {
  // Récupération des entrepôts depuis la base de données
  const warehouses = await prisma.warehouse.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // Statistiques
  const totalWarehouses = warehouses.length;

  // Calculer le taux d'occupation en fonction des boîtes disponibles et de la capacité
  const calculateOccupancyRate = (warehouse: Warehouse) => {
    if (!warehouse.capacity || warehouse.capacity === 0) return 0;
    
    const availableBoxes = warehouse.availableBoxes || 0;
    const capacity = warehouse.capacity || 1;
    
    // Si availableBoxes représente l'espace libre,
    // le taux d'occupation est (1 - availableBoxes/capacity)
    const occupancyRate = 1 - (availableBoxes / capacity);
    return Math.max(0, Math.min(1, occupancyRate)); // Limiter entre 0 et 1
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Gestion des entrepôts
          </h1>
          <p className="text-slate-500">
            Consultez et gérez les entrepôts de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Ajouter un entrepôt</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total entrepôts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWarehouses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Capacité totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.reduce((acc, w) => acc + (w.capacity || 0), 0)} boîtes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taux d&apos;occupation moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.length > 0
                ? (
                    (warehouses.reduce(
                      (acc, w) => acc + calculateOccupancyRate(w),
                      0
                    ) /
                      warehouses.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Liste des entrepôts</CardTitle>
              <CardDescription>
                {totalWarehouses} entrepôts enregistrés
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Rechercher un entrepôt..."
                className="w-full pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-100 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left font-medium">Nom</th>
                  <th className="px-4 py-3 text-left font-medium">Adresse</th>
                  <th className="px-4 py-3 text-left font-medium">Ville</th>
                  <th className="px-4 py-3 text-left font-medium">Capacité</th>
                  <th className="px-4 py-3 text-left font-medium">Taux d&apos;occupation</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => {
                  const occupancyRate = calculateOccupancyRate(warehouse);
                  return (
                    <tr key={warehouse.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{warehouse.name}</td>
                      <td className="px-4 py-3">
                        {warehouse.address || "Non renseignée"}
                      </td>
                      <td className="px-4 py-3">
                        {warehouse.city}, {warehouse.postalCode}
                      </td>
                      <td className="px-4 py-3">
                        {warehouse.capacity || 0} boîtes
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            occupancyRate > 0.8
                              ? "destructive"
                              : occupancyRate > 0.5
                              ? "default"
                              : "success"
                          }
                        >
                          {(occupancyRate * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/warehouses/${warehouse.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Voir les détails</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 