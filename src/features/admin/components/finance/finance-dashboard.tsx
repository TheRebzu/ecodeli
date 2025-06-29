'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  Download,
  RefreshCw,
  Calendar,
  Building2,
  Truck
} from 'lucide-react'

interface FinancialStats {
  totalRevenue: number
  monthlyRevenue: number
  commissionEarnings: number
  pendingPayments: number
  totalTransactions: number
  averageOrderValue: number
  
  deliveryStats: {
    total: number
    completed: number
    revenue: number
  }
  
  providerStats: {
    total: number
    active: number
    totalPaid: number
  }
  
  merchantStats: {
    total: number
    active: number
    totalFees: number
  }
  
  clientStats: {
    total: number
    active: number
    averageSpending: number
  }
}

interface RevenueBreakdown {
  period: string
  deliveryCommissions: number
  merchantFees: number
  providerPayments: number
  netRevenue: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  status: string
  createdAt: string
  entityType: string
  entityId: string
}

export function FinanceDashboard() {
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueBreakdown[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('current-month')
  const [showBillingDialog, setShowBillingDialog] = useState(false)

  useEffect(() => {
    fetchFinancialData()
  }, [selectedPeriod])

  const fetchFinancialData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/finance?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRevenueData(data.revenueBreakdown || [])
        setTransactions(data.recentTransactions || [])
      }
    } catch (error) {
      console.error('Erreur chargement données financières:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerMonthlyBilling = async () => {
    try {
      const response = await fetch('/api/cron/monthly-billing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'ecodeli-cron-secret'}`
        }
      })
      
      if (response.ok) {
        alert('Facturation mensuelle déclenchée avec succès')
        fetchFinancialData()
      } else {
        alert('Erreur lors du déclenchement de la facturation')
      }
    } catch (error) {
      console.error('Erreur déclenchement facturation:', error)
      alert('Erreur lors du déclenchement de la facturation')
    }
  }

  const exportFinancialReport = () => {
    window.open(`/api/admin/finance/export?period=${selectedPeriod}`, '_blank')
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'DELIVERY_COMMISSION': return 'bg-green-100 text-green-800'
      case 'MERCHANT_FEE': return 'bg-blue-100 text-blue-800'
      case 'PROVIDER_PAYMENT': return 'bg-red-100 text-red-800'
      case 'WITHDRAWAL': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion financière</h1>
          <p className="text-muted-foreground">
            Suivi des revenus, charges et performance économique d'EcoDeli
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Mois actuel</SelectItem>
              <SelectItem value="last-month">Mois dernier</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Année</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportFinancialReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          
          <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
            <DialogTrigger asChild>
              <Button>
                <RefreshCw className="w-4 h-4 mr-2" />
                Facturation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Facturation mensuelle</DialogTitle>
                <DialogDescription>
                  Déclencher la facturation mensuelle des prestataires
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Cette action va générer automatiquement toutes les factures mensuelles 
                  pour les prestataires et effectuer les virements bancaires.
                </p>
                <Button onClick={triggerMonthlyBilling} className="w-full">
                  Déclencher la facturation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus totaux</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalRevenue.toLocaleString()}€
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.monthlyRevenue.toLocaleString()}€ ce mois
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commissions EcoDeli</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.commissionEarnings.toLocaleString()}€
                </p>
                <p className="text-xs text-muted-foreground">
                  15% des livraisons
                </p>
              </div>
              <Euro className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paiements en attente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.pendingPayments.toLocaleString()}€
                </p>
                <p className="text-xs text-muted-foreground">
                  À traiter
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Panier moyen</p>
                <p className="text-2xl font-bold">
                  {stats.averageOrderValue.toFixed(2)}€
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalTransactions} transactions
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques par catégorie */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Livraisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold">{stats.deliveryStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Terminées</span>
                <span className="font-semibold text-green-600">{stats.deliveryStats.completed}</span>
              </div>
              <div className="flex justify-between">
                <span>Revenus</span>
                <span className="font-semibold">{stats.deliveryStats.revenue.toLocaleString()}€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Prestataires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold">{stats.providerStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Actifs</span>
                <span className="font-semibold text-green-600">{stats.providerStats.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Payé</span>
                <span className="font-semibold text-red-600">-{stats.providerStats.totalPaid.toLocaleString()}€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Commerçants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold">{stats.merchantStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Actifs</span>
                <span className="font-semibold text-green-600">{stats.merchantStats.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Frais collectés</span>
                <span className="font-semibold text-green-600">{stats.merchantStats.totalFees.toLocaleString()}€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold">{stats.clientStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Actifs</span>
                <span className="font-semibold text-green-600">{stats.clientStats.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Dépense moyenne</span>
                <span className="font-semibold">{stats.clientStats.averageSpending.toFixed(2)}€</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition des revenus */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition des revenus</CardTitle>
          <CardDescription>Évolution des revenus par source</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead>Commissions livraisons</TableHead>
                <TableHead>Frais commerçants</TableHead>
                <TableHead>Paiements prestataires</TableHead>
                <TableHead>Revenus nets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueData.map((period) => (
                <TableRow key={period.period}>
                  <TableCell className="font-medium">{period.period}</TableCell>
                  <TableCell className="text-green-600">+{period.deliveryCommissions.toLocaleString()}€</TableCell>
                  <TableCell className="text-blue-600">+{period.merchantFees.toLocaleString()}€</TableCell>
                  <TableCell className="text-red-600">-{period.providerPayments.toLocaleString()}€</TableCell>
                  <TableCell className="font-semibold text-green-600">{period.netRevenue.toLocaleString()}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transactions récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions récentes</CardTitle>
          <CardDescription>Dernières opérations financières</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getTransactionTypeColor(transaction.type)}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toLocaleString()}€
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}