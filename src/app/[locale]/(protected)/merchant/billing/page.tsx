'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMerchantBilling } from '@/features/merchant/hooks/use-merchant-billing'
import { 
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  Euro,
  TrendingUp,
  Eye,
  Mail,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  Calculator,
  Loader2,
  Plus
} from 'lucide-react'

export default function MerchantBillingPage() {
  const t = useTranslations('merchant.billing')
  const {
    stats,
    statsLoading,
    statsError,
    invoices,
    invoicesLoading,
    invoicesError,
    settings,
    templates,
    refreshStats,
    refreshInvoices,
    createInvoice,
    updateInvoiceStatus,
    generatePDF
  } = useMerchantBilling()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: { variant: 'outline' as const, text: t('status.draft'), icon: FileText },
      SENT: { variant: 'secondary' as const, text: t('status.sent'), icon: Mail },
      PAID: { variant: 'default' as const, text: t('status.paid'), icon: CheckCircle },
      OVERDUE: { variant: 'destructive' as const, text: t('status.overdue'), icon: AlertCircle },
      CANCELLED: { variant: 'outline' as const, text: t('status.cancelled'), icon: AlertCircle }
    }
    return variants[status as keyof typeof variants] || variants.DRAFT
  }

  const getServiceTypeLabel = (type: string) => {
    const labels = {
      CART_DROP: t('serviceTypes.cartDrop'),
      DELIVERY: t('serviceTypes.delivery'),
      COMMISSION: t('serviceTypes.commission')
    }
    return labels[type as keyof typeof labels] || type
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'ALL' || invoice.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  // États de chargement
  const isLoading = statsLoading || invoicesLoading
  const error = statsError || invoicesError

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('loading')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('error.title')}</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => {
          refreshStats()
          refreshInvoices()
        }}>{t('retry')}</Button>
      </div>
    )
  }

  const handleCreateInvoice = () => {
    // Données d'exemple pour la démonstration
    createInvoice({
      clientEmail: 'client@example.com',
      items: [
        {
          description: 'Service exemple',
          quantity: 1,
          unitPrice: 25.00,
          totalPrice: 25.00
        }
      ]
    })
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            {t('actions.export')}
          </Button>
          <Button onClick={handleCreateInvoice}>
            <FileText className="h-4 w-4 mr-2" />
            {t('actions.newInvoice')}
          </Button>
        </div>
      </div>

      {/* Indicateurs financiers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalInvoiced')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAmount?.toFixed(2) || '0.00'}€</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {t('stats.monthlyGrowth', { percentage: '+8%' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalPaid')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.totalAmount?.toFixed(2) || '0.00'}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.paidInvoicesCount', { count: stats?.paidInvoices || 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalPending')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.monthlyRevenue?.toFixed(2) || '0.00'}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.pendingInvoicesCount', { count: stats?.pendingInvoices || 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalOverdue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              0.00€
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.overdueInvoicesCount', { count: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">{t('tabs.invoices')}</TabsTrigger>
          <TabsTrigger value="create">{t('tabs.create')}</TabsTrigger>
          <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
          <TabsTrigger value="reports">{t('tabs.reports')}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          {/* Filtres et recherche */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="ALL">{t('filters.allStatuses')}</option>
              <option value="DRAFT">{t('status.draft')}</option>
              <option value="SENT">{t('status.sent')}</option>
              <option value="PAID">{t('status.paid')}</option>
              <option value="OVERDUE">{t('status.overdue')}</option>
              <option value="CANCELLED">{t('status.cancelled')}</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {t('filters.advanced')}
            </Button>
          </div>

          {/* Liste des factures */}
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                        <Badge variant={getStatusBadge(invoice.status).variant}>
                          {getStatusBadge(invoice.status).text}
                        </Badge>
                        {invoice.status === 'OVERDUE' && invoice.dueDate && (
                          <span className="text-sm text-red-600">
                            {t('overdue.daysPast', { 
                              days: Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-4">
                        {t('invoice.client')}: {invoice.clientEmail}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">{t('invoice.totalTTC')}</p>
                          <p className="font-semibold">{invoice.amount?.toFixed(2) || '0.00'}€</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('invoice.dueDate')}</p>
                          <p className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('invoice.createdDate')}</p>
                          <p className="font-medium">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '-'}</p>
                        </div>
                      </div>

                      {/* Services facturés */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t('invoice.services')}:</p>
                        {(invoice.items || []).map((item: any, index: number) => (
                          <div key={index} className="text-sm text-muted-foreground pl-4">
                            • {item.description} - {item.quantity} × {item.unitPrice.toFixed(2)}€ = {item.totalPrice.toFixed(2)}€
                            <Badge variant="outline" className="ml-2 text-xs">
                              {t('serviceTypes.delivery')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" title={t('actions.view')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title={t('actions.download')}
                        onClick={() => generatePDF(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" title={t('actions.email')}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" title={t('actions.print')}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInvoices.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">{t('empty.title')}</h3>
                <p className="text-muted-foreground">
                  {t('empty.description')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('create.title')}</CardTitle>
              <CardDescription>
                {t('create.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('create.clientName')}</label>
                  <Input placeholder={t('create.clientNamePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('create.clientEmail')}</label>
                  <Input placeholder={t('create.clientEmailPlaceholder')} type="email" />
                </div>
              </div>

              {/* Services */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t('create.services')}</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('create.addService')}
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                    <div className="col-span-5">{t('create.description')}</div>
                    <div className="col-span-2">{t('create.quantity')}</div>
                    <div className="col-span-2">{t('create.unitPrice')}</div>
                    <div className="col-span-2">{t('create.total')}</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Input placeholder={t('create.descriptionPlaceholder')} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="1" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="0.00" />
                    </div>
                    <div className="col-span-2">
                      <Input disabled placeholder="0.00" />
                    </div>
                    <div className="col-span-1">
                      <Button variant="outline" size="sm">×</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totaux */}
              <div className="border-t pt-4">
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span>{t('create.subtotalHT')}:</span>
                    <span>0.00€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('create.vatAmount')}:</span>
                    <span>0.00€</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>{t('create.totalTTC')}:</span>
                    <span>0.00€</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline">{t('create.saveDraft')}</Button>
                <Button>{t('create.createAndSend')}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.title')}</CardTitle>
              <CardDescription>{t('settings.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t('settings.companyName')}</label>
                    <Input defaultValue={settings?.companyName || ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('settings.vatNumber')}</label>
                    <Input defaultValue={settings?.vatNumber || ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('settings.address')}</label>
                    <textarea 
                      className="w-full p-2 border rounded-md bg-background"
                      rows={3}
                      defaultValue={settings?.address || ''}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t('settings.defaultVatRate')}</label>
                    <Input type="number" defaultValue={settings?.defaultVatRate || 20} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('settings.paymentTerms')}</label>
                    <Input type="number" defaultValue={settings?.paymentTerms || 30} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('settings.invoicePrefix')}</label>
                    <Input defaultValue={settings?.invoicePrefix || 'FACT'} />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>{t('settings.save')}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.title')}</CardTitle>
              <CardDescription>{t('reports.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">{t('reports.comingSoon')}</h3>
                <p className="text-muted-foreground">
                  {t('reports.comingSoonDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}