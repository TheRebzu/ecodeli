"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, FileText, Download, Eye, Edit, Clock, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function MerchantContractPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  // Récupérer les contrats du commerçant
  const {
    data: contracts,
    isLoading: contractsLoading,
    refetch: refetchContracts
  } = api.merchant.contracts.getAll.useQuery(
    { merchantId: session?.user?.id || "" },
    { enabled: !!session?.user?.id }
  );

  // Récupérer les statistiques des contrats
  const {
    data: contractStats,
    isLoading: statsLoading
  } = api.merchant.contracts.getStats.useQuery(
    { merchantId: session?.user?.id || "" },
    { enabled: !!session?.user?.id }
  );

  // Mutation pour signer un contrat
  const signContractMutation = api.merchant.contracts.sign.useMutation({
    onSuccess: () => {
      toast({
        title: "Contrat signé",
        description: "Le contrat a été signé avec succès",
        variant: "default"
      });
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de signer le contrat",
        variant: "destructive"
      });
    }
  });

  // Télécharger un contrat
  const downloadContract = async (contractId: string) => {
    try {
      // TODO: Implémenter l'API de téléchargement
      const response = await fetch(`/api/contracts/${contractId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contrat-${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Erreur lors du téléchargement');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le contrat",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Brouillon</Badge>;
      case "PENDING":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "ACTIVE":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "EXPIRED":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expiré</Badge>;
      case "TERMINATED":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (contractsLoading || statsLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Contrats</h1>
          <p className="text-muted-foreground">
            Gérez vos contrats avec EcoDeli et suivez leurs performances
          </p>
        </div>
      </div>

      {/* Statistiques rapides */}
      {contractStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contrats</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractStats.totalContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contrats Actifs</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{contractStats.activeContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{contractStats.pendingContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">€</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(contractStats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Tous les contrats</TabsTrigger>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="active">Actifs</TabsTrigger>
          <TabsTrigger value="expired">Expirés</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {contracts && contracts.length > 0 ? (
            <div className="grid gap-4">
              {contracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {contract.title || `Contrat ${contract.contractNumber}`}
                        </CardTitle>
                        <CardDescription>
                          Créé le {formatDate(contract.createdAt)}
                        </CardDescription>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Détails du contrat */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Valeur:</span>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(contract.totalValue)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Période:</span>
                        <div>
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Commission:</span>
                        <div>{contract.commissionRate}%</div>
                      </div>
                    </div>

                    {/* Progression si contrat actif */}
                    {contract.status === "ACTIVE" && contract.performance && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progression du contrat</span>
                          <span>{Math.round(contract.performance.completionRate)}%</span>
                        </div>
                        <Progress value={contract.performance.completionRate} className="h-2" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContract(contract.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadContract(contract.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>

                      {contract.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={() => signContractMutation.mutate({ contractId: contract.id })}
                          disabled={signContractMutation.isPending}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Signer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun contrat trouvé</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Vous n'avez pas encore de contrats avec EcoDeli. 
                  Contactez notre équipe commerciale pour établir un partenariat.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglets filtés par statut */}
        <TabsContent value="pending">
          {contracts?.filter(c => c.status === "PENDING").length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun contrat en attente de signature.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {contracts?.filter(c => c.status === "PENDING").map((contract) => (
                <Card key={contract.id}>
                  {/* Contenu similaire au tab "all" mais filtré */}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          {contracts?.filter(c => c.status === "ACTIVE").length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun contrat actif actuellement.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {contracts?.filter(c => c.status === "ACTIVE").map((contract) => (
                <Card key={contract.id}>
                  {/* Contenu similaire */}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired">
          {contracts?.filter(c => c.status === "EXPIRED").length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun contrat expiré.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {contracts?.filter(c => c.status === "EXPIRED").map((contract) => (
                <Card key={contract.id}>
                  {/* Contenu similaire */}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}