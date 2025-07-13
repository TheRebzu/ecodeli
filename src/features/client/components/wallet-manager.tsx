"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  Minus,
  CreditCard,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface WalletData {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  transactions: Array<{
    id: string;
    type: "DEPOSIT" | "WITHDRAWAL" | "PAYMENT" | "REFUND";
    amount: number;
    description: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    createdAt: string;
  }>;
}

export default function WalletManager() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecharging, setIsRecharging] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  // Récupération des données du portefeuille
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/client/wallet");

        if (!response.ok) {
          throw new Error("Erreur lors du chargement du portefeuille");
        }

        const data = await response.json();
        setWalletData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      setError("Veuillez entrer un montant valide");
      return;
    }

    try {
      setIsRecharging(true);
      setError(null);

      const response = await fetch("/api/client/wallet/recharge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(rechargeAmount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la recharge");
      }

      const result = await response.json();

      // Mise à jour des données du portefeuille
      if (walletData) {
        setWalletData({
          ...walletData,
          balance: walletData.balance + parseFloat(rechargeAmount),
          totalDeposits: walletData.totalDeposits + parseFloat(rechargeAmount),
          transactions: [result.transaction, ...walletData.transactions],
        });
      }

      setRechargeAmount("");
      setIsRechargeDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsRecharging(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      setError("Veuillez entrer un montant valide");
      return;
    }

    if (walletData && parseFloat(withdrawalAmount) > walletData.balance) {
      setError("Solde insuffisant");
      return;
    }

    try {
      setIsWithdrawing(true);
      setError(null);

      const response = await fetch("/api/client/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawalAmount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du retrait");
      }

      const result = await response.json();

      // Mise à jour des données du portefeuille
      if (walletData) {
        setWalletData({
          ...walletData,
          balance: walletData.balance - parseFloat(withdrawalAmount),
          totalWithdrawals:
            walletData.totalWithdrawals + parseFloat(withdrawalAmount),
          transactions: [result.transaction, ...walletData.transactions],
        });
      }

      setWithdrawalAmount("");
      setIsWithdrawalDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "WITHDRAWAL":
        return <Minus className="h-4 w-4 text-red-500" />;
      case "PAYMENT":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case "REFUND":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return "text-green-600";
      case "WITHDRAWAL":
        return "text-red-600";
      case "PAYMENT":
        return "text-blue-600";
      case "REFUND":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
      COMPLETED: { label: "Terminé", color: "bg-green-100 text-green-800" },
      FAILED: { label: "Échoué", color: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!walletData) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solde et actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde actuel</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletData.balance.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              Disponible immédiatement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total déposé</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {walletData.totalDeposits.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Depuis le début</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total retiré</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {walletData.totalWithdrawals.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Depuis le début</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <Dialog
          open={isRechargeDialogOpen}
          onOpenChange={setIsRechargeDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Recharger</span>
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recharger le portefeuille</DialogTitle>
              <DialogDescription>
                Entrez le montant à ajouter à votre portefeuille
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant (€)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRechargeDialogOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleRecharge}
                  disabled={isRecharging || !rechargeAmount}
                  className="flex-1"
                >
                  {isRecharging ? "Recharge..." : "Recharger"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isWithdrawalDialogOpen}
          onOpenChange={setIsWithdrawalDialogOpen}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2">
              <Minus className="h-4 w-4" />
              <span>Retirer</span>
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Retirer de l'argent</DialogTitle>
              <DialogDescription>
                Entrez le montant à retirer vers votre compte bancaire
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant (€)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  min="0"
                  max={walletData.balance}
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Solde disponible : {walletData.balance.toFixed(2)}€
                </p>
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsWithdrawalDialogOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleWithdrawal}
                  disabled={isWithdrawing || !withdrawalAmount}
                  className="flex-1"
                >
                  {isWithdrawing ? "Retrait..." : "Retirer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Historique des transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Historique des transactions</span>
          </CardTitle>
          <CardDescription>Toutes vos transactions récentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {walletData.transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune transaction pour le moment
              </div>
            ) : (
              walletData.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="text-sm font-medium">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}
                    >
                      {transaction.type === "WITHDRAWAL" ? "-" : "+"}
                      {transaction.amount.toFixed(2)}€
                    </span>
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
