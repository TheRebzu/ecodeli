"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Euro,
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  Filter,
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useMerchantPayments } from "@/features/merchant/hooks/use-merchant-payments";
import { useTranslations } from "next-intl";

// Types pour les paiements merchant
interface MerchantPayment {
  id: string;
  orderId: string;
  clientName: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  paymentMethod: "STRIPE" | "PAYPAL" | "BANK_TRANSFER";
  serviceFee: number;
  date: string;
  orderType: "CART_DROP" | "PACKAGE_DELIVERY" | "INTERNATIONAL_PURCHASE";
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  requestDate: string;
  processedDate?: string;
  bankAccount: string;
}

// Données d'exemple (remplacées par API dans la vraie version)
const mockPayments: MerchantPayment[] = [
  {
    id: "PAY-001",
    orderId: "ORD-2024-001",
    clientName: "Marie Dubois",
    amount: 89.99,
    commission: 7.65,
    netAmount: 82.34,
    status: "COMPLETED",
    paymentMethod: "STRIPE",
    serviceFee: 1.8,
    date: "2024-01-20",
    orderType: "CART_DROP",
  },
  {
    id: "PAY-002",
    orderId: "ORD-2024-002",
    clientName: "Pierre Martin",
    amount: 156.5,
    commission: 13.3,
    netAmount: 143.2,
    status: "PENDING",
    paymentMethod: "STRIPE",
    serviceFee: 3.13,
    date: "2024-01-19",
    orderType: "PACKAGE_DELIVERY",
  },
  {
    id: "PAY-003",
    orderId: "ORD-2024-003",
    clientName: "Sophie Laurent",
    amount: 234.0,
    commission: 19.89,
    netAmount: 214.11,
    status: "COMPLETED",
    paymentMethod: "STRIPE",
    serviceFee: 4.68,
    date: "2024-01-18",
    orderType: "INTERNATIONAL_PURCHASE",
  },
];

const mockPayoutRequests: PayoutRequest[] = [
  {
    id: "PAYOUT-001",
    amount: 1250.0,
    status: "COMPLETED",
    requestDate: "2024-01-15",
    processedDate: "2024-01-17",
    bankAccount: "****1234",
  },
  {
    id: "PAYOUT-002",
    amount: 800.5,
    status: "PROCESSING",
    requestDate: "2024-01-20",
    bankAccount: "****1234",
  },
];

