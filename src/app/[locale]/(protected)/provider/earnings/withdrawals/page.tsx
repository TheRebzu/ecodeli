"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wallet,
  Plus,
  ArrowDownLeft,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Info,
  DollarSign,
  Calendar
} from "lucide-react";

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  iban: string;
  bic: string;
  isDefault: boolean;
  isVerified: boolean;
  addedAt: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  bankAccountId: string;
  bankAccountName: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  requestedAt: string;
  processedAt?: string;
  rejectionReason?: string;
  estimatedArrival?: string;
}

interface WalletInfo {
  availableBalance: number;
  pendingBalance: number;
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFee: number;
}

export default function ProviderWithdrawalsPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.withdrawals");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    bankName: '',
    iban: '',
    bic: ''
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    bankAccountId: '',
    scheduledDate: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        const [walletRes, accountsRes, withdrawalsRes] = await Promise.all([
          fetch(`/api/provider/earnings/wallet?userId=${user.id}`),
          fetch(`/api/provider/earnings/bank-accounts?userId=${user.id}`),
          fetch(`/api/provider/earnings/withdrawals?userId=${user.id}`)
        ]);

        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData);
        }

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          setBankAccounts(accountsData.accounts || []);
        }

        if (withdrawalsRes.ok) {
          const withdrawalsData = await withdrawalsRes.json();
          setWithdrawals(withdrawalsData.withdrawals || []);
        }
      } catch (error) {
        console.error("Error fetching withdrawal data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAddBankAccount = async () => {
    if (!user?.id || !accountForm.accountName || !accountForm.iban) return;

    try {
      const response = await fetch('/api/provider/earnings/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...accountForm, userId: user.id })
      });

      if (response.ok) {
        const newAccount = await response.json();
        setBankAccounts(prev => [...prev, newAccount]);
        setShowAddAccount(false);
        setAccountForm({ accountName: '', bankName: '', iban: '', bic: '' });
      }
    } catch (error) {
      console.error("Error adding bank account:", error);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!user?.id || !withdrawalForm.amount || !withdrawalForm.bankAccountId) return;

    const amount = parseFloat(withdrawalForm.amount);
    if (!wallet || amount < wallet.minimumWithdrawal || amount > wallet.availableBalance) return;

    try {
      const response = await fetch('/api/provider/earnings/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...withdrawalForm, amount, userId: user.id })
      });

      if (response.ok) {
        const newWithdrawal = await response.json();
        setWithdrawals(prev => [newWithdrawal, ...prev]);
        setShowWithdrawal(false);
        setWithdrawalForm({ amount: '', bankAccountId: '', scheduledDate: '' });
        
        // Update wallet balance
        if (wallet) {
          setWallet(prev => prev ? {
            ...prev,
            availableBalance: prev.availableBalance - amount,
            pendingBalance: prev.pendingBalance + amount
          } : null);
        }
      }
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejeté</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatIBAN = (iban: string) => {
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des informations de retrait...</p>
        </div>
      </div>
    );
  }

  if (!user || !wallet) {
    return (
      <div className="text-center py-8">
        <p>Impossible de charger les informations de portefeuille.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retraits"
        description="Gérez vos retraits vers votre compte bancaire"
      />

      {/* Wallet Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde Disponible</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(wallet.availableBalance)}</div>
            <p className="text-xs text-muted-foreground">prêt à retirer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(wallet.pendingBalance)}</div>
            <p className="text-xs text-muted-foreground">en cours de traitement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frais de Retrait</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(wallet.withdrawalFee)}</div>
            <p className="text-xs text-muted-foreground">par transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
          <DialogTrigger asChild>
            <Button disabled={wallet.availableBalance < wallet.minimumWithdrawal}>
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Demander un retrait
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle Demande de Retrait</DialogTitle>
              <DialogDescription>
                Transférez vos gains vers votre compte bancaire
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Montant à retirer</Label>
                <Input
                  type="number"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder={`Min: ${formatCurrency(wallet.minimumWithdrawal)}`}
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Disponible: {formatCurrency(wallet.availableBalance)} • 
                  Min: {formatCurrency(wallet.minimumWithdrawal)} • 
                  Max: {formatCurrency(wallet.maximumWithdrawal)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Compte bancaire</Label>
                <Select value={withdrawalForm.bankAccountId} onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, bankAccountId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.accountName} - {account.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {withdrawalForm.amount && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Vous recevrez {formatCurrency(parseFloat(withdrawalForm.amount) - wallet.withdrawalFee)} 
                    (montant demandé minus frais de {formatCurrency(wallet.withdrawalFee)})
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleWithdrawalRequest} className="flex-1">
                  Confirmer le retrait
                </Button>
                <Button variant="outline" onClick={() => setShowWithdrawal(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un compte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un Compte Bancaire</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau compte pour vos retraits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du compte</Label>
                <Input
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="Mon compte principal"
                />
              </div>

              <div className="space-y-2">
                <Label>Nom de la banque</Label>
                <Input
                  value={accountForm.bankName}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Crédit Agricole"
                />
              </div>

              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={accountForm.iban}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, iban: e.target.value }))}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
              </div>

              <div className="space-y-2">
                <Label>BIC/SWIFT (optionnel)</Label>
                <Input
                  value={accountForm.bic}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, bic: e.target.value }))}
                  placeholder="AGRIFRPP"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddBankAccount} className="flex-1">
                  Ajouter le compte
                </Button>
                <Button variant="outline" onClick={() => setShowAddAccount(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Comptes Bancaires
          </CardTitle>
          <CardDescription>
            Gérez vos comptes bancaires pour les retraits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun compte bancaire configuré</p>
              <p className="text-sm">Ajoutez un compte pour effectuer des retraits</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-sm text-muted-foreground">{account.bankName}</p>
                      <p className="text-sm font-mono">{formatIBAN(account.iban)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.isDefault && <Badge>Par défaut</Badge>}
                    {account.isVerified ? (
                      <Badge className="bg-green-100 text-green-800">Vérifié</Badge>
                    ) : (
                      <Badge variant="outline">En attente</Badge>
                    )}
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Retraits</CardTitle>
          <CardDescription>
            Consultez vos demandes de retrait récentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowDownLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun retrait effectué</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map(withdrawal => (
                <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(withdrawal.status)}
                    <div>
                      <p className="font-medium">{formatCurrency(withdrawal.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        vers {withdrawal.bankAccountName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Demandé le {new Date(withdrawal.requestedAt).toLocaleDateString('fr-FR')}
                      </p>
                      {withdrawal.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">{withdrawal.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(withdrawal.status)}
                    {withdrawal.estimatedArrival && withdrawal.status === 'PROCESSING' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Arrivée prévue: {new Date(withdrawal.estimatedArrival).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>• Les retraits sont traités sous 1-3 jours ouvrables</p>
            <p>• Frais de retrait: {formatCurrency(wallet.withdrawalFee)} par transaction</p>
            <p>• Montant minimum: {formatCurrency(wallet.minimumWithdrawal)}</p>
            <p>• Montant maximum: {formatCurrency(wallet.maximumWithdrawal)} par jour</p>
            <p>• Vos comptes bancaires doivent être vérifiés avant le premier retrait</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 