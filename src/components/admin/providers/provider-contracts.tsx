"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  RefreshCw,
  Calendar,
  Euro,
  Users
} from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type ProviderContract, type ContractStatus } from "@/types/contracts";

interface ContractMetrics {
  totalContracts: number;
  activeContracts: number;
  pendingContracts: number;
  expiredContracts: number;
  totalRevenue: number;
  averageCommission: number;
  renewalRate: number;
  expiringContracts: number;
}

export default function ProviderContracts() {
  const t = useTranslations("admin.contracts");
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "ALL">("ALL");
  const [selectedContract, setSelectedContract] = useState<ProviderContract | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Requêtes tRPC pour récupérer les données
  const {
    data: contracts = [],
    isLoading: contractsLoading,
    refetch: refetchContracts
  } = api.admin.contracts.getProviderContracts.useQuery({
    search: searchTerm || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const {
    data: contractMetrics,
    isLoading: metricsLoading
  } = api.admin.contracts.getProviderMetrics.useQuery();

  // Mutations tRPC
  const createContractMutation = api.admin.contracts.createProviderContract.useMutation({
    onSuccess: () => {
      toast({
        title: t("contract.created"),
        description: t("contract.createdSuccess"),
      });
      setIsCreateDialogOpen(false);
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = api.admin.contracts.updateProviderContract.useMutation({
    onSuccess: () => {
      toast({
        title: t("contract.updated"),
        description: t("contract.updatedSuccess"),
      });
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renewContractMutation = api.admin.contracts.renewProviderContract.useMutation({
    onSuccess: () => {
      toast({
        title: t("contract.renewed"),
        description: t("contract.renewedSuccess"),
      });
      refetchContracts();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fallback pour les métriques si non disponibles
  const defaultMetrics: ContractMetrics = {
    totalContracts: contracts.length || 0,
    activeContracts: contracts.filter(c => c.status === "ACTIVE").length || 0,
    pendingContracts: contracts.filter(c => c.status === "PENDING").length || 0,
    expiredContracts: contracts.filter(c => c.status === "EXPIRED").length || 0,
    totalRevenue: contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0),
    averageCommission: 12.5,
    renewalRate: 85,
    expiringContracts: contracts.filter(c => {
      if (!c.endDate) return false;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return new Date(c.endDate) <= thirtyDaysFromNow && c.status === "ACTIVE";
    }).length || 0,
  };

  const metrics = contractMetrics || defaultMetrics;

  const getStatusBadge = (status: ContractStatus) => {
    const statusConfig = {
      ACTIVE: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: t("status.active") },
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: t("status.pending") },
      EXPIRED: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: t("status.expired") },
      TERMINATED: { color: "bg-gray-100 text-gray-800", icon: AlertCircle, label: t("status.terminated") },
      DRAFT: { color: "bg-blue-100 text-blue-800", icon: Edit, label: t("status.draft") },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleCreateContract = (formData: FormData) => {
    const contractData = {
      providerId: formData.get("providerId") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      commissionRate: parseFloat(formData.get("commissionRate") as string),
      startDate: new Date(formData.get("startDate") as string),
      endDate: new Date(formData.get("endDate") as string),
      terms: formData.get("terms") as string,
    };

    createContractMutation.mutate(contractData);
  };

  const handleRenewContract = (contractId: string) => {
    renewContractMutation.mutate({ contractId });
  };

  if (contractsLoading || metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("contracts.title")}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("contracts.title")}</h1>
          <p className="text-muted-foreground">{t("contracts.description")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("contract.create")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("contract.createNew")}</DialogTitle>
              <DialogDescription>{t("contract.createDescription")}</DialogDescription>
            </DialogHeader>
            <form action={handleCreateContract} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="providerId">{t("contract.provider")}</Label>
                  <Select name="providerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder={t("contract.selectProvider")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provider1">Prestataire A</SelectItem>
                      <SelectItem value="provider2">Prestataire B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">{t("contract.title")}</Label>
                  <Input name="title" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("contract.description")}</Label>
                <Textarea name="description" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">{t("contract.commission")}</Label>
                  <Input 
                    name="commissionRate" 
                    type="number" 
                    step="0.1" 
                    placeholder="12.5"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t("contract.startDate")}</Label>
                  <Input name="startDate" type="date" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t("contract.endDate")}</Label>
                <Input name="endDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">{t("contract.terms")}</Label>
                <Textarea name="terms" rows={4} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createContractMutation.isPending}
                >
                  {createContractMutation.isPending && (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {t("contract.create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.totalContracts")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalContracts}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.activeContracts} {t("contracts.active")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.totalRevenue")}</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.averageCommission}% {t("contracts.avgCommission")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.renewalRate")}</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.renewalRate}%</p>
            <Progress value={metrics.renewalRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.expiringContracts")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{metrics.expiringContracts}</p>
            <p className="text-xs text-muted-foreground">{t("contracts.expiringSoon")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("contracts.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ContractStatus | "ALL")}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("status.all")}</SelectItem>
            <SelectItem value="ACTIVE">{t("status.active")}</SelectItem>
            <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
            <SelectItem value="EXPIRED">{t("status.expired")}</SelectItem>
            <SelectItem value="TERMINATED">{t("status.terminated")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Onglets pour organiser les contrats */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            {t("tabs.all")} ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            {t("tabs.active")} ({contracts.filter(c => c.status === "ACTIVE").length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t("tabs.pending")} ({contracts.filter(c => c.status === "PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            {t("tabs.expiring")} ({metrics.expiringContracts})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {contracts.length > 0 ? (
            <div className="grid gap-4">
              {contracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{contract.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {contract.provider?.name} • {t("contract.commission")}: {contract.commissionRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(contract.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-sm">
                          {t("contract.value")}: <span className="font-semibold">{formatCurrency(contract.totalValue || 0)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contract.description}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          {t("common.view")}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          {t("common.download")}
                        </Button>
                        {contract.status === "ACTIVE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRenewContract(contract.id)}
                            disabled={renewContractMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            {t("contract.renew")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("contracts.noContracts")}</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {t("contracts.noContractsDescription")}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("contract.createFirst")}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {contracts.filter(c => c.status === "ACTIVE").map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{contract.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {contract.provider?.name}
                    </p>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("contract.commission")}</p>
                    <p className="font-semibold">{contract.commissionRate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("contract.value")}</p>
                    <p className="font-semibold">{formatCurrency(contract.totalValue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("contract.endDate")}</p>
                    <p className="font-semibold">{formatDate(contract.endDate)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {contracts.filter(c => c.status === "PENDING").map((contract) => (
            <Card key={contract.id} className="border-yellow-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{contract.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {contract.provider?.name}
                    </p>
                  </div>
                  {getStatusBadge(contract.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {t("contract.awaitingApproval")}
                  </p>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      {t("common.approve")}
                    </Button>
                    <Button size="sm" variant="destructive">
                      {t("common.reject")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          {contracts.filter(c => {
            if (!c.endDate || c.status !== "ACTIVE") return false;
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return new Date(c.endDate) <= thirtyDaysFromNow;
          }).map((contract) => (
            <Card key={contract.id} className="border-orange-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{contract.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {contract.provider?.name}
                    </p>
                    <p className="text-xs text-orange-600">
                      {t("contract.expiresOn")} {formatDate(contract.endDate)}
                    </p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t("status.expiring")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {t("contract.renewalRecommended")}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleRenewContract(contract.id)}
                    disabled={renewContractMutation.isPending}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {t("contract.renew")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
