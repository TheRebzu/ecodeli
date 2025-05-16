'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';

import { InvoiceList, Invoice } from '@/components/payments/invoice-list';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Download } from 'lucide-react';

// Données de test des factures
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

export default function ClientInvoicesPage() {
  const t = useTranslations('invoices');
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // À remplacer par un appel tRPC réel
  const {
    data: invoices,
    isLoading,
    error,
  } = {
    data: mockInvoices,
    isLoading: false,
    error: null,
  };
  // Décommenter pour utiliser tRPC
  // const { data: invoices, isLoading, error } = api.invoices.getClientInvoices.useQuery();

  // Gérer le téléchargement de la facture
  const handleDownload = async (invoiceId: string) => {
    setIsDownloading(invoiceId);
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
      setIsDownloading(null);
    }
  };

  // Rediriger vers la page de détail
  const handleViewDetails = (invoiceId: string) => {
    router.push(`/client/invoices/${invoiceId}`);
  };

  // Gérer les erreurs
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container py-8">
      <InvoiceList
        invoices={invoices || []}
        isLoading={isLoading}
        onDownload={handleDownload}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
}
