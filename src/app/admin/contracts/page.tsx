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
import { Eye, Search, Plus, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Contract, ContractStatus } from "@prisma/client";

export default async function ContractsPage() {
  // Récupération des contrats via le modèle Contract
  const contracts = await prisma.contract.findMany({
    include: {
      merchant: {
        include: {
          user: true
        }
      },
    },
    orderBy: {
      endDate: "asc",
    },
  });

  // Statistiques
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(
    (contract) => contract.endDate && contract.endDate > new Date() && contract.status === ContractStatus.ACTIVE
  ).length;
  
  const expiringContracts = contracts.filter(
    (contract) => 
      contract.endDate && 
      contract.endDate > new Date() &&
      contract.endDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && // 30 jours
      contract.status === ContractStatus.ACTIVE
  ).length;

  // Fonction pour déterminer le statut du contrat
  const getContractStatus = (contract: Contract & { endDate?: Date | null }) => {
    if (contract.status === ContractStatus.DRAFT) return "DRAFT";
    
    if (contract.endDate && contract.endDate < new Date()) {
      return "EXPIRED";
    }
    
    if (contract.endDate && contract.endDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      return "EXPIRING_SOON";
    }
    
    return "ACTIVE";
  };

  // Fonction pour afficher le badge de statut
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Actif</Badge>;
      case "EXPIRING_SOON":
        return <Badge variant="default" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expire bientôt
        </Badge>;
      case "EXPIRED":
        return <Badge variant="destructive">Expiré</Badge>;
      case "DRAFT":
        return <Badge variant="outline">Brouillon</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestion des contrats</h1>
          <p className="text-slate-500">
            Consultez et gérez les contrats avec les commerçants
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Nouveau contrat</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total contrats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contrats actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contrats expirant bientôt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringContracts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Liste des contrats</CardTitle>
              <CardDescription>
                {totalContracts} contrats enregistrés
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Rechercher un contrat..."
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
                  <th className="px-4 py-3 text-left font-medium">Commerçant</th>
                  <th className="px-4 py-3 text-left font-medium">SIRET</th>
                  <th className="px-4 py-3 text-left font-medium">Type de contrat</th>
                  <th className="px-4 py-3 text-left font-medium">Début</th>
                  <th className="px-4 py-3 text-left font-medium">Fin</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const status = getContractStatus(contract);
                  return (
                    <tr key={contract.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{contract.merchant.user.name}</td>
                      <td className="px-4 py-3">{contract.merchant.siretNumber || "N/A"}</td>
                      <td className="px-4 py-3">{contract.type}</td>
                      <td className="px-4 py-3">
                        {new Date(contract.startDate).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        {contract.endDate 
                          ? new Date(contract.endDate).toLocaleDateString("fr-FR") 
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {renderStatusBadge(status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="icon" variant="outline" asChild>
                            <Link href={`/admin/contracts/${contract.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Voir le contrat</span>
                            </Link>
                          </Button>
                          <Button size="icon" variant="outline">
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Télécharger le contrat</span>
                          </Button>
                        </div>
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