'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from "@/components/ui/use-toast"
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Composant de tableau de bord Stripe pour les administrateurs
 * Implémentation selon la Mission 1 - Gestion complète des paiements
 */
export default function StripeDashboard() {
  const t = useTranslations('admin.payments')
  const [selectedPeriod, setSelectedPeriod] = useState('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Récupération des données Stripe via tRPC
  const { data: stripeOverview, isLoading: overviewLoading, refetch: refetchOverview } = api.admin.getStripeOverview.useQuery({
    period: selectedPeriod
  })

  const { data: recentTransactions, isLoading: transactionsLoading, refetch: refetchTransactions } = api.admin.getStripeTransactions.useQuery({
    limit: 50,
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined
  })

  const { data: paymentMethods, isLoading: methodsLoading } = api.admin.getStripePaymentMethods.useQuery()

  const { data: disputes, isLoading: disputesLoading } = api.admin.getStripeDisputes.useQuery()

  const { data: analytics, isLoading: analyticsLoading } = api.admin.getStripeAnalytics.useQuery({
    period: selectedPeriod
  })

  // Mutations pour les actions
  const refundPaymentMutation = api.admin.refundStripePayment.useMutation({
    onSuccess: () => {
      toast({
        title: t('refundSuccess'),
        description: t('refundSuccessDescription'),
      })
      refetchTransactions()
      refetchOverview()
    },
    onError: (error) => {
      toast({
        title: t('refundError'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const syncStripeDataMutation = api.admin.syncStripeData.useMutation({
    onSuccess: () => {
      toast({
        title: t('syncSuccess'),
        description: t('syncSuccessDescription'),
      })
      setIsRefreshing(false)
      refetchOverview()
      refetchTransactions()
    },
    onError: (error) => {
      toast({
        title: t('syncError'),
        description: error.message,
        variant: 'destructive',
      })
      setIsRefreshing(false)
    }
  })

  const exportTransactionsMutation = api.admin.exportStripeTransactions.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier CSV
      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.download = `stripe-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()
      
      toast({
        title: t('exportSuccess'),
        description: t('exportSuccessDescription'),
      })
    },
    onError: (error) => {
      toast({
        title: t('exportError'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // Gestion des actions
  const handleRefresh = () => {
    setIsRefreshing(true)
    syncStripeDataMutation.mutate()
  }

  const handleRefund = (paymentId: string, amount?: number) => {
    if (confirm(t('confirmRefund'))) {
      refundPaymentMutation.mutate({
        paymentId,
        amount
      })
    }
  }

  const handleExport = () => {
    exportTransactionsMutation.mutate({
      period: selectedPeriod,
      status: statusFilter !== 'all' ? statusFilter : undefined
    })
  }

  // Formatage des montants
  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100)
  }

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const variants = {
      succeeded: 'success',
      pending: 'secondary',
      failed: 'destructive',
      canceled: 'outline',
      requires_action: 'warning'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {t(`status.${status}`)}
      </Badge>
    )
  }

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('stripeDashboard')}</h1>
          <p className="text-muted-foreground">{t('stripeDashboardDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">{t('period.1d')}</SelectItem>
              <SelectItem value="7d">{t('period.7d')}</SelectItem>
              <SelectItem value="30d">{t('period.30d')}</SelectItem>
              <SelectItem value="90d">{t('period.90d')}</SelectItem>
              <SelectItem value="1y">{t('period.1y')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || syncStripeDataMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportTransactionsMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      {stripeOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(stripeOverview.totalRevenue)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stripeOverview.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(stripeOverview.revenueChange)}% {t('fromLastPeriod')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalTransactions')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stripeOverview.totalTransactions.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stripeOverview.transactionsChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(stripeOverview.transactionsChange)}% {t('fromLastPeriod')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('successRate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stripeOverview.successRate}%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stripeOverview.successRateChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(stripeOverview.successRateChange)}% {t('fromLastPeriod')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('activeCustomers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stripeOverview.activeCustomers.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stripeOverview.customersChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(stripeOverview.customersChange)}% {t('fromLastPeriod')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">{t('transactions')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
          <TabsTrigger value="disputes">{t('disputes')}</TabsTrigger>
          <TabsTrigger value="methods">{t('paymentMethods')}</TabsTrigger>
        </TabsList>

        {/* Onglet Transactions */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('filters')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Label htmlFor="search">{t('search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder={t('searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">{t('status')}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatuses')}</SelectItem>
                      <SelectItem value="succeeded">{t('status.succeeded')}</SelectItem>
                      <SelectItem value="pending">{t('status.pending')}</SelectItem>
                      <SelectItem value="failed">{t('status.failed')}</SelectItem>
                      <SelectItem value="canceled">{t('status.canceled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t('recentTransactions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : recentTransactions && recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {transaction.status === 'succeeded' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : transaction.status === 'failed' ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <RefreshCw className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description || transaction.id}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{transaction.customer?.email || t('guestCustomer')}</span>
                            <span>•</span>
                            <span>{format(new Date(transaction.created * 1000), 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{formatAmount(transaction.amount, transaction.currency)}</p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        {transaction.status === 'succeeded' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefund(transaction.id)}
                            disabled={refundPaymentMutation.isPending}
                          >
                            {t('refund')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noTransactions')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t('revenueByDay')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.dailyRevenue?.map((day: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{format(new Date(day.date), 'dd MMM', { locale: fr })}</span>
                        <span className="font-medium">{formatAmount(day.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    {t('paymentMethodsDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.paymentMethodsStats?.map((method: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{method.type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{method.percentage}%</span>
                          <span className="font-medium">{method.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('noAnalyticsData')}</p>
            </div>
          )}
        </TabsContent>

        {/* Onglet Disputes */}
        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('activeDisputes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disputesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : disputes && disputes.length > 0 ? (
                <div className="space-y-4">
                  {disputes.map((dispute: any) => (
                    <div key={dispute.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{dispute.reason}</p>
                        <Badge variant="destructive">{dispute.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{t('amount')}: {formatAmount(dispute.amount, dispute.currency)}</p>
                        <p>{t('created')}: {format(new Date(dispute.created * 1000), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noDisputes')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Payment Methods */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('paymentMethodsOverview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {methodsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : paymentMethods ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(paymentMethods).map(([method, count]: [string, any]) => (
                    <div key={method} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{method}</span>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noPaymentMethods')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
