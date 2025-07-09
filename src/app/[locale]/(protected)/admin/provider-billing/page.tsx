'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Download, 
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react'
import { ProviderBillingDashboard } from '@/features/admin/components/provider-billing/provider-billing-dashboard'
import { ProviderBillingList } from '@/features/admin/components/provider-billing/provider-billing-list'

export default function AdminProviderBillingPage() {
  const t = useTranslations('admin.providerBilling')
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            {t('generateInvoices')}
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <ProviderBillingDashboard />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('monthFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('allMonths')}</SelectItem>
                <SelectItem value="2024-01">Janvier 2024</SelectItem>
                <SelectItem value="2024-02">Février 2024</SelectItem>
                <SelectItem value="2024-03">Mars 2024</SelectItem>
                <SelectItem value="2024-04">Avril 2024</SelectItem>
                <SelectItem value="2024-05">Mai 2024</SelectItem>
                <SelectItem value="2024-06">Juin 2024</SelectItem>
                <SelectItem value="2024-07">Juillet 2024</SelectItem>
                <SelectItem value="2024-08">Août 2024</SelectItem>
                <SelectItem value="2024-09">Septembre 2024</SelectItem>
                <SelectItem value="2024-10">Octobre 2024</SelectItem>
                <SelectItem value="2024-11">Novembre 2024</SelectItem>
                <SelectItem value="2024-12">Décembre 2024</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="PENDING">{t('pending')}</SelectItem>
                <SelectItem value="GENERATED">{t('generated')}</SelectItem>
                <SelectItem value="PAID">{t('paid')}</SelectItem>
                <SelectItem value="OVERDUE">{t('overdue')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm('')
              setMonthFilter('')
              setStatusFilter('all')
            }}>
              {t('clearFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('allInvoices')}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('pendingInvoices')}
          </TabsTrigger>
          <TabsTrigger value="generated" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('generatedInvoices')}
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('paidInvoices')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ProviderBillingList 
            statusFilter="all"
            searchTerm={searchTerm}
            monthFilter={monthFilter}
          />
        </TabsContent>

        <TabsContent value="pending">
          <ProviderBillingList 
            statusFilter="PENDING"
            searchTerm={searchTerm}
            monthFilter={monthFilter}
          />
        </TabsContent>

        <TabsContent value="generated">
          <ProviderBillingList 
            statusFilter="GENERATED"
            searchTerm={searchTerm}
            monthFilter={monthFilter}
          />
        </TabsContent>

        <TabsContent value="paid">
          <ProviderBillingList 
            statusFilter="PAID"
            searchTerm={searchTerm}
            monthFilter={monthFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
} 