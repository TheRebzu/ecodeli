"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle,
  RefreshCw,
  MoreHorizontal,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Eye,
  Trash2,
  Download,
  Send,
} from "lucide-react";

// Types pour les contrats
type ContractStatus = "DRAFT" | "PENDING_SIGNATURE" | "ACTIVE" | "TERMINATED" | "EXPIRED";

type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

type StatusConfig = {
  variant: BadgeVariant;
  label: string;
};

// Composant principal de gestion des contrats
export function ContractManagement() {
  const t = useTranslations("admin.contracts");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ContractStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [contractTemplateDialogOpen, setContractTemplateDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  // Requêtes API pour les contrats
  const {
    data: contracts,
    isLoading: contractsLoading,
    refetch: refetchContracts,
  } = api.admin.contracts.getAllContracts.useQuery({
    status: activeTab === "ALL" ? undefined : activeTab,
    search: searchTerm || undefined,
  });

  // Requête pour les templates de contrats
  const {
    data: contractTemplates,
    isLoading: templatesLoading,
  } = api.admin.contracts.getContractTemplates.useQuery();

  // Mutations pour les actions sur les contrats
  const createContractMutation = api.admin.contracts.createContract.useMutation({
    onSuccess: () => {
      toast({
        title: "Contrat créé",
        description: "Le nouveau contrat a été créé avec succès.",
      });
      refetchContracts();
      setContractTemplateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContractStatusMutation = api.admin.contracts.updateContractStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Statut mis à jour",
        description: "Le statut du contrat a été mis à jour avec succès.",
      });
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = api.admin.contracts.deleteContract.useMutation({
    onSuccess: () => {
      toast({
        title: "Contrat supprimé",
        description: "Le contrat a été supprimé avec succès.",
      });
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendContractMutation = api.admin.contracts.sendContractForSignature.useMutation({
    onSuccess: () => {
      toast({
        title: "Contrat envoyé",
        description: "Le contrat a été envoyé pour signature.",
      });
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtrer les contrats selon l'onglet actif et le terme de recherche
  const filteredContracts = contracts?.filter((contract) => {
    const matchesTab = activeTab === "ALL" || contract.status === activeTab;
    const matchesSearch = !searchTerm || 
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.merchant?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  }) || [];

  // Formater la date
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dateObj);
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: ContractStatus) => {
    const statusConfig: Record<ContractStatus, StatusConfig> = {
      DRAFT: {
        variant: "secondary",
        label: t("status.draft"),
      },
      PENDING_SIGNATURE: {
        variant: "default",
        label: t("status.pendingSignature"),
      },
      ACTIVE: {
        variant: "default",
        label: t("status.active"),
      },
      TERMINATED: {
        variant: "destructive",
        label: t("status.terminated"),
      },
      EXPIRED: {
        variant: "outline",
        label: t("status.expired"),
      },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status: ContractStatus) => {
    switch (status) {
      case "DRAFT":
        return <Edit className="h-4 w-4" />;
      case "PENDING_SIGNATURE":
        return <Clock className="h-4 w-4" />;
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4" />;
      case "TERMINATED":
        return <XCircle className="h-4 w-4" />;
      case "EXPIRED":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Gérer la création de contrat
  const handleCreateContract = async (templateId: string, merchantId: string) => {
    await createContractMutation.mutateAsync({
      templateId,
      merchantId,
    });
  };

  // Gérer le changement d'onglet
  const handleTabChange = (value: string) => {
    setActiveTab(value as ContractStatus | "ALL");
  };

  // Gérer les actions sur les contrats
  const handleContractAction = async (action: string, contractId: string) => {
    switch (action) {
      case "activate":
        await updateContractStatusMutation.mutateAsync({
          contractId,
          status: "ACTIVE",
        });
        break;
      case "terminate":
        await updateContractStatusMutation.mutateAsync({
          contractId,
          status: "TERMINATED",
        });
        break;
      case "send":
        await sendContractMutation.mutateAsync({ contractId });
        break;
      case "delete":
        if (confirm("Êtes-vous sûr de vouloir supprimer ce contrat ?")) {
          await deleteContractMutation.mutateAsync({ contractId });
        }
        break;
    }
  };

  // Statistiques des contrats
  const contractStats = {
    total: contracts?.length || 0,
    active: contracts?.filter(c => c.status === "ACTIVE").length || 0,
    pending: contracts?.filter(c => c.status === "PENDING_SIGNATURE").length || 0,
    expired: contracts?.filter(c => c.status === "EXPIRED").length || 0,
  };

  if (contractsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des contrats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{contractStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Actifs</p>
                <p className="text-2xl font-bold">{contractStats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">En attente</p>
                <p className="text-2xl font-bold">{contractStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Expirés</p>
                <p className="text-2xl font-bold">{contractStats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contrôles */}
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
            onClick={() => {
              setSearchTerm("");
              refetchContracts();
            }}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("selectTemplate")}</DialogTitle>
              <DialogDescription>
                {t("selectTemplateDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              {templatesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                contractTemplates?.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </div>
                        <Select
                          onValueChange={(merchantId) => 
                            handleCreateContract(template.id, merchantId)
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Sélectionner un marchand" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Ici, vous devriez charger la liste des marchands */}
                            <SelectItem value="merchant-1">Boulangerie Martin</SelectItem>
                            <SelectItem value="merchant-2">Primeur Durand</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
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

      {/* Liste des contrats */}
      <Tabs
        defaultValue="ALL"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="ALL">Tous</TabsTrigger>
          <TabsTrigger value="DRAFT">Brouillons</TabsTrigger>
          <TabsTrigger value="PENDING_SIGNATURE">En attente</TabsTrigger>
          <TabsTrigger value="ACTIVE">Actifs</TabsTrigger>
          <TabsTrigger value="EXPIRED">Expirés</TabsTrigger>
          <TabsTrigger value="TERMINATED">Résiliés</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Marchand</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead>Date d'expiration</TableHead>
                    <TableHead>Date de signature</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4" />
                          <p>Aucun contrat trouvé</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(contract.status)}
                            <div>
                              <p className="font-medium">{contract.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {contract.contractNumber}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contract.merchant?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {contract.merchant?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(contract.status)}
                        </TableCell>
                        <TableCell>{formatDate(contract.createdAt)}</TableCell>
                        <TableCell>{formatDate(contract.expiresAt)}</TableCell>
                        <TableCell>{formatDate(contract.signedAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleContractAction("view", contract.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleContractAction("download", contract.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                              </DropdownMenuItem>
                              {contract.status === "DRAFT" && (
                                <DropdownMenuItem onClick={() => handleContractAction("send", contract.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Envoyer pour signature
                                </DropdownMenuItem>
                              )}
                              {contract.status === "PENDING_SIGNATURE" && (
                                <DropdownMenuItem onClick={() => handleContractAction("activate", contract.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activer
                                </DropdownMenuItem>
                              )}
                              {contract.status === "ACTIVE" && (
                                <DropdownMenuItem onClick={() => handleContractAction("terminate", contract.id)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Résilier
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleContractAction("delete", contract.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
