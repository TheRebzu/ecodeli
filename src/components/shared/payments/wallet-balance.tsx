"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Eye,
  Plus
} from "lucide-react";

interface WalletData {
  balance: number;
  pendingBalance: number;
  currency: string;
  lastTransaction?: {
    amount: number;
    type: "credit" | "debit";
    description: string;
    date: Date;
  };
}

interface WalletBalanceProps {
  walletData?: WalletData;
  isLoading?: boolean;
  onTopUp?: () => void;
  onWithdraw?: () => void;
  showActions?: boolean;
}

const defaultWallet: WalletData = {
  balance: 1247.50,
  pendingBalance: 125.25,
  currency: "EUR",
  lastTransaction: {
    amount: 45.75,
    type: "credit",
    description: "Livraison #12345",
    date: new Date()
  }
};

export function WalletBalance({ 
  walletData = defaultWallet,
  isLoading = false,
  onTopUp,
  onWithdraw,
  showActions = true
}: WalletBalanceProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: walletData.currency
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-24"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="flex gap-2">
            <div className="h-9 bg-gray-200 rounded flex-1"></div>
            <div className="h-9 bg-gray-200 rounded flex-1"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Solde du portefeuille
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Solde principal */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Solde disponible</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(walletData.balance)}
          </p>
        </div>

        {/* Solde en attente */}
        {walletData.pendingBalance > 0 && (
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
            <div>
              <p className="text-sm font-medium">En attente</p>
              <p className="text-xs text-muted-foreground">
                Sera crédité sous 24h
              </p>
            </div>
            <Badge variant="outline">
              {formatCurrency(walletData.pendingBalance)}
            </Badge>
          </div>
        )}

        {/* Dernière transaction */}
        {walletData.lastTransaction && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Dernière transaction</p>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  walletData.lastTransaction.type === 'credit' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {walletData.lastTransaction.type === 'credit' ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {walletData.lastTransaction.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(walletData.lastTransaction.date)}
                  </p>
                </div>
              </div>
              <div className={`text-sm font-medium ${
                walletData.lastTransaction.type === 'credit' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {walletData.lastTransaction.type === 'credit' ? '+' : '-'}
                {formatCurrency(Math.abs(walletData.lastTransaction.amount))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onTopUp}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Recharger
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onWithdraw}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Retirer
              </Button>
            </div>
            <Button variant="default" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Voir l'historique
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export par défaut pour compatibilité
export default WalletBalance;
