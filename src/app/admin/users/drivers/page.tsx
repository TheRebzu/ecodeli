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
import { Eye, Search, UserPlus, Car } from "lucide-react";
import Link from "next/link";
import { UserRole, UserStatus } from "@prisma/client";

export default async function DriversPage() {
  // Récupération des chauffeurs depuis la base de données
  const drivers = await prisma.user.findMany({
    where: {
      role: UserRole.DELIVERY_PERSON,
    },
    include: {
      deliveryPerson: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Statistiques
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((driver) => driver.status === UserStatus.APPROVED).length;
  const availableDrivers = drivers.filter(
    (driver) => 
      driver.status === UserStatus.APPROVED &&
      driver.deliveryPerson?.isAvailable
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6" />
            Gestion des chauffeurs
          </h1>
          <p className="text-slate-500">
            Consultez et gérez les comptes chauffeurs de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Ajouter un chauffeur</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total chauffeurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Chauffeurs actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Chauffeurs disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableDrivers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Liste des chauffeurs</CardTitle>
              <CardDescription>
                {totalDrivers} chauffeurs enregistrés
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Rechercher un chauffeur..."
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
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Type de véhicule</th>
                  <th className="px-4 py-3 text-left font-medium">Date d&apos;inscription</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{driver.name}</td>
                    <td className="px-4 py-3">{driver.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          driver.status === UserStatus.APPROVED
                            ? "success"
                            : driver.status === UserStatus.PENDING
                            ? "default"
                            : "destructive"
                        }
                      >
                        {driver.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {driver.deliveryPerson?.vehicleType || "Non spécifié"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(driver.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/drivers/${driver.id}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Voir le profil</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 