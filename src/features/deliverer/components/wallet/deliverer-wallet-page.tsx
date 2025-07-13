"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Wallet,
  TrendingUp,
  Download,
  CreditCard,
  AlertCircle,
  Euro,
  Calendar,
  FileText,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { WithdrawalRequestForm } from "./withdrawal-request-form";

interface WalletData {
  wallet: {
    currentBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    availableForWithdrawal: number;
  };
  statistics: {
    totalDeliveries: number;
    thisMonthEarnings: number;
    averageEarningPerDelivery: number;
    commissionRate: number;
  };
  withdrawals: Array<{
    id: string;
    amount: number;
    status: string;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
    };
    requestedAt: string;
    processedAt?: string;
  }>;
  bankAccounts: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    isDefault: boolean;
  }>;
  recentEarnings: Array<{
    id: string;
    announcementTitle: string;
    grossAmount: number;
    netAmount: number;
    commission: number;
    status: string;
    completedAt?: string;
  }>;
}

const statusConfig = {
  PENDING: {
    label: "En attente",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
  },
  PROCESSING: {
    label: "En cours",
    color: "bg-blue-500",
    textColor: "text-blue-600",
  },
  COMPLETED: {
    label: "Terminé",
    color: "bg-green-500",
    textColor: "text-green-600",
  },
  CANCELLED: {
    label: "Annulé",
    color: "bg-red-500",
    textColor: "text-red-600",
  },
  PAID: { label: "Payé", color: "bg-green-500", textColor: "text-green-600" },
};

export function DelivererWalletPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/deliverer/wallet");
      if (!response.ok) {
        throw new Error("Erreur de chargement");
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (error) {
      console.error("Erreur chargement wallet:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger votre portefeuille",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de votre portefeuille...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Impossible de charger les données du portefeuille.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec solde principal */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💰 Mon Portefeuille
            </h1>
            <p className="text-gray-600">
              Gérez vos gains et demandes de retrait
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(data.wallet.currentBalance)}
              </div>
              <div className="text-sm text-green-700">Solde disponible</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(data.wallet.totalEarnings)}
              </div>
              <div className="text-sm text-blue-700">Gains totaux</div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatPrice(data.statistics.thisMonthEarnings)}
              </div>
              <div className="text-sm text-orange-700">Ce mois-ci</div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.statistics.totalDeliveries}
              </div>
              <div className="text-sm text-purple-700">Livraisons</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex gap-4">
        <Dialog
          open={showWithdrawalDialog}
          onOpenChange={setShowWithdrawalDialog}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={data.wallet.availableForWithdrawal < 10}
            >
              <Download className="w-4 h-4 mr-2" />
              Demander un retrait
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Demande de retrait</DialogTitle>
              <DialogDescription>
                Retirez vos gains vers votre compte bancaire
              </DialogDescription>
            </DialogHeader>
            <WithdrawalRequestForm
              availableBalance={data.wallet.availableForWithdrawal}
              bankAccounts={data.bankAccounts}
              onSuccess={() => {
                setShowWithdrawalDialog(false);
                loadWalletData();
              }}
            />
          </DialogContent>
        </Dialog>

        <Button variant="outline">
          <CreditCard className="w-4 h-4 mr-2" />
          Gérer mes comptes bancaires
        </Button>

        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Télécharger relevé
        </Button>
      </div>

      {/* Informations commission */}
      <Card>
        <CardContent className="p-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              💡 Commission EcoDeli
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <strong>Commission prélevée:</strong>{" "}
                {data.statistics.commissionRate}%
              </div>
              <div>
                <strong>Votre part:</strong>{" "}
                {100 - data.statistics.commissionRate}%
              </div>
              <div>
                <strong>Gain moyen par livraison:</strong>{" "}
                {formatPrice(data.statistics.averageEarningPerDelivery)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets pour détails */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="earnings">
            Gains récents ({data.recentEarnings.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            Retraits ({data.withdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          {data.recentEarnings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun gain enregistré pour le moment.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {data.recentEarnings.map((earning) => {
                const statusInfo =
                  statusConfig[earning.status as keyof typeof statusConfig] ||
                  statusConfig.PENDING;

                return (
                  <Card key={earning.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {earning.announcementTitle}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {earning.completedAt
                              ? `Livré le ${formatDate(earning.completedAt)}`
                              : "En cours"}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <div className="text-lg font-bold text-green-600">
                              {formatPrice(earning.netAmount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Brut: {formatPrice(earning.grossAmount)} -
                              Commission: {formatPrice(earning.commission)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          {data.withdrawals.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucune demande de retrait effectuée.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {data.withdrawals.map((withdrawal) => {
                const statusInfo =
                  statusConfig[
                    withdrawal.status as keyof typeof statusConfig
                  ] || statusConfig.PENDING;

                return (
                  <Card key={withdrawal.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                            <span className="text-lg font-bold">
                              {formatPrice(withdrawal.amount)}
                            </span>
                          </div>

                          {withdrawal.bankAccount && (
                            <p className="text-sm text-gray-600">
                              Vers {withdrawal.bankAccount.bankName} -{" "}
                              {withdrawal.bankAccount.accountNumber}
                            </p>
                          )}

                          <p className="text-xs text-gray-500">
                            Demandé le {formatDate(withdrawal.requestedAt)}
                            {withdrawal.processedAt &&
                              ` • Traité le ${formatDate(withdrawal.processedAt)}`}
                          </p>
                        </div>

                        <div className="text-right">
                          <Button variant="outline" size="sm">
                            👁️ Détails
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Livraisons totales:</span>
                  <strong>{data.statistics.totalDeliveries}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Gains totaux:</span>
                  <strong>{formatPrice(data.statistics.totalEarnings)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Gain moyen/livraison:</span>
                  <strong>
                    {formatPrice(data.statistics.averageEarningPerDelivery)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Commission EcoDeli:</span>
                  <strong>{data.statistics.commissionRate}%</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Ce mois-ci
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Gains du mois:</span>
                  <strong className="text-green-600">
                    {formatPrice(data.statistics.thisMonthEarnings)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Solde disponible:</span>
                  <strong className="text-blue-600">
                    {formatPrice(data.wallet.currentBalance)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>En attente de paiement:</span>
                  <strong className="text-orange-600">
                    {formatPrice(data.wallet.pendingBalance)}
                  </strong>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  💳 Modalités de paiement
                </h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>
                    • Les gains sont disponibles après validation de la
                    livraison
                  </li>
                  <li>• Retrait minimum: 10€</li>
                  <li>• Retrait maximum: 5000€ par demande</li>
                  <li>• Délai de traitement: 1-3 jours ouvrés</li>
                  <li>
                    • Commission EcoDeli: {data.statistics.commissionRate}% sur
                    chaque livraison
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
