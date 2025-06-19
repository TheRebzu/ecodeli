"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Plus,
  Minus,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Euro,
} from "lucide-react";

import { cn } from "@/lib/utils/common";
import { useToast } from "@/components/ui/use-toast";
import { 
  type Wallet as WalletType,
  type WalletTransaction,
  type TopUpWalletData,
  type WithdrawFromWalletData,
  formatPaymentAmount,
} from "@/types/client/payments";
import { useClientPayments } from "@/hooks/client/use-client-payments";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WalletManagerProps {
  showTransactionHistory?: boolean;
  maxTransactions?: number;
  allowTopUp?: boolean;
  allowWithdraw?: boolean;
}

export function WalletManager({
  showTransactionHistory = true,
  maxTransactions = 10,
  allowTopUp = true,
  allowWithdraw = true,
}: WalletManagerProps) {
  const t = useTranslations("payments");
  const { toast } = useToast();

  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");

  // Utilisation du hook unifié pour la gestion des paiements
  const {
    wallet,
    paymentMethods,
    isLoadingWallet,
    error,
    topUpWallet,
    withdrawFromWallet,
    refetchWallet,
    isToppingUpWallet,
    isWithdrawingFromWallet,
  } = useClientPayments();

  const handleTopUp = async () => {
    if (!topUpAmount || !selectedPaymentMethodId) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("fillAllFields"),
      });
      return;
    }

    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("invalidAmount"),
      });
      return;
    }

    try {
      const topUpData: TopUpWalletData = {
        amount: Math.round(amount * 100), // Convert to cents
        paymentMethodId: selectedPaymentMethodId,
      };

      await topUpWallet(topUpData);
      setIsTopUpDialogOpen(false);
      setTopUpAmount("");
      setSelectedPaymentMethodId("");
    } catch (error) {
      console.error("Error topping up wallet:", error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("fillAllFields"),
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("invalidAmount"),
      });
      return;
    }

    if (wallet && amount * 100 > wallet.balance) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("insufficientFunds"),
      });
      return;
    }

    try {
      const withdrawData: WithdrawFromWalletData = {
        amount: Math.round(amount * 100), // Convert to cents
        bankAccountId: "default", // This should be selected from user's bank accounts
      };

      await withdrawFromWallet(withdrawData);
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount("");
    } catch (error) {
      console.error("Error withdrawing from wallet:", error);
    }
  };

  const getTransactionIcon = (transaction: WalletTransaction) => {
    switch (transaction.type) {
      case "credit":
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case "debit":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case "freeze":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "unfreeze":
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      default:
        return <Euro className="h-4 w-4" />;
    }
  };

  const getTransactionStatusBadge = (status: WalletTransaction["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">{t("completed")}</Badge>;
      case "pending":
        return <Badge variant="secondary">{t("pending")}</Badge>;
      case "failed":
        return <Badge variant="destructive">{t("failed")}</Badge>;
      case "canceled":
        return <Badge variant="outline">{t("canceled")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingWallet) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {t("wallet")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-32" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {showTransactionHistory && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t("wallet")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t("errorLoadingWallet")}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => refetchWallet()}
            >
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableBalance = wallet.balance - wallet.frozenAmount;
  const displayedTransactions = wallet.transactions?.slice(0, maxTransactions) || [];

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t("wallet")}
              </CardTitle>
              <CardDescription>
                {t("walletDescription")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Balance Display */}
            <div className="text-center">
              <div className="text-3xl font-bold">
                {formatPaymentAmount(availableBalance, wallet.currency)}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("availableBalance")}
              </p>
              {wallet.frozenAmount > 0 && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {formatPaymentAmount(wallet.frozenAmount, wallet.currency)} {t("frozen")}
                  </Badge>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-sm font-medium text-green-800">
                  {wallet.transactions
                    ?.filter(t => t.type === "credit" && t.status === "completed")
                    ?.length || 0}
                </div>
                <div className="text-xs text-green-600">{t("credits")}</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-sm font-medium text-red-800">
                  {wallet.transactions
                    ?.filter(t => t.type === "debit" && t.status === "completed")
                    ?.length || 0}
                </div>
                <div className="text-xs text-red-600">{t("debits")}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              {allowTopUp && (
                <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      {t("topUp")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("topUpWallet")}</DialogTitle>
                      <DialogDescription>
                        {t("topUpDescription")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>{t("amount")}</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                            className="pr-12"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-sm text-muted-foreground">€</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t("paymentMethod")}</Label>
                        <Select 
                          value={selectedPaymentMethodId} 
                          onValueChange={setSelectedPaymentMethodId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectPaymentMethod")} />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  {method.type === "card" && method.card
                                    ? `${method.card.brand.toUpperCase()} •••• ${method.card.last4}`
                                    : method.type}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsTopUpDialogOpen(false)}
                        disabled={isToppingUpWallet}
                      >
                        {t("cancel")}
                      </Button>
                      <Button 
                        onClick={handleTopUp}
                        disabled={isToppingUpWallet}
                      >
                        {isToppingUpWallet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("topUp")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {allowWithdraw && (
                <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" disabled={availableBalance <= 0}>
                      <Minus className="mr-2 h-4 w-4" />
                      {t("withdraw")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("withdrawFromWallet")}</DialogTitle>
                      <DialogDescription>
                        {t("withdrawDescription")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>{t("amount")}</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            max={availableBalance / 100}
                            className="pr-12"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-sm text-muted-foreground">€</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("maxAmount")}: {formatPaymentAmount(availableBalance, wallet.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsWithdrawDialogOpen(false)}
                        disabled={isWithdrawingFromWallet}
                      >
                        {t("cancel")}
                      </Button>
                      <Button 
                        onClick={handleWithdraw}
                        disabled={isWithdrawingFromWallet}
                      >
                        {isWithdrawingFromWallet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("withdraw")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {showTransactionHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("transactionHistory")}
            </CardTitle>
            <CardDescription>
              {t("recentWalletTransactions")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayedTransactions.length === 0 ? (
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">{t("noWalletTransactions")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("type")}</TableHead>
                      <TableHead>{t("description")}</TableHead>
                      <TableHead className="text-right">{t("amount")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {new Date(transaction.createdAt).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction)}
                            <span className="capitalize">{t(transaction.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{transaction.description}</span>
                            {transaction.reference && (
                              <span className="text-sm text-muted-foreground">
                                {t("reference")}: {transaction.reference.type} ({transaction.reference.id.slice(-8)})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span
                            className={cn(
                              transaction.type === "debit" ? "text-red-600" : "text-green-600"
                            )}
                          >
                            {transaction.type === "debit" ? "-" : "+"}
                            {formatPaymentAmount(transaction.amount, transaction.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getTransactionStatusBadge(transaction.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {wallet.transactions && wallet.transactions.length > maxTransactions && (
                  <div className="text-center pt-4">
                    <Button variant="outline" size="sm">
                      {t("viewAllTransactions")} ({wallet.transactions.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}