"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingUp,
  Euro,
  Download,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  CreditCard,
  Banknote,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Withdrawal {
  id: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  requestedAt: string;
  processedAt?: string;
  bankAccount: {
    iban: string;
    accountHolder: string;
  };
  reference: string;
}

interface BankAccount {
  id: string;
  iban: string;
  bic: string;
  accountHolder: string;
  isDefault: boolean;
}

export default function DelivererWithdrawalsPage() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer le solde disponible
      const balanceResponse = await fetch("/api/deliverer/wallet/balance");
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setAvailableBalance(balanceData.availableBalance);
      }

      // Récupérer l'historique des retraits
      const withdrawalsResponse = await fetch(
        "/api/deliverer/wallet/withdrawals",
      );
      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json();
        setWithdrawals(withdrawalsData.withdrawals);
      }

      // Récupérer les comptes bancaires
      const accountsResponse = await fetch(
        "/api/deliverer/wallet/bank-accounts",
      );
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setBankAccounts(accountsData.accounts);
        if (accountsData.accounts.length > 0) {
          const defaultAccount = accountsData.accounts.find(
            (acc: BankAccount) => acc.isDefault,
          );
          setSelectedBankAccount(
            defaultAccount?.id || accountsData.accounts[0].id,
          );
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedBankAccount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount < 50) {
      toast.error("Le montant minimum de retrait est de 50€");
      return;
    }

    if (amount > availableBalance) {
      toast.error("Solde insuffisant");
      return;
    }

    try {
      const response = await fetch("/api/deliverer/wallet/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bankAccountId: selectedBankAccount,
        }),
      });

      if (response.ok) {
        toast.success("Demande de retrait envoyée avec succès");
        setShowWithdrawDialog(false);
        setWithdrawAmount("");
        await fetchData(); // Recharger les données
      } else {
        throw new Error("Failed to create withdrawal");
      }
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      toast.error("Erreur lors de la création du retrait");
    }
  };

  const exportWithdrawals = async () => {
    try {
      const response = await fetch("/api/deliverer/wallet/withdrawals/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `retraits-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("Export réussi");
      }
    } catch (error) {
      console.error("Error exporting withdrawals:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        color: "bg-yellow-100 text-yellow-800",
        label: "En attente",
        icon: Clock,
      },
      PROCESSING: {
        color: "bg-blue-100 text-blue-800",
        label: "En cours",
        icon: AlertCircle,
      },
      COMPLETED: {
        color: "bg-green-100 text-green-800",
        label: "Terminé",
        icon: CheckCircle,
      },
      FAILED: {
        color: "bg-red-100 text-red-800",
        label: "Échoué",
        icon: XCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const maskIBAN = (iban: string) => {
    return iban
      .replace(/(.{4})/g, "$1 ")
      .trim()
      .replace(/\s(?=\w{4})/g, "****");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentification requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à cette page
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retraits"
        description="Gérez vos retraits et consultez l'historique"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportWithdrawals}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Dialog
            open={showWithdrawDialog}
            onOpenChange={setShowWithdrawDialog}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau retrait
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Demande de retrait</DialogTitle>
                <DialogDescription>
                  Retirez vos gains vers votre compte bancaire
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Montant (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="50"
                    max={availableBalance}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="50.00"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Solde disponible: {availableBalance.toFixed(2)}€
                  </p>
                </div>

                <div>
                  <Label htmlFor="bankAccount">Compte bancaire</Label>
                  <Select
                    value={selectedBankAccount}
                    onValueChange={setSelectedBankAccount}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {maskIBAN(account.iban)} - {account.accountHolder}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Informations importantes :</strong>
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Montant minimum : 50€</li>
                    <li>• Délai de traitement : 2-3 jours ouvrés</li>
                    <li>• Aucun frais de retrait</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawDialog(false)}
                >
                  Annuler
                </Button>
                <Button onClick={handleWithdraw}>Confirmer le retrait</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Solde disponible</p>
                <p className="text-2xl font-bold">
                  {availableBalance.toFixed(2)}€
                </p>
              </div>
              <Banknote className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Retraits ce mois</p>
                <p className="text-2xl font-bold">
                  {
                    withdrawals.filter(
                      (w) =>
                        new Date(w.requestedAt).getMonth() ===
                        new Date().getMonth(),
                    ).length
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total retiré</p>
                <p className="text-2xl font-bold">
                  {withdrawals
                    .filter((w) => w.status === "COMPLETED")
                    .reduce((sum, w) => sum + w.amount, 0)
                    .toFixed(2)}
                  €
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des retraits</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun retrait effectué</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold">
                        {withdrawal.amount.toFixed(2)}€
                      </p>
                      <p className="text-sm text-gray-600">
                        Référence: {withdrawal.reference}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(withdrawal.requestedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {maskIBAN(withdrawal.bankAccount.iban)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {withdrawal.bankAccount.accountHolder}
                      </p>
                    </div>
                    {getStatusBadge(withdrawal.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
