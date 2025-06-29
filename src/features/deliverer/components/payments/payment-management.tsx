'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wallet, TrendingUp, Clock, CheckCircle, ArrowUpRight, CreditCard } from 'lucide-react'

interface WalletData {
  currentBalance: number
  pendingBalance: number
  totalEarnings: number
  availableForWithdrawal: number
}

interface Withdrawal {
  id: string
  amount: number
  status: string
  bankAccount: {
    bankName: string
    accountNumber: string
  }
  requestedAt: string
  processedAt?: string
}

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountHolderName: string
  isDefault: boolean
}

interface RecentEarning {
  id: string
  announcementTitle: string
  grossAmount: number
  netAmount: number
  commission: number
  status: string
  completedAt: string
}

export function PaymentManagement() {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [recentEarnings, setRecentEarnings] = useState<RecentEarning[]>([])
  const [loading, setLoading] = useState(true)
  
  // État pour la demande de retrait
  const [withdrawalDialog, setWithdrawalDialog] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [selectedBankAccount, setSelectedBankAccount] = useState('')

  useEffect(() => {
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/deliverer/wallet')
      if (response.ok) {
        const data = await response.json()
        setWalletData(data.wallet)
        setWithdrawals(data.withdrawals || [])
        setBankAccounts(data.bankAccounts || [])
        setRecentEarnings(data.recentEarnings || [])
      }
    } catch (error) {
      console.error('Erreur chargement wallet:', error)
    } finally {
      setLoading(false)
    }
  }

  const requestWithdrawal = async () => {
    try {
      const response = await fetch('/api/deliverer/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawalAmount),
          bankAccountId: selectedBankAccount
        })
      })

      if (response.ok) {
        setWithdrawalDialog(false)
        setWithdrawalAmount('')
        setSelectedBankAccount('')
        fetchWalletData() // Recharger les données
      }
    } catch (error) {
      console.error('Erreur demande retrait:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { label: 'En attente', variant: 'secondary' as const },
      'PROCESSING': { label: 'En cours', variant: 'default' as const },
      'COMPLETED': { label: 'Terminé', variant: 'default' as const },
      'FAILED': { label: 'Échoué', variant: 'destructive' as const }
    }
    
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!walletData) return null

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold">Gestion des paiements</h1>
        <p className="text-muted-foreground">Suivez vos gains et gérez vos retraits</p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Solde disponible</p>
                <p className="text-2xl font-bold text-green-600">{walletData.currentBalance.toFixed(2)}€</p>
              </div>
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-orange-600">{walletData.pendingBalance.toFixed(2)}€</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gains totaux</p>
                <p className="text-2xl font-bold">{walletData.totalEarnings.toFixed(2)}€</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Dialog open={withdrawalDialog} onOpenChange={setWithdrawalDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={walletData.availableForWithdrawal < 10}>
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Demander un retrait
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Demande de retrait</DialogTitle>
                  <DialogDescription>
                    Disponible: {walletData.availableForWithdrawal.toFixed(2)}€ (minimum 10€)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Montant (€)</label>
                    <Input
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="10.00"
                      max={walletData.availableForWithdrawal}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Compte bancaire</label>
                    <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bankName} - {account.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={requestWithdrawal}
                    disabled={!withdrawalAmount || !selectedBankAccount || parseFloat(withdrawalAmount) < 10}
                    className="w-full"
                  >
                    Confirmer la demande
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Historique des retraits */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des retraits</CardTitle>
          <CardDescription>Vos demandes de retrait récentes</CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune demande de retrait
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Traité le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      {new Date(withdrawal.requestedAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {withdrawal.amount.toFixed(2)}€
                    </TableCell>
                    <TableCell>
                      {withdrawal.bankAccount.bankName} • {withdrawal.bankAccount.accountNumber}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(withdrawal.status)}
                    </TableCell>
                    <TableCell>
                      {withdrawal.processedAt 
                        ? new Date(withdrawal.processedAt).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Gains récents */}
      <Card>
        <CardHeader>
          <CardTitle>Gains récents</CardTitle>
          <CardDescription>Vos dernières livraisons rémunérées</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEarnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune livraison terminée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Livraison</TableHead>
                  <TableHead>Montant brut</TableHead>
                  <TableHead>Commission EcoDeli</TableHead>
                  <TableHead>Votre gain</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEarnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell className="font-medium">
                      {earning.announcementTitle}
                    </TableCell>
                    <TableCell>{earning.grossAmount.toFixed(2)}€</TableCell>
                    <TableCell className="text-red-600">
                      -{earning.commission.toFixed(2)}€
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      +{earning.netAmount.toFixed(2)}€
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(earning.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(earning.completedAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}