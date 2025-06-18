'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from "@/components/ui/use-toast";
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  Euro,
  CheckCircle,
  AlertCircle,
  Clock,
  Archive,
  Eye,
  Printer,
  Mail,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * Composant de gestion des archives de factures pour les prestataires
 * Implémentation selon la Mission 1 - Gestion complète de l'historique de facturation
 */
export default function InvoiceArchive() {
  const t = useTranslations('provider.billing');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{from?: Date; to?: Date}>({});
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Requêtes tRPC réelles
  const { data: invoices, isLoading, refetch } = api.provider.getInvoiceArchive.useQuery({
    search: searchTerm,
    status: statusFilter === 'all' ? undefined : statusFilter,
    period: periodFilter === 'all' ? undefined : periodFilter,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const { data: invoiceStats } = api.provider.getInvoiceStatistics.useQuery({
    period: periodFilter === 'all' ? undefined : periodFilter,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const { data: invoiceDetail } = api.provider.getInvoiceDetail.useQuery(
    { invoiceId: selectedInvoice! },
    { enabled: !!selectedInvoice }
  );

  // Mutations tRPC réelles
  const downloadInvoiceMutation = api.provider.downloadInvoice.useMutation({
    onSuccess: (data) => {
      // Créer un lien de téléchargement
      const blob = new Blob([data.content], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: t('downloadSuccess'),
        description: t('invoiceDownloaded'),
      });
    },
    onError: (error) => {
      toast({
        title: t('downloadError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendInvoiceEmailMutation = api.provider.sendInvoiceEmail.useMutation({
    onSuccess: () => {
      toast({
        title: t('emailSent'),
        description: t('invoiceEmailSent'),
      });
    },
    onError: (error) => {
      toast({
        title: t('emailError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const exportArchiveMutation = api.provider.exportInvoiceArchive.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier Excel
      const blob = new Blob([data.content], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: t('exportSuccess'),
        description: t('archiveExported'),
      });
    },
    onError: (error) => {
      toast({
        title: t('exportError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fonctions utilitaires
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PAID: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('paid') },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: t('pending') },
      OVERDUE: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: t('overdue') },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: Archive, label: t('cancelled') },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDownload = (invoiceId: string) => {
    downloadInvoiceMutation.mutate({ invoiceId });
  };

  const handleSendEmail = (invoiceId: string) => {
    sendInvoiceEmailMutation.mutate({ invoiceId });
  };

  const handleExportArchive = () => {
    exportArchiveMutation.mutate({
      search: searchTerm,
      status: statusFilter === 'all' ? undefined : statusFilter,
      period: periodFilter === 'all' ? undefined : periodFilter,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    });
  };

  const handlePeriodSelect = (period: string) => {
    setPeriodFilter(period);
    const now = new Date();
    
    switch (period) {
      case 'current_month':
        setDateRange({
          from: startOfMonth(now),
          to: endOfMonth(now),
        });
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setDateRange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      case 'last_3_months':
        setDateRange({
          from: subMonths(now, 3),
          to: now,
        });
        break;
      case 'last_year':
        setDateRange({
          from: subMonths(now, 12),
          to: now,
        });
        break;
      default:
        setDateRange({});
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('invoiceArchive')}</h1>
            <p className="text-muted-foreground">{t('manageInvoiceHistory')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="w-6 h-6" />
            {t('invoiceArchive')}
          </h1>
          <p className="text-muted-foreground">{t('manageInvoiceHistory')}</p>
        </div>
        <Button onClick={handleExportArchive} disabled={exportArchiveMutation.isPending}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          {exportArchiveMutation.isPending ? t('exporting') : t('exportArchive')}
        </Button>
      </div>

      {/* Statistiques globales */}
      {invoiceStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold">{invoiceStats.totalRevenue.toFixed(2)} €</p>
                </div>
                <Euro className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {invoiceStats.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  invoiceStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {Math.abs(invoiceStats.revenueGrowth).toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">vs {t('lastPeriod')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('totalInvoices')}</p>
                  <p className="text-2xl font-bold">{invoiceStats.totalInvoices}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <Progress value={invoiceStats.paidPercentage} className="h-2" />
                <span className="text-sm text-muted-foreground mt-1">
                  {invoiceStats.paidPercentage.toFixed(1)}% {t('paid')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('pendingAmount')}</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {invoiceStats.pendingAmount.toFixed(2)} €
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {invoiceStats.pendingCount} {t('pendingInvoices')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('averageAmount')}</p>
                  <p className="text-2xl font-bold">{invoiceStats.averageAmount.toFixed(2)} €</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('perInvoice')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchInvoices')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="PAID">{t('paid')}</SelectItem>
                <SelectItem value="PENDING">{t('pending')}</SelectItem>
                <SelectItem value="OVERDUE">{t('overdue')}</SelectItem>
                <SelectItem value="CANCELLED">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={handlePeriodSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t('filterByPeriod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPeriods')}</SelectItem>
                <SelectItem value="current_month">{t('currentMonth')}</SelectItem>
                <SelectItem value="last_month">{t('lastMonth')}</SelectItem>
                <SelectItem value="last_3_months">{t('last3Months')}</SelectItem>
                <SelectItem value="last_year">{t('lastYear')}</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} - {' '}
                        {format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy', { locale: fr })
                    )
                  ) : (
                    t('selectDateRange')
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPeriodFilter('all');
                setDateRange({});
                refetch();
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('resetFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceList')}</CardTitle>
          <CardDescription>
            {invoices?.length || 0} {t('invoicesFound')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold">{invoice.number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(invoice.date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('client')}</p>
                        <p className="font-medium">{invoice.clientName}</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('amount')}</p>
                        <p className="font-bold text-lg">{invoice.amount.toFixed(2)} €</p>
                      </div>
                      <div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {t('view')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{t('invoiceDetail')} - {invoice.number}</DialogTitle>
                            <DialogDescription>
                              {t('detailedInvoiceView')}
                            </DialogDescription>
                          </DialogHeader>
                          {invoiceDetail && (
                            <ScrollArea className="h-[60vh] pr-4">
                              <div className="space-y-6">
                                {/* Informations générales */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">{t('invoiceInfo')}</h4>
                                    <div className="space-y-1 text-sm">
                                      <p><span className="font-medium">{t('number')}:</span> {invoiceDetail.number}</p>
                                      <p><span className="font-medium">{t('date')}:</span> {format(new Date(invoiceDetail.date), 'dd/MM/yyyy', { locale: fr })}</p>
                                      <p><span className="font-medium">{t('dueDate')}:</span> {format(new Date(invoiceDetail.dueDate), 'dd/MM/yyyy', { locale: fr })}</p>
                                      <p><span className="font-medium">{t('status')}:</span> {getStatusBadge(invoiceDetail.status)}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">{t('clientInfo')}</h4>
                                    <div className="space-y-1 text-sm">
                                      <p><span className="font-medium">{t('name')}:</span> {invoiceDetail.client.name}</p>
                                      <p><span className="font-medium">{t('email')}:</span> {invoiceDetail.client.email}</p>
                                      <p><span className="font-medium">{t('address')}:</span> {invoiceDetail.client.address}</p>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Détail des services */}
                                <div>
                                  <h4 className="font-semibold mb-2">{t('services')}</h4>
                                  <div className="space-y-2">
                                    {invoiceDetail.items.map((item, index) => (
                                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div>
                                          <p className="font-medium">{item.description}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {item.quantity} × {item.unitPrice.toFixed(2)} €
                                          </p>
                                        </div>
                                        <p className="font-bold">{item.total.toFixed(2)} €</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <Separator />

                                {/* Totaux */}
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span>{t('subtotal')}:</span>
                                    <span>{invoiceDetail.subtotal.toFixed(2)} €</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{t('tax')} ({invoiceDetail.taxRate}%):</span>
                                    <span>{invoiceDetail.taxAmount.toFixed(2)} €</span>
                                  </div>
                                  <Separator />
                                  <div className="flex justify-between font-bold text-lg">
                                    <span>{t('total')}:</span>
                                    <span>{invoiceDetail.total.toFixed(2)} €</span>
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(invoice.id)}
                        disabled={downloadInvoiceMutation.isPending}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('download')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendEmail(invoice.id)}
                        disabled={sendInvoiceEmailMutation.isPending}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {t('sendEmail')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('noInvoicesFound')}</h3>
              <p className="text-muted-foreground">{t('noInvoicesDescription')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