export default function MerchantPaymentsPage() {
  const t = useTranslations("merchant.payments");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, stats, loading, error, refreshData, requestWithdrawal } =
    useMerchantPayments({
      page: currentPage,
      limit: 20,
      status: selectedStatus !== "ALL" ? selectedStatus : undefined,
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  if (!data || !stats) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>Aucune donnée disponible</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { payments } = data;

  const getStatusBadge = (status: string) => {
    const variants = {
      COMPLETED: {
        variant: "default" as const,
        text: "Terminé",
        icon: CheckCircle,
      },
      PENDING: {
        variant: "secondary" as const,
        text: "En attente",
        icon: Clock,
      },
      PROCESSING: {
        variant: "outline" as const,
        text: "En traitement",
        icon: RefreshCw,
      },
      FAILED: {
        variant: "destructive" as const,
        text: "Échoué",
        icon: AlertCircle,
      },
      REFUNDED: {
        variant: "outline" as const,
        text: "Remboursé",
        icon: RefreshCw,
      },
      CANCELLED: {
        variant: "destructive" as const,
        text: "Annulé",
        icon: AlertCircle,
      },
    };
    return variants[status as keyof typeof variants] || variants.PENDING;
  };

  const getOrderTypeLabel = (type: string) => {
    const labels = {
      CART_DROP: "Lâcher de chariot",
      PACKAGE_DELIVERY: "Livraison colis",
      INTERNATIONAL_PURCHASE: "Achat international",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredPayments = payments.filter((payment: any) => {
    const matchesSearch =
      searchTerm === "" ||
      (payment.delivery?.client?.profile?.firstName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (payment.delivery?.client?.profile?.lastName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "ALL" || payment.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accès aux Paiements</h1>
          <p className="text-muted-foreground">
            Consultez vos revenus, commissions et demandez des virements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button>
            <Euro className="h-4 w-4 mr-2" />
            Demander un virement
          </Button>
        </div>
      </div>

      {/* Indicateurs financiers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Solde disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.availableBalance.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Prêt pour virement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Revenus totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAmount.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +15% ce mois
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingAmount.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Paiements en cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Commissions EcoDeli
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalAmount * 0.15).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Sur revenus totaux</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payments">Historique paiements</TabsTrigger>
          <TabsTrigger value="payouts">Virements</TabsTrigger>
          <TabsTrigger value="analytics">Analyse</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-6">
          {/* Filtres et recherche */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un paiement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="COMPLETED">Terminé</option>
              <option value="PENDING">En attente</option>
              <option value="FAILED">Échoué</option>
              <option value="REFUNDED">Remboursé</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtres avancés
            </Button>
          </div>

          {/* Liste des paiements */}
          <div className="space-y-4">
            {filteredPayments.map((payment: any) => (
              <Card
                key={payment.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{payment.orderId}</h3>
                        <Badge variant="outline">
                          {getOrderTypeLabel(payment.orderType)}
                        </Badge>
                        <Badge variant={getStatusBadge(payment.status).variant}>
                          {getStatusBadge(payment.status).text}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        Client: {payment.clientName}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Montant brut</p>
                          <p className="font-medium">
                            {payment.amount.toFixed(2)}€
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Commission</p>
                          <p className="font-medium text-red-600">
                            -{payment.commission.toFixed(2)}€
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Frais service</p>
                          <p className="font-medium text-red-600">
                            -{payment.serviceFee.toFixed(2)}€
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Net à recevoir
                          </p>
                          <p className="font-semibold text-green-600">
                            {payment.netAmount.toFixed(2)}€
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Méthode</p>
                          <p className="font-medium">{payment.paymentMethod}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium">
                            {new Date(payment.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPayments.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun paiement trouvé</h3>
                <p className="text-muted-foreground">
                  Aucun paiement ne correspond à vos critères de recherche.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          {/* Demande de virement */}
          <Card>
            <CardHeader>
              <CardTitle>Demander un virement</CardTitle>
              <CardDescription>
                Transférez vos revenus vers votre compte bancaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Solde disponible
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.availableBalance.toFixed(2)}€
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Compte bancaire
                  </p>
                  <p className="font-medium">Compte principal (****1234)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Montant à virer"
                  type="number"
                  max={stats.availableBalance}
                />
                <Button>Demander le virement</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Les virements sont traités sous 2-3 jours ouvrés. Frais de
                virement: 2€.
              </p>
            </CardContent>
          </Card>

          {/* Historique des virements */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des virements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPayoutRequests.map((payout: any) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">
                        {payout.amount.toFixed(2)}€
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Demandé le{" "}
                        {new Date(payout.requestDate).toLocaleDateString()}
                        {payout.processedDate &&
                          ` • Traité le ${new Date(payout.processedDate).toLocaleDateString()}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Compte {payout.bankAccount}
                      </p>
                    </div>
                    <Badge variant={getStatusBadge(payout.status).variant}>
                      {getStatusBadge(payout.status).text}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des revenus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Graphique des revenus sur 12 mois
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Lâcher de chariot</span>
                    <span className="font-medium">45% (650€)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-[45%]"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Livraison colis</span>
                    <span className="font-medium">35% (505€)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-[35%]"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Achat international</span>
                    <span className="font-medium">20% (289€)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full w-[20%]"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  Compte bancaire principal
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  ****1234 - Crédit Agricole
                </p>
                <Button variant="outline" size="sm">
                  Modifier
                </Button>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Notifications</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">
                      Notifier lors des nouveaux paiements
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">
                      Notifier lors des virements traités
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Virements automatiques</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Configurez des virements automatiques quand votre solde
                  atteint un certain montant
                </p>
                <Button variant="outline" size="sm">
                  Configurer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
