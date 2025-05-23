'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Building,
  Calendar,
  CreditCard,
  Download,
  File,
  FileText,
  Printer,
  Receipt,
  RefreshCw,
  Send,
  User,
  Zap,
  Clipboard,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';

import { api } from '@/trpc/react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Type d'une ligne de facture
interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalExclTax: number;
  taxAmount: number;
  totalAmount: number;
}

// Type d'une facture complète
export interface InvoiceDetails {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  dueDate: Date | null;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  type: 'STANDARD' | 'SUBSCRIPTION' | 'COMMISSION' | 'SERVICE';
  amount: number;
  taxAmount: number;
  totalExclTax: number;
  currency: string;
  paymentMethod?: string;
  paidAt?: Date | null;
  issuerDetails: {
    name: string;
    address: string;
    email: string;
    phone?: string;
    taxId?: string;
    logoUrl?: string;
  };
  recipientDetails: {
    name: string;
    address?: string;
    email: string;
    taxId?: string;
  };
  items: InvoiceLineItem[];
  notes?: string;
  termsAndConditions?: string;
  paymentInstructions?: string;
  metadata?: Record<string, any>;
}

interface InvoiceDetailsProps {
  invoiceId: string;
  isDemo?: boolean;
  onBack: () => void;
  onDownload?: (invoiceId: string) => Promise<void>;
  onPrint?: (invoiceId: string) => Promise<void>;
  className?: string;
}

