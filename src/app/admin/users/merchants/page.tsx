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
import { Eye, Search, UserPlus, Store } from "lucide-react";
import Link from "next/link";
import { UserRole, UserStatus } from "@prisma/client";

export default async function MerchantsPage() {
  // Récupération des commerçants depuis la base de données
  const merchants = await prisma.user.findMany({
    where: {
      role: UserRole.MERCHANT,
    },
    include: {
      merchant: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Statistiques
  const totalMerchants = merchants.length;
  const activeMerchants = merchants.filter((merchant) => merchant.status === UserStatus.APPROVED).length;
  const pendingMerchants = merchants.filter((merchant) => merchant.status === UserStatus.PENDING).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestion des commerçants</h1>
          <p className="text-slate-500">
            Consultez et gérez les comptes commerçants de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Ajouter un commerçant</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total commerçants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMerchants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Commerçants actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMerchants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente d&apos;approbation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMerchants}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Liste des commerçants</CardTitle>
              <CardDescription>
                {totalMerchants} commerçants enregistrés
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Rechercher un commerçant..."
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
                  <th className="px-4 py-3 text-left font-medium">SIRET</th>
                  <th className="px-4 py-3 text-left font-medium">Date d&apos;inscription</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant) => (
                  <tr key={merchant.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{merchant.name}</td>
                    <td className="px-4 py-3">{merchant.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          merchant.status === UserStatus.APPROVED
                            ? "success"
                            : merchant.status === UserStatus.PENDING
                            ? "default"
                            : "destructive"
                        }
                      >
                        {merchant.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {merchant.merchant?.siretNumber || "Non renseigné"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(merchant.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/merchants/${merchant.id}`}
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