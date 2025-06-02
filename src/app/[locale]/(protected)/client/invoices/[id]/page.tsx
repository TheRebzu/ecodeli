'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Download, Printer, Share2 } from 'lucide-react';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { InvoiceDetails } from '@/components/payments/invoice-details';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface InvoiceDetailsPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default function InvoiceDetailsPage({ params }: InvoiceDetailsPageProps) {
  const { id, locale } = use(params);
  const t = useTranslations('invoices');
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Mode démo seulement si l'ID contient explicitement "demo"
  const isDemo = id === 'demo' || id.startsWith('demo-');
  
  // Fonction pour télécharger la facture
  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      setIsDownloading(true);
      
      // Dans une implémentation réelle, appelez l'API pour télécharger la facture
      if (!isDemo) {
        // Simulation du téléchargement pour le moment
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast({
        variant: "default",
        title: t('downloadStarted'),
      });
      
      return Promise.resolve();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('downloadError'),
      });
      throw error;
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Fonction pour imprimer la facture
  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      setIsPrinting(true);
      
      // Dans la version actuelle, on utilise l'impression native du navigateur
      // Une implémentation réelle pourrait générer un PDF puis l'imprimer
      window.print();
      
      return Promise.resolve();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('printError'),
      });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };
  
  // Fonction pour partager la facture
  const handleShareInvoice = () => {
    if (navigator.share) {
      navigator.share({
        title: t('shareInvoiceTitle'),
        text: t('shareInvoiceText'),
        url: window.location.href,
      }).catch((err) => {
        console.error('Erreur lors du partage:', err);
      });
    } else {
      // Copier l'URL dans le presse-papier si le partage n'est pas disponible
      navigator.clipboard.writeText(window.location.href);
      toast({
        variant: "default",
        title: t('linkCopied'),
      });
    }
  };
  
  // Fonction pour revenir à la liste des factures
  const handleBack = () => {
    router.push(`/${locale}/client/invoices`);
  };
  
  // Fonction pour voir l'historique de paiement
  const handleViewPaymentHistory = () => {
    router.push(`/${locale}/client/payments`);
  };
  
  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToInvoices')}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePrintInvoice(id)}
            disabled={isPrinting}
          >
            <Printer className="h-4 w-4 mr-2" />
            {t('print')}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleDownloadInvoice(id)}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('download')}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                {t('share')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShareInvoice}>
                {t('copyLink')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(`mailto:?subject=${t('shareInvoiceTitle')}&body=${window.location.href}`)}>
                {t('shareByEmail')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Contenu principal */}
      <InvoiceDetails
        invoiceId={id}
        isDemo={isDemo}
        onBack={handleBack}
        onDownload={handleDownloadInvoice}
        onPrint={handlePrintInvoice}
      />
      
      {/* Actions supplémentaires */}
      <Separator className="my-6" />
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button variant="outline" onClick={handleViewPaymentHistory}>
          {t('viewPaymentHistory')}
        </Button>
      </div>
    </div>
  );
}
