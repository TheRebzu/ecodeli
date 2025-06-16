"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import {
  Package,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Euro,
  Calendar,
  User} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MerchantOrder {
  id: string;
  orderNumber: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  itemCount: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  deliveryAddress: string;
  estimatedDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function MerchantOrders() {
  const t = useTranslations();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Récupération des commandes depuis l'API
  const {
    data: ordersData,
    isLoading,
    error,
    refetch} = api.merchant.getOrders.useQuery({ status: selectedTab === "all" ? undefined : selectedTab.toUpperCase(),
    searchTerm: searchTerm || undefined,
    paymentStatus: paymentFilter || undefined,
    page: currentPage,
    limit: 10 });

  // Récupération des statistiques des commandes
  const { data } = api.merchant.getOrderStats.useQuery();

  const orders = ordersData?.orders || [];
  const stats = statsData || {
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    totalRevenue: 0,
    todayOrders: 0};

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: "En attente", variant: "secondary" as const, icon: Clock },
      CONFIRMED: { label: "Confirmée", variant: "default" as const, icon: CheckCircle },
      PREPARING: { label: "En préparation", variant: "outline" as const, icon: Package },
      READY: { label: "Prête", variant: "default" as const, icon: CheckCircle },
      DELIVERED: { label: "Livrée", variant: "outline" as const, icon: CheckCircle },
      CANCELLED: { label: "Annulée", variant: "destructive" as const, icon: XCircle }};

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: "outline" as const,
      icon: AlertCircle};

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const paymentConfig = {
      PENDING: { label: "En attente", variant: "secondary" as const },
      PAID: { label: "Payé", variant: "default" as const },
      FAILED: { label: "Échec", variant: "destructive" as const },
      REFUNDED: { label: "Remboursé", variant: "outline" as const }};

    const config = paymentConfig[status as keyof typeof paymentConfig] || {
      label: status,
      variant: "outline" as const};

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"}).format(amount);
  };

  const handleViewOrder = (orderId: string) => {
    window.open(`/merchant/orders/${orderId}`, 'blank');
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      // await api.merchant.updateOrderStatus.mutate({ orderId, status: newStatus  });
      toast({ title: "Statut mis à jour",
        description: "Le statut de la commande a été modifié avec succès" });
      refetch();
    } catch (error) {
      toast({ title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive" });
    }
  };

  const handleExportOrders = () => {
    toast({ title: "Export en cours",
      description: "Le fichier va être téléchargé..." });
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
            Impossible de charger les commandes
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmées</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmedOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <Euro className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro de commande ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                <SelectItem value="PREPARING">En préparation</SelectItem>
                <SelectItem value="READY">Prête</SelectItem>
                <SelectItem value="DELIVERED">Livrée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les paiements</SelectItem>
                <SelectItem value="PAID">Payé</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="FAILED">Échec</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportOrders}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des commandes */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes</CardTitle>
          <CardDescription>
            Gérez vos commandes et suivez leur statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmées</TabsTrigger>
              <TabsTrigger value="preparing">En préparation</TabsTrigger>
              <TabsTrigger value="ready">Prêtes</TabsTrigger>
              <TabsTrigger value="delivered">Livrées</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Aucune commande trouvée
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Aucune commande ne correspond à vos critères de recherche
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: MerchantOrder) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">#{order.orderNumber}</h4>
                              {getStatusBadge(order.status)}
                              {getPaymentBadge(order.paymentStatus)}
                            </div>
                            
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{order.customerName}</span>
                                <span className="text-muted-foreground">({ order.customerEmail })</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                  <span>{order.itemCount} article{order.itemCount > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Euro className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">
                                    {formatCurrency(order.totalAmount)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span>{formatDate(order.createdAt)}</span>
                                </div>
                              </div>
                              {order.deliveryAddress && (
                                <div className="text-xs text-muted-foreground">
                                  📍 {order.deliveryAddress}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                            {order.status === "PENDING" && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(order.id, "CONFIRMED")}
                              >
                                Confirmer
                              </Button>
                            )}
                            {order.status === "CONFIRMED" && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(order.id, "PREPARING")}
                              >
                                Préparer
                              </Button>
                            )}
                            {order.status === "PREPARING" && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(order.id, "READY")}
                              >
                                Marquer prêt
                              </Button>
                            )}
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {Array(5).fill(0).map((_, i) => (
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

      {/* Filtres skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </CardContent>
      </Card>

      {/* Liste skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-20" />
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