export function InvoiceDetails({
  invoiceId,
  isDemo = false,
  onBack,
  onDownload,
  onPrint,
  className,
}: InvoiceDetailsProps) {
  const t = useTranslations('invoices');
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Générer une facture démo
  const generateDemoInvoice = (): InvoiceDetails => {
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
    
    const dueDate = new Date(createdDate);
    dueDate.setDate(createdDate.getDate() + 30);
    
    // Générer des lignes de facture
    const items: InvoiceLineItem[] = [];
    const numberOfItems = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < numberOfItems; i++) {
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = Math.floor(Math.random() * 100) + 50;
      const taxRate = 0.2; // 20% TVA
      const totalExclTax = quantity * unitPrice;
      const taxAmount = totalExclTax * taxRate;
      
      items.push({
        id: `item-${i}`,
        description: i === 0 
          ? 'Abonnement Premium - Mensuel'
          : i === 1
          ? 'Service de livraison écologique'
          : i === 2
          ? 'Commission sur ventes'
          : 'Frais de gestion',
        quantity,
        unitPrice,
        taxRate,
        totalExclTax,
        taxAmount,
        totalAmount: totalExclTax + taxAmount,
      });
    }
    
    // Calculer les totaux
    const totalExclTax = items.reduce((sum, item) => sum + item.totalExclTax, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = totalExclTax + taxAmount;
    
    // Créer la facture démo
    return {
      id: invoiceId,
      invoiceNumber: `FAC-${2025}-${invoiceId.slice(-3).padStart(3, '0')}`,
      createdAt: createdDate,
      dueDate,
      status: Math.random() > 0.7 ? 'PAID' : Math.random() > 0.5 ? 'ISSUED' : 'DRAFT',
      type: 'SUBSCRIPTION',
      amount: totalAmount,
      taxAmount,
      totalExclTax,
      currency: 'EUR',
      paymentMethod: Math.random() > 0.5 ? 'Carte bancaire' : 'Virement bancaire',
      paidAt: Math.random() > 0.7 ? new Date() : null,
      issuerDetails: {
        name: 'EcoDeli SAS',
        address: '15 Avenue des Champs-Élysées, 75008 Paris, France',
        email: 'facturation@ecodeli.fr',
        phone: '+33 1 23 45 67 89',
        taxId: 'FR 12 345 678 901',
        logoUrl: '/images/logo.png',
      },
      recipientDetails: {
        name: 'Client Demo',
        address: '123 Rue de la Démo, 75001 Paris, France',
        email: 'client@exemple.fr',
        taxId: 'FR 98 765 432 109',
      },
      items,
      notes: 'Merci pour votre confiance. Cette facture a été générée automatiquement.',
      termsAndConditions: 'Paiement à réception. Pénalités de retard au taux légal en vigueur.',
      paymentInstructions: 'Veuillez effectuer votre paiement par virement bancaire en précisant le numéro de facture.',
      metadata: {
        subscriptionPlan: 'Premium',
        period: format(createdDate, 'MMMM yyyy', { locale: fr }),
      },
    };
  };
  
  // Requête pour récupérer les détails de la facture
  const { data: invoice, isLoading, refetch } = isDemo
    ? { data: generateDemoInvoice(), isLoading: false, refetch: async () => {} }
    : api.invoice.getInvoiceDetails.useQuery(
        { invoiceId },
        {
          enabled: !!invoiceId && !isDemo,
          refetchOnWindowFocus: false,
        }
      );
  
  // Télécharger la facture
  const handleDownload = async () => {
    try {
      if (isDemo) {
        toast({
          title: t('downloadStarted'),
          description: t('demoDownloadMessage'),
        });
        return;
      }
      
      if (onDownload && invoice) {
        await onDownload(invoice.id);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('downloadError'),
        description: typeof error === 'string' ? error : t('genericError'),
      });
    }
  };
  
  // Imprimer la facture
  const handlePrint = async () => {
    try {
      if (isDemo) {
        // Simuler l'impression
        window.print();
        return;
      }
      
      if (onPrint && invoice) {
        await onPrint(invoice.id);
      } else {
        // Fallback pour utiliser l'impression du navigateur
        window.print();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('printError'),
        description: typeof error === 'string' ? error : t('genericError'),
      });
    }
  };
  
  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Copier le numéro de facture dans le presse-papier
  const copyInvoiceNumber = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice.invoiceNumber);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: t('copied'),
        description: t('invoiceNumberCopied', { number: invoice.invoiceNumber }),
      });
    }
  };
  
  // Obtenir l'icône et la couleur selon le statut
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-50 text-green-700 border-green-200',
          label: t('statusPaid')
        };
      case 'ISSUED':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          label: t('statusIssued')
        };
      case 'DRAFT':
        return {
          icon: <File className="h-4 w-4" />,
          color: 'bg-gray-50 text-gray-700 border-gray-200',
          label: t('statusDraft')
        };
      case 'OVERDUE':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-red-50 text-red-700 border-red-200',
          label: t('statusOverdue')
        };
      case 'CANCELLED':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'bg-gray-50 text-gray-500 border-gray-200',
          label: t('statusCancelled')
        };
      default:
        return {
          icon: <Info className="h-4 w-4" />,
          color: 'bg-gray-50 text-gray-700 border-gray-200',
          label: status
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToInvoices')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToInvoices')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('invoiceNotFound')}</CardTitle>
            <CardDescription>{t('invoiceNotFoundDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>
                {t('invoiceNotFoundError', { id: invoiceId })}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={onBack}>
              {t('backToInvoices')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const statusInfo = getStatusInfo(invoice.status);

  return (
    <div className="space-y-4 print:m-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToInvoices')}
        </Button>

        <div className="flex items-center gap-2">
          {isDemo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {t('demoMode')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('demoModeDescription')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
            <Button
              variant="outline"
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="print:hidden"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
            </Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="pb-4 print:pb-0">
          <div className="flex items-center justify-between print:block">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                {t('invoiceDetails')}
            </CardTitle>
              <CardDescription>{t('invoiceDescription')}</CardDescription>
            </div>
            <Badge variant="outline" className={`${statusInfo.color} flex items-center gap-1 print:absolute print:top-4 print:right-4`}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* En-tête de facture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{invoice.issuerDetails.name}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {invoice.issuerDetails.address}
                  </p>
                  <div className="text-sm mt-2">
                    <p>{invoice.issuerDetails.email}</p>
                    {invoice.issuerDetails.phone && <p>{invoice.issuerDetails.phone}</p>}
                    {invoice.issuerDetails.taxId && (
                      <p className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5" />
                        {invoice.issuerDetails.taxId}
                      </p>
                    )}
                  </div>
                </div>
                {invoice.issuerDetails.logoUrl && (
                  <div className="hidden md:block">
                    <img 
                      src={invoice.issuerDetails.logoUrl} 
                      alt={invoice.issuerDetails.name}
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium flex items-center gap-1">
                <User className="h-4 w-4" />
                {t('billedTo')}
                </h3>
                <div className="mt-1">
                  <p className="font-medium">{invoice.recipientDetails.name}</p>
                  {invoice.recipientDetails.address && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {invoice.recipientDetails.address}
                    </p>
                  )}
                  <p className="text-sm">{invoice.recipientDetails.email}</p>
                  {invoice.recipientDetails.taxId && (
                    <p className="text-sm flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      {invoice.recipientDetails.taxId}
                    </p>
                  )}
            </div>
          </div>

              <div className="bg-muted/50 p-4 rounded-lg grid grid-cols-2 gap-4">
          <div>
                  <p className="text-sm text-muted-foreground">{t('invoiceNumber')}</p>
                  <div className="flex items-center gap-1">
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5" 
                            onClick={copyInvoiceNumber}
                          >
                            {isCopied ? 
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : 
                              <Clipboard className="h-3.5 w-3.5" />
                            }
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('copyInvoiceNumber')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
            </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">{t('invoiceDate')}</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(invoice.createdAt), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">{t('dueDate')}</p>
                  <p className="font-medium">
                    {invoice.dueDate 
                      ? format(new Date(invoice.dueDate), 'dd MMMM yyyy', { locale: fr })
                      : '-'
                    }
                  </p>
                </div>

                {invoice.status === 'PAID' && invoice.paidAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('paidOn')}</p>
                    <p className="font-medium text-green-600">
                      {format(new Date(invoice.paidAt), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                
                {invoice.paymentMethod && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('paymentMethod')}</p>
                    <p className="font-medium flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      {invoice.paymentMethod}
                    </p>
                  </div>
                )}
                
                {invoice.type && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('invoiceType')}</p>
                    <p className="font-medium">
                      {t(`type${invoice.type.charAt(0) + invoice.type.slice(1).toLowerCase()}`)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Détails des articles */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('invoiceItems')}</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">{t('description')}</TableHead>
                    <TableHead className="text-right">{t('quantity')}</TableHead>
                    <TableHead className="text-right">{t('unitPrice')}</TableHead>
                    <TableHead className="text-right">{t('totalExclTax')}</TableHead>
                    <TableHead className="text-right">{t('taxRate')}</TableHead>
                    <TableHead className="text-right">{t('tax')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.totalExclTax, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.taxRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.taxAmount, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalAmount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>{t('subtotal')}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.totalExclTax, invoice.currency)}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      {formatCurrency(invoice.taxAmount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
          
          {/* Informations complémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {invoice.notes && (
              <div>
                <h3 className="text-sm font-medium mb-2">{t('notes')}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
            
            {invoice.paymentInstructions && (
              <div>
                <h3 className="text-sm font-medium mb-2">{t('paymentInstructions')}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.paymentInstructions}</p>
              </div>
            )}
          </div>

          {invoice.termsAndConditions && (
            <div>
              <Separator />
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">{t('termsAndConditions')}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.termsAndConditions}</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0 items-start sm:items-center border-t pt-6 print:hidden">
          <div className="flex space-x-2">
            <Button
              variant="default"
              onClick={handleDownload}
              disabled={invoice.status === 'DRAFT'}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('downloadPdf')}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {t('print')}
            </Button>
          </div>
          
          {invoice.status === 'ISSUED' && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              {t('paymentDue', { 
                date: format(
                  new Date(invoice.dueDate || new Date()), 
                  'dd MMMM yyyy', 
                  { locale: fr }
                )
              })}
            </Badge>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
