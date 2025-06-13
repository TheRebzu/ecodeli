"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Clock,
  Euro,
  Download,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProviderContract {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "PENDING" | "EXPIRED" | "TERMINATED";
  clientName: string;
  serviceType: string;
  startDate: Date;
  endDate?: Date;
  amount: number;
  commission: number;
  createdAt: Date;
  updatedAt: Date;
}

export function ProviderContracts() {
  const t = useTranslations();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("active");

  // Récupération des contrats depuis l'API
  const {
    data: contractsData,
    isLoading,
    error,
    refetch,
  } = api.provider.getContracts.useQuery({
    status: selectedTab === "all" ? undefined : selectedTab.toUpperCase(),
  });

  // Récupération des statistiques des contrats
  const { data: statsData } = api.provider.getContractStats.useQuery();

  const contracts = contractsData?.contracts || [];
  const stats = statsData || {
    totalContracts: 0,
    activeContracts: 0,
    totalEarnings: 0,
    pendingContracts: 0,
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: "Actif", variant: "default" as const, icon: CheckCircle },
      PENDING: { label: "En attente", variant: "secondary" as const, icon: Clock },
      DRAFT: { label: "Brouillon", variant: "outline" as const, icon: Edit },
      EXPIRED: { label: "Expiré", variant: "destructive" as const, icon: XCircle },
      TERMINATED: { label: "Terminé", variant: "outline" as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: "outline" as const,
      icon: AlertCircle,
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd MMM yyyy", { locale: fr });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleDownloadContract = async (contractId: string) => {
    try {
      // Ici on appellerait l'API pour télécharger le contrat
      toast({
        title: "Téléchargement en cours",
        description: "Le contrat va être téléchargé...",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le contrat",
        variant: "destructive",
      });
    }
  };

  const handleViewContract = (contractId: string) => {
    // Navigation vers la page de détail du contrat
    window.open(`/provider/contracts/${contractId}`, '_blank');
  };

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
          <p className="text-muted-foreground text-center mb-4">
            Impossible de charger vos contrats
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contrats</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contrats Actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
            <Euro className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalEarnings)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des contrats */}
      <Card>
        <CardHeader>
          <CardTitle>Mes Contrats</CardTitle>
          <CardDescription>
            Gérez vos contrats de prestation de services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="active">Actifs</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="expired">Expirés</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              {contracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Aucun contrat trouvé
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Vous n'avez pas encore de contrats dans cette catégorie
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contracts.map((contract: ProviderContract) => (
                    <Card key={contract.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">{contract.title}</h4>
                              {getStatusBadge(contract.status)}
                            </div>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <span>Client:</span>
                                <span className="font-medium">{contract.clientName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Service:</span>
                                <span>{contract.serviceType}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(contract.startDate)}</span>
                                  {contract.endDate && (
                                    <>
                                      <span>-</span>
                                      <span>{formatDate(contract.endDate)}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  <span className="font-medium">
                                    {formatCurrency(contract.amount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewContract(contract.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadContract(contract.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      {/* Statistiques skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Liste skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}