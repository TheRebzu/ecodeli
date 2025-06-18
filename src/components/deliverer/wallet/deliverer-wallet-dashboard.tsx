"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import WalletBalance from "@/components/shared/payments/wallet-balance";
import {
  RefreshCw,
  ArrowUpFromLine,
  Wallet,
  BanknoteIcon,
  BarChart,
  Clock,
  ArrowRight,
  Eye
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DelivererWalletDashboard() {
  const t = useTranslations("wallet");
  const { data } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Récupérer les données du portefeuille
  const { data: walletData, isLoading: isLoadingWallet } =
    api.wallet.getMyWallet.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  // Récupérer les demandes de retrait en attente
  const { data: pendingWithdrawals, isLoading: isLoadingWithdrawals } =
    api.withdrawal.getMyWithdrawals.useQuery(
      { status: "PENDING", limit: 5 },
      {
        refetchOnWindowFocus: false,
      },
    );

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        api.wallet.getMyWallet.refetch(),
        api.withdrawal.getMyWithdrawals.refetch(),
      ]);

      toast({
        title: t("refreshSuccess"),
        description: t("dataRefreshed"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("refreshError"),
        description: typeof error === "string" ? error : t("genericError"),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Accéder à la page de retrait
  const handleRequestWithdrawal = () => {
    router.push("/deliverer/wallet/withdrawal");
  };

  // Accéder à l'historique des paiements
  const handleViewPayments = () => {
    router.push("/deliverer/payments");
  };

  // Afficher un écran de chargement
  if (isLoadingWallet && !walletData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("dashboardTitle")}
          </h1>
          <Button variant="outline" size="sm" disabled={true}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Contenu principal
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8" />
          {t("dashboardTitle")}
        </h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>

          <Button size="sm" onClick={handleRequestWithdrawal}>
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            {t("requestWithdrawal")}
          </Button>
        </div>
      </div>

      {/* Cartes d'aperçu rapide */}
      {walletData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BanknoteIcon className="h-4 w-4 text-primary" />
                {t("availableBalance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(
                  walletData.wallet.balance,
                  walletData.wallet.currency,
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("withdrawalAvailable")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart className="h-4 w-4 text-green-500" />
                {t("totalEarned")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(
                  walletData.wallet.totalEarned || 0,
                  walletData.wallet.currency,
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("sinceJoining")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                {t("pendingWithdrawals")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-amber-600">
                  {pendingWithdrawals ? pendingWithdrawals.withdrawals.length : 0}
                </div>
                {pendingWithdrawals && pendingWithdrawals.withdrawals.length > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    {t("inProgress")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("awaitingProcessing")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historique des paiements et Demandes de retrait */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget Historique des Paiements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("paymentHistory")}</span>
              <Button variant="ghost" size="sm" onClick={handleViewPayments}>
                <Eye className="h-4 w-4 mr-2" />
                {t("viewAll")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WalletBalance userId={data?.user?.id} />
          </CardContent>
        </Card>

        {/* Widget Demandes de Retrait */}
        <Card>
          <CardHeader>
            <CardTitle>{t("withdrawalRequests")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingWithdrawals ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingWithdrawals && pendingWithdrawals.withdrawals.length > 0 ? (
              <div className="space-y-3">
                {pendingWithdrawals.withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {formatCurrency(withdrawal.amount, withdrawal.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {withdrawal.status === "PENDING" && t("pending")}
                        {withdrawal.status === "PROCESSING" && t("processing")}
                        {withdrawal.status === "COMPLETED" && t("completed")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        withdrawal.status === "PENDING" ? "secondary" :
                        withdrawal.status === "PROCESSING" ? "default" :
                        "outline"
                      }
                    >
                      {withdrawal.status}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push("/deliverer/wallet/withdrawal/history")}
                >
                  {t("viewAllWithdrawals")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("noWithdrawals")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleRequestWithdrawal}
                >
                  {t("requestFirstWithdrawal")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 