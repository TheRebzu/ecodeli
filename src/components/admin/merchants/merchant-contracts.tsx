"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusCircle, FileText, RefreshCw } from "lucide-react";
import { ContractStatus } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Définissez les variants disponibles pour Badge
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

type StatusConfig = {
  variant: BadgeVariant;
  label: string;
};

export function ContractManagement() {
  const t = useTranslations("admin.contracts");
  const [activeTab, setActiveTab] = useState<ContractStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading] = useState(false);
  const [contractTemplateDialogOpen, setContractTemplateDialogOpen] =
    useState(false);

  // Données de contrats simulées pour la démo
  const contracts = [
    {
      id: "1",
      title: "Contrat standard marchand",
      merchant: "Boulangerie Martin",
      status: ContractStatus.ACTIVE,
      createdAt: new Date("2023-11-15"),
      expiresAt: new Date("2024-11-15"),
      signedAt: new Date("2023-11-15"),
    },
    {
      id: "2",
      title: "Contrat premium marchand",
      merchant: "Primeur Durand",
      status: ContractStatus.ACTIVE,
      createdAt: new Date("2023-10-20"),
      expiresAt: new Date("2024-10-20"),
      signedAt: new Date("2023-10-20"),
    },
    {
      id: "3",
      title: "Contrat partenaire privilégié",
      merchant: "Boucherie Antoine",
      status: ContractStatus.ACTIVE,
      createdAt: new Date("2023-09-05"),
      expiresAt: new Date("2024-09-05"),
      signedAt: new Date("2023-09-05"),
    },
    {
      id: "4",
      title: "Contrat standard marchand",
      merchant: "Fleuriste Belle Rose",
      status: ContractStatus.PENDING_SIGNATURE,
      createdAt: new Date("2023-12-01"),
      expiresAt: null,
      signedAt: null,
    },
    {
      id: "5",
      title: "Contrat standard marchand",
      merchant: "Épicerie du Coin",
      status: ContractStatus.EXPIRED,
      createdAt: new Date("2022-11-15"),
      expiresAt: new Date("2023-11-15"),
      signedAt: new Date("2022-11-15"),
    },
    {
      id: "6",
      title: "Contrat premium marchand",
      merchant: "Fromagerie Delice",
      status: ContractStatus.TERMINATED,
      createdAt: new Date("2023-02-10"),
      expiresAt: new Date("2024-02-10"),
      signedAt: new Date("2023-02-10"),
    },
    {
      id: "7",
      title: "Contrat standard marchand",
      merchant: "Boutique Bio",
      status: ContractStatus.DRAFT,
      createdAt: new Date("2023-11-30"),
      expiresAt: null,
      signedAt: null,
    },
  ];

  // Templates de contrats simulés
  const contractTemplates = [
    {
      id: "1",
      name: "Contrat standard marchand",
      description: "Contrat de base pour les commerçants",
    },
    {
      id: "2",
      name: "Contrat premium marchand",
      description: "Contrat avec services premium pour les commerçants",
    },
    {
      id: "3",
      name: "Contrat partenaire privilégié",
      description: "Contrat pour les partenaires privilégiés",
    },
  ];

  // Filtrer les contrats selon l'onglet actif et le terme de recherche
  const filteredContracts = contracts
    .filter((contract) => activeTab === "ALL" || contract.status === activeTab)
    .filter(
      (contract) =>
        contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.merchant.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  // Formater la date
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: ContractStatus) => {
    const statusConfig: Record<
      ContractStatus,
      { variant: BadgeVariant; label: string }
    > = {
      [ContractStatus.DRAFT]: {
        variant: "secondary",
        label: t("status.draft"),
      },
      [ContractStatus.PENDING_SIGNATURE]: {
        variant: "default",
        label: t("status.pendingSignature"),
      },
      [ContractStatus.ACTIVE]: {
        variant: "default",
        label: t("status.active"),
      },
      [ContractStatus.TERMINATED]: {
        variant: "destructive",
        label: t("status.terminated"),
      },
      [ContractStatus.EXPIRED]: {
        variant: "outline",
        label: t("status.expired"),
      },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleCreateContract = (templateId: string) => {
    setContractTemplateDialogOpen(false);
    // Ici, on simulerait la redirection vers la page de création de contrat avec le template sélectionné
    console.log(`Créer un contrat avec le template ${templateId}`);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as ContractStatus | "ALL");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[250px]"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSearchTerm("")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Dialog
          open={contractTemplateDialogOpen}
          onOpenChange={setContractTemplateDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("createContract")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("selectTemplate")}</DialogTitle>
              <DialogDescription>
                {t("selectTemplateDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {contractTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleCreateContract(template.id)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setContractTemplateDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        defaultValue="ALL"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="ALL">{t("allContracts")}</TabsTrigger>
          <TabsTrigger value={ContractStatus.DRAFT}>
            {t("status.draft")}
          </TabsTrigger>
          <TabsTrigger value={ContractStatus.PENDING_SIGNATURE}>
            {t("status.pendingSignature")}
          </TabsTrigger>
          <TabsTrigger value={ContractStatus.ACTIVE}>
            {t("status.active")}
          </TabsTrigger>
          <TabsTrigger value={ContractStatus.TERMINATED}>
            {t("status.terminated")}
          </TabsTrigger>
          <TabsTrigger value={ContractStatus.EXPIRED}>
            {t("status.expired")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">{t("noContracts")}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    {t("noContractsDescription")}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setContractTemplateDialogOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("createContract")}
                  </Button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      <th className="py-3 px-2">{t("contractName")}</th>
                      <th className="py-3 px-2">{t("merchant")}</th>
                      <th className="py-3 px-2">{t("status")}</th>
                      <th className="py-3 px-2">{t("createdAt")}</th>
                      <th className="py-3 px-2">{t("expiresAt")}</th>
                      <th className="py-3 px-2">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <tr key={contract.id} className="border-t">
                        <td className="py-3 px-2 font-medium">
                          {contract.title}
                        </td>
                        <td className="py-3 px-2">{contract.merchant}</td>
                        <td className="py-3 px-2">
                          {getStatusBadge(contract.status)}
                        </td>
                        <td className="py-3 px-2">
                          {formatDate(contract.createdAt)}
                        </td>
                        <td className="py-3 px-2">
                          {formatDate(contract.expiresAt)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              {t("view")}
                            </Button>
                            {contract.status === ContractStatus.DRAFT && (
                              <Button variant="ghost" size="sm">
                                {t("edit")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {filteredContracts.length > 0 && (
            <div className="flex justify-end">
              <Pagination
                totalItems={filteredContracts.length}
                itemsPerPage={10}
                currentPage={1}
                onPageChange={(page) => console.log(`Page: ${page}`)}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
