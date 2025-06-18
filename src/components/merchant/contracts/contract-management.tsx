"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, FileText, Download, Eye, Edit, Clock, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function ContractManagement() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const t = useTranslations("merchant.contracts");
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
        title: t("contract.signed"),
        description: t("contract.signedSuccess"),
        variant: "default"
      });
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("contract.signError"),
        variant: "destructive"
      });
    }
  });

  // Télécharger un contrat
  const downloadContract = async (contractId: string) => {
    try {
      const response = await api.merchant.contracts.download.mutate({ contractId });
      
      if (response.success && response.fileUrl) {
        const a = document.createElement('a');
        a.href = response.fileUrl;
        a.download = `contrat-${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        throw new Error(t("contract.downloadError"));
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("contract.downloadError"),
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t("status.draft")}</Badge>;
      case "PENDING":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{t("status.pending")}</Badge>;
      case "ACTIVE":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />{t("status.active")}</Badge>;
      case "EXPIRED":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t("status.expired")}</Badge>;
      case "TERMINATED":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />{t("status.terminated")}</Badge>;
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
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      {/* Statistiques rapides */}
      {contractStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.totalContracts")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractStats.totalContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.activeContracts")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{contractStats.activeContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.pendingContracts")}</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{contractStats.pendingContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.totalRevenue")}</CardTitle>
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
          <TabsTrigger value="all">{t("tabs.allContracts")}</TabsTrigger>
          <TabsTrigger value="pending">{t("tabs.pending")}</TabsTrigger>
          <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
          <TabsTrigger value="expired">{t("tabs.expired")}</TabsTrigger>
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
                          {contract.title || `${t("contract.number")} ${contract.contractNumber}`}
                        </CardTitle>
                        <CardDescription>
                          {t("contract.createdOn")} {formatDate(contract.createdAt)}
                        </CardDescription>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("contract.type")}</p>
                        <p className="font-medium">{contract.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("contract.value")}</p>
                        <p className="font-medium">{formatCurrency(contract.value)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("contract.duration")}</p>
                        <p className="font-medium">
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </p>
                      </div>
                    </div>

                    {contract.description && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-1">{t("contract.description")}</p>
                        <p className="text-sm">{contract.description}</p>
                      </div>
                    )}

                    {contract.status === "PENDING" && (
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t("contract.pendingMessage")}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        {t("actions.view")}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadContract(contract.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t("actions.download")}
                      </Button>
                      {contract.status === "PENDING" && (
                        <Button 
                          size="sm"
                          onClick={() => signContractMutation.mutate({ contractId: contract.id })}
                          disabled={signContractMutation.isPending}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t("actions.sign")}
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
                <h3 className="text-lg font-medium mb-2">{t("noContracts.title")}</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {t("noContracts.description")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {contracts?.filter(c => c.status === "PENDING").map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow border-orange-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{contract.title}</CardTitle>
                    <CardDescription>
                      {t("contract.awaitingSignature")}
                    </CardDescription>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("contract.value")}</p>
                    <p className="font-bold text-lg">{formatCurrency(contract.value)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {t("actions.review")}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => signContractMutation.mutate({ contractId: contract.id })}
                      disabled={signContractMutation.isPending}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t("actions.sign")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {contracts?.filter(c => c.status === "ACTIVE").map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow border-green-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{contract.title}</CardTitle>
                    <CardDescription>
                      {t("contract.activeUntil")} {formatDate(contract.endDate)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("contract.monthlyValue")}</p>
                      <p className="font-medium">{formatCurrency(contract.monthlyValue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("contract.renewalDate")}</p>
                      <p className="font-medium">{formatDate(contract.renewalDate)}</p>
                    </div>
                  </div>
                  
                  {contract.progress && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{t("contract.progress")}</span>
                        <span>{contract.progress}%</span>
                      </div>
                      <Progress value={contract.progress} />
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {t("actions.viewDetails")}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      {t("actions.downloadInvoice")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {contracts?.filter(c => c.status === "EXPIRED").map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow border-red-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{contract.title}</CardTitle>
                    <CardDescription>
                      {t("contract.expiredOn")} {formatDate(contract.endDate)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("contract.totalGenerated")}</p>
                    <p className="font-bold text-lg">{formatCurrency(contract.totalGenerated || 0)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {t("actions.viewHistory")}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      {t("actions.downloadArchive")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
} 