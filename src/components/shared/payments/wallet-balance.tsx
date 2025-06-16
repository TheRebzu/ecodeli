"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpRight, ArrowDownLeft, History } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/trpc/react";

interface WalletBalanceProps {
  className?: string;
  showActions?: boolean;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onHistory?: () => void;
}

export function WalletBalance({
  className,
  showActions = true,
  onDeposit,
  onWithdraw,
  onHistory,
}: WalletBalanceProps) {
  const t = useTranslations("wallet");
  
  // Utilisation de tRPC pour récupérer le solde du portefeuille
  const { data: walletData, isLoading } = api.wallet.getBalance.useQuery();

  const balance = walletData?.balance || 0;
  const pendingBalance = walletData?.pendingBalance || 0;
  const currency = walletData?.currency || "EUR";

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
            {t("walletBalance")}
          </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("availableBalance")}
            </span>
            <span className="text-2xl font-bold text-green-600">
              {isLoading ? "..." : formatCurrency(balance, currency)}
            </span>
          </div>
          
          {pendingBalance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("pendingBalance")}
              </span>
              <span className="text-sm font-medium text-amber-600">
                {formatCurrency(pendingBalance, currency)}
              </span>
            </div>
          )}
            </div>

        {showActions && (
          <div className="flex gap-2">
            <Button
              onClick={onDeposit}
              className="flex items-center gap-2 flex-1"
              size="sm"
            >
              <ArrowDownLeft className="h-4 w-4" />
              {t("deposit")}
            </Button>
            <Button
              onClick={onWithdraw}
              variant="outline"
              className="flex items-center gap-2 flex-1"
              size="sm"
              disabled={balance <= 0}
            >
              <ArrowUpRight className="h-4 w-4" />
              {t("withdraw")}
            </Button>
              <Button
              onClick={onHistory}
                variant="outline"
                size="sm"
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              {t("history")}
              </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
