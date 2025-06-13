"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@/utils/document-utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  AlertCircle,
  Check,
  CreditCard,
  ArrowUp,
  Zap,
  RefreshCw,
  Info,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types pour les transactions
export type TransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type TransactionType =
  | "EARNING"
  | "WITHDRAWAL"
  | "REFUND"
  | "SUBSCRIPTION_FEE"
  | "PLATFORM_FEE"
  | "ADJUSTMENT"
  | "BONUS";

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  reference?: string;
  createdAt: Date;
}

interface WalletBalanceProps {
  balance: number;
  currency?: string;
  transactions: Transaction[];
  isLoading?: boolean;
  onRequestWithdrawal: () => void;
  onViewAllTransactions: () => void;
  lastUpdated?: Date;
  pendingAmount?: number;
  reservedAmount?: number;
  availableAmount?: number;
  isDemo?: boolean;
  onRefresh?: () => void;
  error?: string;
  userId?: string;
  className?: string;
}

export const WalletBalance = ({
  balance,
  currency = "EUR",
  transactions,
  isLoading = false,
  onRequestWithdrawal,
  onViewAllTransactions,
  lastUpdated,
  pendingAmount = 0,
  reservedAmount = 0,
  availableAmount,
  isDemo = false,
  onRefresh,
  error,
  userId,
  className,
}: WalletBalanceProps) => {
  const t = useTranslations("wallet");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Convertir les transactions entre entrées et sorties pour l'affichage par onglets
  const incomingTransactions = transactions.filter((tx) =>
    ["EARNING", "REFUND", "ADJUSTMENT", "BONUS"].includes(tx.type),
  );

  const outgoingTransactions = transactions.filter((tx) =>
    ["WITHDRAWAL", "SUBSCRIPTION_FEE", "PLATFORM_FEE"].includes(tx.type),
  );

  // Fonction d'affichage des icônes par type
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "EARNING":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "WITHDRAWAL":
        return <ArrowUpRight className="h-4 w-4 text-amber-500" />;
      case "REFUND":
        return <ArrowDownLeft className="h-4 w-4 text-blue-500" />;
      case "SUBSCRIPTION_FEE":
      case "PLATFORM_FEE":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "ADJUSTMENT":
        return <Check className="h-4 w-4 text-blue-500" />;
      case "BONUS":
        return <ArrowDownLeft className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Fonction d'affichage du statut
  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 text-xs"
          >
            {t("completed")}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
          >
            {t("pending")}
          </Badge>
        );
      case "FAILED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 text-xs"
          >
            {t("failed")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-700 border-slate-200 text-xs"
          >
            {t("cancelled")}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Si disponible n'est pas fourni, calculer à partir du solde et des montants réservés/en attente
  const available = availableAmount ?? balance - pendingAmount - reservedAmount;

  // Gérer le rafraîchissement des données
  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Générer des données de démonstration si nécessaire
  const renderTransactions = (transactions: Transaction[]) => {
    if (isLoading) {
      return (
        <>
          <Skeleton className="h-16 w-full mb-3" />
          <Skeleton className="h-16 w-full mb-3" />
          <Skeleton className="h-16 w-full" />
        </>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mx-auto mb-2" />
          <p>{t("noTransactions")}</p>
        </div>
      );
    }

    return transactions.slice(0, 5).map((transaction) => (
      <div
        key={transaction.id}
        className="flex items-center justify-between border-b pb-3 mb-3 last:mb-0 last:border-0"
      >
        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 p-2 rounded-full">
            {getTransactionIcon(transaction.type)}
          </div>
          <div>
            <div className="flex items-center">
              <p className="font-medium text-sm">
                {t(`transactionTypes.${transaction.type.toLowerCase()}`)}
              </p>
              {isDemo && (
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <span>
                        <Info className="h-3 w-3 ml-1 text-blue-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{t("demoTransaction")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(transaction.createdAt, "dd/MM/yyyy HH:mm")}
            </p>
            {transaction.description && (
              <p
                className="text-xs text-muted-foreground truncate max-w-[200px]"
                title={transaction.description}
              >
                {transaction.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p
            className={`font-medium ${transaction.type === "WITHDRAWAL" || transaction.type === "PLATFORM_FEE" || transaction.type === "SUBSCRIPTION_FEE" ? "text-red-600" : "text-green-600"}`}
          >
            {transaction.type === "WITHDRAWAL" ||
            transaction.type === "PLATFORM_FEE" ||
            transaction.type === "SUBSCRIPTION_FEE"
              ? "-"
              : "+"}
            {formatCurrency(transaction.amount, transaction.currency)}
          </p>
          {getStatusBadge(transaction.status)}
        </div>
      </div>
    ));
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("walletBalance")}
          </CardTitle>
          {isDemo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" />
                    {t("demoMode")}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("demoWalletDescription")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription>{t("walletDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("error")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="flex flex-col space-y-1">
            <span className="text-sm text-muted-foreground">
              {t("availableBalance")}
            </span>
            <span className="text-4xl font-bold">
              {formatCurrency(balance, currency)}
            </span>
          </div>
        )}

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="incoming">{t("incoming")}</TabsTrigger>
            <TabsTrigger value="outgoing">{t("outgoing")}</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-4 space-y-4">
            {renderTransactions(incomingTransactions)}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4 space-y-4">
            {renderTransactions(outgoingTransactions)}
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4 border-t border-b">
            <div className="flex flex-col items-center sm:items-start">
              <p className="text-sm font-medium text-muted-foreground">
                {t("currentBalance")}
              </p>
              <h2 className="text-3xl font-bold">
                {formatCurrency(balance, currency)}
              </h2>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {t("lastUpdated")}: {formatDate(lastUpdated)}
                </p>
              )}
            </div>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {t("refresh")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm font-medium">
                      {t("available")}
                    </span>
                  </div>
                  <span className="font-bold">
                    {formatCurrency(available, currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {pendingAmount > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-amber-500" />
                      <span className="text-sm font-medium">
                        {t("pending")}
                      </span>
                    </div>
                    <span className="font-medium text-amber-500">
                      {formatCurrency(pendingAmount, currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {reservedAmount > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <ArrowUp className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="text-sm font-medium">
                        {t("reserved")}
                      </span>
                    </div>
                    <span className="font-medium text-blue-500">
                      {formatCurrency(reservedAmount, currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between">
        <Button
          variant="outline"
          onClick={onViewAllTransactions}
          className="w-full sm:w-auto"
        >
          {t("viewAllTransactions")}
        </Button>
        <Button onClick={onRequestWithdrawal} className="w-full sm:w-auto">
          {t("requestWithdrawal")}
        </Button>
      </CardFooter>
    </Card>
  );
};
