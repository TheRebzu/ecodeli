'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Download, 
  FileText, 
  Loader2, 
  Mail, 
  Eye,
  Settings
} from 'lucide-react';
import { api } from '@/trpc/react';

interface InvoiceDownloadProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    pdfUrl?: string;
    amount: number;
    currency: string;
    user?: {
      email: string;
      name: string;
    };
  };
  showPreview?: boolean;
  showEmail?: boolean;
  showTemplateOptions?: boolean;
}

export function InvoiceDownload({ 
  invoice, 
  showPreview = true, 
  showEmail = true,
  showTemplateOptions = true 
}: InvoiceDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'DEFAULT' | 'SIMPLE' | 'DETAILED'>('DEFAULT');

  // Mutation pour générer un PDF avec template
  const generatePdfMutation = api.invoice.generateInvoicePdf.useMutation({
    onSuccess: (data) => {
      if (data.pdfUrl) {
        // Télécharger automatiquement le fichier
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.download = `${invoice.invoiceNumber}-${selectedTemplate.toLowerCase()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Facture téléchargée avec succès');
      }
      setIsDownloading(false);
    },
    onError: (error) => {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
      setIsDownloading(false);
    }
  });

  // Mutation pour envoyer par email
  const sendEmailMutation = api.invoice.sendInvoiceEmail.useMutation({
    onSuccess: () => {
      toast.success('Facture envoyée par email avec succès');
      setIsSendingEmail(false);
    },
    onError: (error) => {
      console.error('Erreur envoi email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
      setIsSendingEmail(false);
    }
  });

  const handleDownload = async (template: 'DEFAULT' | 'SIMPLE' | 'DETAILED' = 'DEFAULT') => {
    setIsDownloading(true);
    setSelectedTemplate(template);
    
    try {
      // Si la facture a déjà un PDF et qu'on demande le template par défaut, télécharger directement
      if (invoice.pdfUrl && template === 'DEFAULT') {
        const link = document.createElement('a');
        link.href = invoice.pdfUrl;
        link.download = `${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Facture téléchargée avec succès');
        setIsDownloading(false);
      } else {
        // Générer un nouveau PDF avec le template spécifié
        await generatePdfMutation.mutateAsync({
          invoiceId: invoice.id,
          template
        });
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice.user?.email) {
      toast.error('Aucune adresse email disponible');
      return;
    }

    setIsSendingEmail(true);
    
    try {
      await sendEmailMutation.mutateAsync({
        invoiceId: invoice.id,
        recipientEmail: invoice.user.email,
        includePDF: true
      });
    } catch (error) {
      console.error('Erreur envoi email:', error);
      setIsSendingEmail(false);
    }
  };

  const handlePreview = () => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    } else {
      toast.info('Génération de l\'aperçu en cours...');
      handleDownload('DEFAULT');
    }
  };

  // Statut de la facture pour affichage
  const getStatusBadge = () => {
    const statusConfig = {
      DRAFT: { variant: 'secondary' as const, label: 'Brouillon' },
      ISSUED: { variant: 'default' as const, label: 'Émise' },
      PAID: { variant: 'success' as const, label: 'Payée' },
      OVERDUE: { variant: 'destructive' as const, label: 'Échue' },
      CANCELLED: { variant: 'secondary' as const, label: 'Annulée' }
    };
    
    const config = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.DRAFT;
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {/* Statut de la facture */}
      {getStatusBadge()}
      
      {/* Bouton de téléchargement principal */}
      <Button
        onClick={() => handleDownload('DEFAULT')}
        disabled={isDownloading}
        size="sm"
        variant="outline"
      >
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Télécharger
      </Button>

      {/* Menu déroulant pour les options avancées */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Options de téléchargement</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Templates de PDF */}
          {showTemplateOptions && (
            <>
              <DropdownMenuItem onClick={() => handleDownload('DEFAULT')}>
                <FileText className="mr-2 h-4 w-4" />
                Template standard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('SIMPLE')}>
                <FileText className="mr-2 h-4 w-4" />
                Template simple
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('DETAILED')}>
                <FileText className="mr-2 h-4 w-4" />
                Template détaillé
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Aperçu */}
          {showPreview && (
            <DropdownMenuItem onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Aperçu
            </DropdownMenuItem>
          )}
          
          {/* Envoi par email */}
          {showEmail && invoice.user?.email && (
            <DropdownMenuItem 
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Envoyer par email
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Informations supplémentaires */}
      <div className="text-sm text-muted-foreground">
        {invoice.amount.toLocaleString('fr-FR', { 
          style: 'currency', 
          currency: invoice.currency || 'EUR' 
        })}
      </div>
    </div>
  );
}
