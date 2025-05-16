'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  ChevronLeft,
  ArrowLeftRight,
  Building,
  BadgeEuro,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { Invoice, InvoiceStatus } from './invoice-list';

interface InvoiceDetailsProps {
  invoice: Invoice;
  isLoading?: boolean;
  onDownload: (invoiceId: string) => void;
  onBack: () => void;
  onPay?: () => void;
}

export function InvoiceDetails({
  invoice,
  isLoading = false,
  onDownload,
  onBack,
  onPay,
}: InvoiceDetailsProps) {
  const t = useTranslations('invoices');

  // Obtenir l'icône et le style du badge en fonction du statut
  const getStatusDetails = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          badge: 'bg-green-50 text-green-700 border-green-200',
          label: t('statusPaid'),
        };
      case 'SENT':
        return {
          icon: <Clock className="h-5 w-5 text-amber-500" />,
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          label: t('statusSent'),
        };
      case 'OVERDUE':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          badge: 'bg-red-50 text-red-700 border-red-200',
          label: t('statusOverdue'),
        };
      case 'DRAFT':
        return {
          icon: <FileText className="h-5 w-5 text-slate-500" />,
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
          label: t('statusDraft'),
        };
      case 'VOIDED':
        return {
          icon: <Ban className="h-5 w-5 text-gray-500" />,
          badge: 'bg-gray-50 text-gray-700 border-gray-200',
          label: t('statusVoided'),
        };
      default:
        return {
          icon: <FileText className="h-5 w-5" />,
          badge: '',
          label: status,
        };
    }
  };

  const statusDetails = getStatusDetails(invoice.status);

  // Calcul des sous-totaux
  const subtotal = invoice.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const taxTotal = invoice.items.reduce((acc, item) => acc + item.taxAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          {t('backToInvoices')}
        </Button>

        <div className="flex items-center gap-2">
          {invoice.status === 'SENT' || invoice.status === 'OVERDUE' ? (
            <Button onClick={onPay} disabled={!onPay} className="flex items-center gap-1">
              <BadgeEuro className="h-4 w-4" />
              {t('payNow')}
            </Button>
          ) : null}

          {invoice.pdfUrl && (
            <Button
              variant="outline"
              onClick={() => onDownload(invoice.id)}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              {t('downloadPdf')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">
              {t('invoice')} {invoice.number}
            </CardTitle>
            <div className="flex items-center gap-2">
              {statusDetails.icon}
              <Badge className={statusDetails.badge} variant="outline">
                {statusDetails.label}
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('issuedDate')}</p>
            <p className="font-medium">
              {format(new Date(invoice.issuedDate), 'dd MMMM yyyy', { locale: fr })}
            </p>

            <p className="text-sm text-muted-foreground mt-2">{t('dueDate')}</p>
            <p className="font-medium">
              {format(new Date(invoice.dueDate), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Building className="h-4 w-4" />
                {t('billedFrom')}
              </p>
              <p className="font-medium">EcoDeli SAS</p>
              <p className="text-sm">123 Avenue de la Livraison</p>
              <p className="text-sm">75001 Paris, France</p>
              <p className="text-sm">SIRET: 123 456 789 00001</p>
              <p className="text-sm">TVA: FR 12 345 678 901</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                {t('billedTo')}
              </p>
              <p className="font-medium">Client EcoDeli</p>
              <p className="text-sm">Identification: {invoice.id.substring(0, 8)}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-3">{t('invoiceItems')}</h3>

            <div className="border rounded-md">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('description')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('quantity')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('unitPrice')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('taxRate')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('amount')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {invoice.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{item.taxRate}%</td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        {formatCurrency(item.quantity * item.unitPrice, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col items-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('subtotal')}</span>
                  <span>{formatCurrency(subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('tax')}</span>
                  <span>{formatCurrency(taxTotal, invoice.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>{t('total')}</span>
                  <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
                </div>

                {invoice.status === 'PAID' && invoice.paidDate && (
                  <div className="flex justify-between text-sm text-green-600 font-medium mt-2">
                    <span>{t('paidOn')}</span>
                    <span>{format(new Date(invoice.paidDate), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p className="font-medium">{t('paymentInstructions')}</p>
            <p>{t('paymentTerms')}</p>
            <p className="mt-2">{t('questionsContact')}</p>
          </div>
        </CardContent>

        <CardFooter className="border-t bg-muted/50 flex justify-between">
          <div className="text-xs text-muted-foreground">
            <p>{t('generatedBy')} EcoDeli</p>
          </div>

          {invoice.pdfUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(invoice.id)}
              className="flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              {t('download')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
