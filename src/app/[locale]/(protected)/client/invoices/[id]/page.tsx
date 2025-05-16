'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

import { InvoiceDetails } from '@/components/payments/invoice-details';
import { Invoice } from '@/components/payments/invoice-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

// Données de test des factures (les mêmes que dans la page liste)
const mockInvoices: Invoice[] = [
  {
    id: 'inv-001',
    number: 'FAC-2025-001',
    amount: 42.5,
    currency: 'EUR',
    status: 'PAID',
    dueDate: new Date('2025-06-15'),
    issuedDate: new Date('2025-05-15'),
    paidDate: new Date('2025-05-20'),
    pdfUrl: '/invoices/fac-2025-001.pdf',
    items: [
      {
        id: 'item-001',
        description: 'Livraison éco-responsable',
        quantity: 1,
        unitPrice: 35.0,
        taxRate: 20,
        taxAmount: 7.0,
        totalAmount: 42.0,
      },
    ],
  },
  {
    id: 'inv-002',
    number: 'FAC-2025-002',
    amount: 68.75,
    currency: 'EUR',
    status: 'SENT',
    dueDate: new Date('2025-06-30'),
    issuedDate: new Date('2025-05-30'),
    pdfUrl: '/invoices/fac-2025-002.pdf',
    items: [
      {
        id: 'item-002',
        description: 'Livraison éco-responsable',
        quantity: 1,
        unitPrice: 35.0,
        taxRate: 20,
        taxAmount: 7.0,
        totalAmount: 42.0,
      },
      {
        id: 'item-003',
        description: 'Service de stockage temporaire',
        quantity: 2,
        unitPrice: 10.0,
        taxRate: 10,
        taxAmount: 2.0,
        totalAmount: 22.0,
      },
    ],
  },
  {
    id: 'inv-003',
    number: 'FAC-2025-003',
    amount: 35.0,
    currency: 'EUR',
    status: 'OVERDUE',
    dueDate: new Date('2025-05-20'),
    issuedDate: new Date('2025-05-05'),
    pdfUrl: '/invoices/fac-2025-003.pdf',
    items: [
      {
        id: 'item-004',
        description: 'Abonnement mensuel',
        quantity: 1,
        unitPrice: 29.17,
        taxRate: 20,
        taxAmount: 5.83,
        totalAmount: 35.0,
      },
    ],
  },
  {
    id: 'inv-004',
    number: 'FAC-2025-004',
    amount: 19.9,
    currency: 'EUR',
    status: 'DRAFT',
    dueDate: new Date('2025-07-15'),
    issuedDate: new Date('2025-06-15'),
    items: [
      {
        id: 'item-005',
        description: 'Frais de service',
        quantity: 1,
        unitPrice: 16.58,
        taxRate: 20,
        taxAmount: 3.32,
        totalAmount: 19.9,
      },
    ],
  },
];

export default function InvoiceDetailsPage() {
  const t = useTranslations('invoices');
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simuler un chargement de données
  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        // Simule un délai réseau
        await new Promise(resolve => setTimeout(resolve, 500));

        // Récupère la facture à partir des données mockées
        const foundInvoice = mockInvoices.find(inv => inv.id === invoiceId);

        if (foundInvoice) {
          setInvoice(foundInvoice);
        } else {
          setError(t('invoiceNotFound'));
        }
      } catch (err) {
        setError(t('errorLoadingInvoice'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, t]);

  // Dans une vraie application, on utiliserait tRPC:
  // const { data: invoice, isLoading, error } = api.invoices.getInvoiceById.useQuery({ invoiceId });

  // Gérer le téléchargement de la facture
  const handleDownload = async (invoiceId: string) => {
    setIsDownloading(true);
    try {
      // Simuler un téléchargement pour les tests
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Récupérer l'URL du PDF - à remplacer par l'implémentation réelle
      const invoice = mockInvoices.find(inv => inv.id === invoiceId);
      if (invoice?.pdfUrl) {
        // Dans une implémentation réelle, on redirigerait vers l'URL ou on déclencherait le téléchargement
        console.log(`Téléchargement de ${invoice.pdfUrl}`);
      }

      // Décommenter pour utiliser tRPC
      // await api.invoices.downloadInvoice.mutate({ invoiceId });
    } catch (err) {
      console.error('Erreur lors du téléchargement', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Gérer le paiement de la facture
  const handlePayInvoice = async () => {
    setIsPaymentProcessing(true);
    try {
      // Simule un délai de paiement
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simule une redirection vers une page de paiement
      router.push(`/client/payments/process?invoiceId=${invoiceId}`);

      // Décommenter pour utiliser tRPC
      // await api.invoices.createPaymentIntent.mutate({ invoiceId });
    } catch (err) {
      console.error('Erreur lors du paiement', err);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  // Retour à la liste des factures
  const handleBack = () => {
    router.push('/client/invoices');
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('invoiceNotFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <InvoiceDetails
        invoice={invoice}
        onDownload={handleDownload}
        onBack={handleBack}
        onPay={
          invoice.status === 'SENT' || invoice.status === 'OVERDUE' ? handlePayInvoice : undefined
        }
      />
    </div>
  );
}
