'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from "@/components/ui/use-toast"
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Users, 
  Calendar,
  Download,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  DollarSign
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Composant de vue d'ensemble de la facturation pour les administrateurs
 * Implémentation selon la Mission 1 - Gestion complète de la facturation
 */
export default function BillingOverview() {
  const t = useTranslations('admin.billing')
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Récupération des données via tRPC
  const { data: billingOverview, isLoading: overviewLoading, refetch: refetchOverview } = api.admin.getBillingOverview.useQuery({
    period: selectedPeriod
  })

  const { data: recentInvoices, isLoading: invoicesLoading, refetch: refetchInvoices } = api.admin.getRecentInvoices.useQuery({
    limit: 20,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    search: searchQuery
  })

  const { data: billingStats, isLoading: statsLoading } = api.admin.getBillingStats.useQuery({
    period: selectedPeriod
  })

  const { data: revenueBreakdown, isLoading: revenueLoading } = api.admin.getRevenueBreakdown.useQuery({
    period: selectedPeriod
  })

  const { data: outstandingPayments, isLoading: outstandingLoading } = api.admin.getOutstandingPayments.useQuery()

  // Mutations pour les actions
  const generateInvoiceMutation = api.admin.generateInvoice.useMutation({
    onSuccess: (data) => {
      toast({
        title: t('invoiceGenerated'),
        description: t('invoiceGeneratedSuccess'),
      })
      refetchInvoices()
      refetchOverview()
      
      // Télécharger la facture
      if (data.downloadUrl) {
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = `facture-${data.invoiceNumber}.pdf`
        link.click()
      }
    },
    onError: (error) => {
      toast({
        title: t('generateError'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const sendReminderMutation = api.admin.sendPaymentReminder.useMutation({
    onSuccess: () => {
      toast({
        title: t('reminderSent'),
        description: t('reminderSentSuccess'),
      })
    },
    onError: (error) => {
      toast({
        title: t('reminderError'),
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const exportBillingDataMutation = api.admin.exportBillingData.useMutation({
    onSuccess: (data) => {
      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.download = `facturation-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
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

  const refreshDataMutation = api.admin.refreshBillingData.useMutation({
    onSuccess: () => {
      toast({
        title: t('dataRefreshed'),
        description: t('dataRefreshedSuccess'),
      })
      setIsRefreshing(false)
      refetchOverview()
      refetchInvoices()
    },
    onError: (error) => {
      toast({
        title: t('refreshError'),
        description: error.message,
        variant: 'destructive',
      })
      setIsRefreshing(false)
    }
  })

  // Gestion des actions
  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshDataMutation.mutate()
  }

  const handleGenerateInvoice = (customerId: string, items: any[]) => {
    generateInvoiceMutation.mutate({
      customerId,
      items
    })
  }

  const handleSendReminder = (invoiceId: string) => {
    sendReminderMutation.mutate({ invoiceId })
  }

  const handleExport = () => {
    exportBillingDataMutation.mutate({
      period: selectedPeriod,
      status: selectedStatus !== 'all' ? selectedStatus : undefined
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
      DRAFT: 'secondary',
      SENT: 'default',
      PAID: 'success',
      OVERDUE: 'destructive',
      CANCELLED: 'outline'
    } as const

    const icons = {
      DRAFT: FileText,
      SENT: Clock,
      PAID: CheckCircle,
      OVERDUE: AlertCircle,
      CANCELLED: AlertCircle
    }

    const Icon = icons[status as keyof typeof icons] || FileText

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        <Icon className="h-3 w-3 mr-1" />
        {t(`status.${status.toLowerCase()}`)}
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
          <h1 className="text-3xl font-bold tracking-tight">{t('billingOverview')}</h1>
          <p className="text-muted-foreground">{t('billingOverviewDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('period.7d')}</SelectItem>
              <SelectItem value="30d">{t('period.30d')}</SelectItem>
              <SelectItem value="90d">{t('period.90d')}</SelectItem>
              <SelectItem value="1y">{t('period.1y')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || refreshDataMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportBillingDataMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      {billingOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(billingOverview.totalRevenue)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {billingOverview.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(billingOverview.revenueChange)}% {t('fromLastPeriod')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalInvoices')}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billingOverview.totalInvoices.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {billingOverview.invoicesChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(billingOverview.invoicesChange)}% {t('fromLastPeriod')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('paymentRate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billingOverview.paymentRate}%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {billingOverview.paymentRateChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(billingOverview.paymentRateChange)}% {t('fromLastPeriod')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('outstandingAmount')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(billingOverview.outstandingAmount)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>{billingOverview.overdueCount} {t('overdueInvoices')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">{t('invoices')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
          <TabsTrigger value="outstanding">{t('outstanding')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('revenueBreakdown')}</TabsTrigger>
        </TabsList>

        {/* Onglet Factures */}
        <TabsContent value="invoices" className="space-y-4">
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
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatuses')}</SelectItem>
                      <SelectItem value="DRAFT">{t('status.draft')}</SelectItem>
                      <SelectItem value="SENT">{t('status.sent')}</SelectItem>
                      <SelectItem value="PAID">{t('status.paid')}</SelectItem>
                      <SelectItem value="OVERDUE">{t('status.overdue')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des factures */}
          <Card>
            <CardHeader>
              <CardTitle>{t('recentInvoices')}</CardTitle>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : recentInvoices && recentInvoices.length > 0 ? (
                <div className="space-y-4">
                  {recentInvoices.map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.number}</p>
                          <p className="text-sm text-muted-foreground">{invoice.customer?.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(invoice.createdAt), 'dd/MM/yyyy')}</span>
                            {invoice.dueDate && (
                              <>
                                <span>•</span>
                                <span>{t('due')} {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{formatAmount(invoice.amount)}</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'OVERDUE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(invoice.id)}
                              disabled={sendReminderMutation.isPending}
                            >
                              {t('remind')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noInvoices')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          {statsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : billingStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t('monthlyRevenue')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {billingStats.monthlyRevenue?.map((month: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{format(new Date(month.month), 'MMM yyyy', { locale: fr })}</span>
                        <span className="font-medium">{formatAmount(month.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    {t('invoiceStatusDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {billingStats.statusDistribution?.map((status: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{status.percentage}%</span>
                          <span className="font-medium">{status.count}</span>
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

        {/* Onglet Outstanding */}
        <TabsContent value="outstanding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('outstandingPayments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {outstandingLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : outstandingPayments && outstandingPayments.length > 0 ? (
                <div className="space-y-4">
                  {outstandingPayments.map((payment: any) => (
                    <div key={payment.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{payment.invoiceNumber}</p>
                        <Badge variant="destructive">{t('overdue')}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{t('customer')}: {payment.customerName}</p>
                        <p>{t('amount')}: {formatAmount(payment.amount)}</p>
                        <p>{t('dueDate')}: {format(new Date(payment.dueDate), 'dd/MM/yyyy')}</p>
                        <p>{t('daysPastDue')}: {payment.daysPastDue}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(payment.id)}
                          disabled={sendReminderMutation.isPending}
                        >
                          {t('sendReminder')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/invoices/${payment.id}/pdf`, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t('download')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noOutstandingPayments')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Revenue Breakdown */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                {t('revenueBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : revenueBreakdown ? (
                <div className="space-y-4">
                  {Object.entries(revenueBreakdown).map(([category, data]: [string, any]) => (
                    <div key={category} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium capitalize">{category}</p>
                        <p className="text-lg font-bold">{formatAmount(data.total)}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{t('transactions')}: {data.count}</p>
                        <p>{t('averageValue')}: {formatAmount(data.average)}</p>
                        <p>{t('percentageOfTotal')}: {data.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Euro className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noRevenueData')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export { BillingOverview };
