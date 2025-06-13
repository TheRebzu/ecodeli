"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import {
  FileText,
  Download,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react";
import { ContractStatus, ContractType } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractListProps {
  userRole?: "MERCHANT" | "ADMIN";
  merchantId?: string;
}

const CONTRACT_STATUS_CONFIG = {
  [ContractStatus.DRAFT]: {
    label: "Brouillon",
    variant: "secondary" as const,
    icon: Edit,
  },
  [ContractStatus.PENDING_SIGNATURE]: {
    label: "En attente de signature",
    variant: "default" as const,
    icon: Clock,
  },
  [ContractStatus.ACTIVE]: {
    label: "Actif",
    variant: "default" as const,
    icon: CheckCircle,
  },
  [ContractStatus.SUSPENDED]: {
    label: "Suspendu",
    variant: "destructive" as const,
    icon: AlertTriangle,
  },
  [ContractStatus.TERMINATED]: {
    label: "Résilié",
    variant: "destructive" as const,
    icon: XCircle,
  },
  [ContractStatus.EXPIRED]: {
    label: "Expiré",
    variant: "outline" as const,
    icon: Clock,
  },
  [ContractStatus.CANCELLED]: {
    label: "Annulé",
    variant: "outline" as const,
    icon: XCircle,
  },
};

const CONTRACT_TYPE_LABELS = {
  [ContractType.STANDARD]: "Standard",
  [ContractType.PREMIUM]: "Premium",
  [ContractType.PARTNER]: "Partenaire",
  [ContractType.TRIAL]: "Essai",
  [ContractType.CUSTOM]: "Personnalisé",
};

export default function ContractList({
  userRole = "MERCHANT",
  merchantId,
}: ContractListProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "ALL">(
    "ALL",
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Query appropriée selon le rôle
  const contractsQuery =
    userRole === "MERCHANT"
      ? api.merchant.contracts.getMerchantContracts.useQuery({
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          page: currentPage,
          limit: 10,
        })
      : api.contract.listAllContracts.useQuery({
          merchantId,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          page: currentPage,
          limit: 10,
        });

  const { data: contractsData, isLoading, refetch } = contractsQuery;

  // Mutations
  const signContractMutation = api.merchant.contracts.signContract.useMutation({
    onSuccess: () => {
      toast({
        title: "Contrat signé",
        description: "Votre signature a été enregistrée avec succès",
        variant: "default",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generatePdfMutation = api.merchant.contracts.generatePdf.useMutation({
    onSuccess: (data) => {
      // Ouvrir le PDF dans un nouvel onglet
      window.open(data.pdfUrl, "_blank");
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSignContract = (contractId: string) => {
    // En production, ouvrir un dialog de signature électronique
    const signature = `signature_${Date.now()}`;
    signContractMutation.mutate({
      contractId,
      merchantSignature: signature,
    });
  };

  const handleDownloadPdf = (contractId: string) => {
    generatePdfMutation.mutate({ contractId });
  };

  const handleViewDetails = (contractId: string) => {
    window.open(`/contracts/${contractId}`, "_blank");
  };

  const filteredContracts =
    contractsData?.data.filter(
      (contract) =>
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.contractNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    ) || [];

  const getStatusBadge = (status: ContractStatus) => {
    const config = CONTRACT_STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {userRole === "MERCHANT" ? "Mes contrats" : "Gestion des contrats"}
          </h1>
          <p className="text-muted-foreground">
            {userRole === "MERCHANT"
              ? "Consultez et gérez vos contrats avec EcoDeli"
              : "Gérez les contrats des commerçants"}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rechercher</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher par titre ou numéro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {Object.entries(CONTRACT_STATUS_CONFIG).map(
                    ([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Filtres avancés
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des contrats */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des contrats...</span>
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun contrat trouvé</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Aucun contrat ne correspond à votre recherche."
                  : "Vous n'avez aucun contrat pour le moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredContracts.map((contract) => (
            <Card
              key={contract.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        {contract.title}
                      </CardTitle>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>#{contract.contractNumber}</span>
                      <Badge variant="outline">
                        {CONTRACT_TYPE_LABELS[contract.type]}
                      </Badge>
                      <span>
                        Créé{" "}
                        {formatDistanceToNow(new Date(contract.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {contract.monthlyFee && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Frais mensuels
                      </label>
                      <p className="font-medium">
                        {formatCurrency(Number(contract.monthlyFee))}
                      </p>
                    </div>
                  )}

                  {contract.commissionRate && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Taux de commission
                      </label>
                      <p className="font-medium">
                        {(Number(contract.commissionRate) * 100).toFixed(2)}%
                      </p>
                    </div>
                  )}

                  {contract.effectiveDate && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Date d'entrée en vigueur
                      </label>
                      <p className="font-medium">
                        {new Date(contract.effectiveDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {contract.expiresAt && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-muted-foreground">
                      Date d'expiration
                    </label>
                    <p className="font-medium">
                      {new Date(contract.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(contract.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir détails
                  </Button>

                  {contract.fileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(contract.id)}
                      disabled={generatePdfMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Télécharger PDF
                    </Button>
                  )}

                  {userRole === "MERCHANT" &&
                    contract.status === ContractStatus.PENDING_SIGNATURE && (
                      <Button
                        size="sm"
                        onClick={() => handleSignContract(contract.id)}
                        disabled={signContractMutation.isPending}
                      >
                        {signContractMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          "Signer le contrat"
                        )}
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {contractsData && contractsData.pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>

          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.min(5, contractsData.pagination.pages) },
              (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              },
            )}
          </div>

          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(contractsData.pagination.pages, prev + 1),
              )
            }
            disabled={currentPage === contractsData.pagination.pages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
