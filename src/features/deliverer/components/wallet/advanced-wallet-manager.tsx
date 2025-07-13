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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wallet,
  TrendingUp,
  Download,
  Plus,
  Minus,
  CreditCard,
  Calendar,
  Filter,
  Euro,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AdvancedWalletManagerProps {
  delivererId: string;
}

interface WalletBalance {
  current: number;
  pending: number;
  total: number;
  lastUpdate: string;
}

interface Transaction {
  id: string;
  type: "earning" | "withdrawal" | "bonus" | "penalty" | "refund";
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  deliveryId?: string;
  reference: string;
  createdAt: string;
  processedAt?: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  bankAccount: string;
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

interface BankAccount {
  id: string;
  iban: string;
  bic: string;
  accountHolder: string;
  bankName: string;
  isDefault: boolean;
}

export default function AdvancedWalletManager({
  delivererId,
}: AdvancedWalletManagerProps) {
  const t = useTranslations("deliverer.wallet");
  const [balance, setBalance] = useState<WalletBalance>({
    current: 0,
    pending: 0,
    total: 0,
    lastUpdate: "",
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchWalletData();
  }, [delivererId]);

  const fetchWalletData = async () => {
    try {
      const [balanceRes, transactionsRes, withdrawalsRes, bankAccountsRes] =
        await Promise.all([
          fetch(`/api/deliverer/wallet?delivererId=${delivererId}`),
          fetch(`/api/deliverer/wallet/operations?delivererId=${delivererId}`),
          fetch(`/api/deliverer/wallet/withdrawals?delivererId=${delivererId}`),
          fetch(
            `/api/deliverer/wallet/bank-accounts?delivererId=${delivererId}`,
          ),
        ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balance);
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions || []);
      }

      if (withdrawalsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json();
        setWithdrawals(withdrawalsData.withdrawals || []);
      }

      if (bankAccountsRes.ok) {
        const bankAccountsData = await bankAccountsRes.json();
        setBankAccounts(bankAccountsData.accounts || []);
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (
      !amount ||
      amount <= 0 ||
      amount > balance.current ||
      !selectedBankAccount
    )
      return;

    try {
      const response = await fetch("/api/deliverer/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivererId,
          amount,
          bankAccountId: selectedBankAccount,
        }),
      });

      if (response.ok) {
        await fetchWalletData();
        setWithdrawalAmount("");
        setSelectedBankAccount("");
      }
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earning":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "withdrawal":
        return <Minus className="h-4 w-4 text-red-600" />;
      case "bonus":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default:
        return <Euro className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadge = (status: string) => {
    const statusConfig = {
      completed: {
        color: "bg-green-100 text-green-800",
        label: t("status.completed"),
      },
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("status.pending"),
      },
      failed: { color: "bg-red-100 text-red-800", label: t("status.failed") },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getWithdrawalBadge = (status: string) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("withdrawal_status.pending"),
      },
      processing: {
        color: "bg-blue-100 text-blue-800",
        label: t("withdrawal_status.processing"),
      },
      completed: {
        color: "bg-green-100 text-green-800",
        label: t("withdrawal_status.completed"),
      },
      rejected: {
        color: "bg-red-100 text-red-800",
        label: t("withdrawal_status.rejected"),
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (typeFilter !== "all" && transaction.type !== typeFilter) return false;
    if (dateFilter !== "all") {
      const transactionDate = new Date(transaction.createdAt);
      const now = new Date();
      switch (dateFilter) {
        case "week":
          return (
            transactionDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          );
        case "month":
          return (
            transactionDate >=
            new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          );
        case "quarter":
          return (
            transactionDate >=
            new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          );
      }
    }
    return true;
  });

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("balance.current")}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{balance.current.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("balance.last_update")}:{" "}
              {new Date(balance.lastUpdate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("balance.pending")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{balance.pending.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("balance.pending_description")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("balance.total_earned")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{balance.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("balance.total_description")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("filters.date")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all_time")}</SelectItem>
              <SelectItem value="week">{t("filters.this_week")}</SelectItem>
              <SelectItem value="month">{t("filters.this_month")}</SelectItem>
              <SelectItem value="quarter">
                {t("filters.this_quarter")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("filters.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all_types")}</SelectItem>
              <SelectItem value="earning">
                {t("transaction_types.earning")}
              </SelectItem>
              <SelectItem value="withdrawal">
                {t("transaction_types.withdrawal")}
              </SelectItem>
              <SelectItem value="bonus">
                {t("transaction_types.bonus")}
              </SelectItem>
              <SelectItem value="penalty">
                {t("transaction_types.penalty")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t("actions.withdraw")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("withdrawal_dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("withdrawal_dialog.description", {
                  balance: balance.current.toFixed(2),
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">{t("withdrawal_dialog.amount")}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  max={balance.current}
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="bankAccount">
                  {t("withdrawal_dialog.bank_account")}
                </Label>
                <Select
                  value={selectedBankAccount}
                  onValueChange={setSelectedBankAccount}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("withdrawal_dialog.select_account")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bankName} - ****{account.iban.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleWithdrawalRequest}
                disabled={
                  !withdrawalAmount ||
                  !selectedBankAccount ||
                  parseFloat(withdrawalAmount) > balance.current
                }
              >
                {t("withdrawal_dialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">
            {t("tabs.transactions")}
          </TabsTrigger>
          <TabsTrigger value="withdrawals">{t("tabs.withdrawals")}</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <h4 className="font-semibold">{transaction.description}</h4>
                    <p className="text-sm text-gray-600">
                      {t("reference")}: {transaction.reference}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-semibold ${transaction.type === "earning" || transaction.type === "bonus" ? "text-green-600" : "text-red-600"}`}
                    >
                      {transaction.type === "earning" ||
                      transaction.type === "bonus"
                        ? "+"
                        : "-"}
                      €{transaction.amount.toFixed(2)}
                    </span>
                    {getTransactionBadge(transaction.status)}
                  </div>
                  {transaction.deliveryId && (
                    <p className="text-xs text-gray-500">
                      {t("delivery_id")}: {transaction.deliveryId}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredTransactions.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("empty_transactions.title")}
                </h3>
                <p className="text-gray-600 text-center">
                  {t("empty_transactions.description")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4" />
                  <div>
                    <h4 className="font-semibold">
                      {t("withdrawal_to")} {withdrawal.bankAccount}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {t("requested_at")}:{" "}
                      {new Date(withdrawal.requestedAt).toLocaleString()}
                    </p>
                    {withdrawal.rejectionReason && (
                      <p className="text-sm text-red-600">
                        {t("rejection_reason")}: {withdrawal.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-red-600">
                      -€{withdrawal.amount.toFixed(2)}
                    </span>
                    {getWithdrawalBadge(withdrawal.status)}
                  </div>
                  {withdrawal.processedAt && (
                    <p className="text-xs text-gray-500">
                      {t("processed_at")}:{" "}
                      {new Date(withdrawal.processedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {withdrawals.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Download className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("empty_withdrawals.title")}
                </h3>
                <p className="text-gray-600 text-center">
                  {t("empty_withdrawals.description")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
