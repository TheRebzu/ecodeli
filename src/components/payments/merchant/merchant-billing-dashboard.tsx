'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CreditCard,
  FileDown,
  FileText,
  Receipt,
  DollarSign,
  BarChart4,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import InvoiceList, { Invoice } from '../invoice-list';

// Données factices de statistiques de facturation pour la démo
interface BillingStats {
  totalPaid: number;
  pendingPayments: number;
  overdueAmount: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  currency: string;
}

// Données factices de factures pour la démo
const MOCK_INVOICES: Invoice[] = [
  {
    id: '1',
    number: 'INV-2023-001',
    date: new Date('2023-05-15'),
    dueDate: new Date('2023-06-15'),
    status: 'paid',
    amount: 129.99,
    currency: 'EUR',
    customerName: 'EcoDeli SAS',
    description: 'Abonnement mensuel - Mai 2023',
    pdfUrl: '/invoices/INV-2023-001.pdf',
  },
  {
    id: '2',
    number: 'INV-2023-002',
    date: new Date('2023-06-15'),
    dueDate: new Date('2023-07-15'),
    status: 'paid',
    amount: 129.99,
    currency: 'EUR',
    customerName: 'EcoDeli SAS',
    description: 'Abonnement mensuel - Juin 2023',
    pdfUrl: '/invoices/INV-2023-002.pdf',
  },
  {
    id: '3',
    number: 'INV-2023-003',
    date: new Date('2023-07-15'),
    dueDate: new Date('2023-08-15'),
    status: 'overdue',
    amount: 129.99,
    currency: 'EUR',
    customerName: 'EcoDeli SAS',
    description: 'Abonnement mensuel - Juillet 2023',
    pdfUrl: '/invoices/INV-2023-003.pdf',
  },
  {
    id: '4',
    number: 'INV-2023-004',
    date: new Date('2023-08-15'),
    dueDate: new Date('2023-09-15'),
    status: 'sent',
    amount: 129.99,
    currency: 'EUR',
    customerName: 'EcoDeli SAS',
    description: 'Abonnement mensuel - Août 2023',
    pdfUrl: '/invoices/INV-2023-004.pdf',
  },
  {
    id: '5',
    number: 'INV-2023-005',
    date: new Date('2023-09-15'),
    dueDate: new Date('2023-10-15'),
    status: 'draft',
    amount: 129.99,
    currency: 'EUR',
    customerName: 'EcoDeli SAS',
    description: 'Abonnement mensuel - Septembre 2023',
  },
];

// Statistiques pour la démo
const MOCK_STATS: BillingStats = {
  totalPaid: 259.98,
  pendingPayments: 129.99,
  overdueAmount: 129.99,
  totalInvoices: 5,
  paidInvoices: 2,
  pendingInvoices: 2,
  overdueInvoices: 1,
  currency: 'EUR',
};

interface MerchantBillingDashboardProps {
  merchantId: string;
}

export default function MerchantBillingDashboard({ merchantId }: MerchantBillingDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dans un cas réel, ces données seraient récupérées via tRPC
  const billingStats = MOCK_STATS;
  const invoices = MOCK_INVOICES;
  const isLoading = false;

  // Handlers pour les interactions
  const handleDownloadInvoice = (invoiceId: string) => {
    // Trouver l'invoice et ouvrir l'URL PDF dans un nouvel onglet
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice?.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    } else {
      console.error('PDF URL not found for invoice:', invoiceId);
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    // Rediriger vers la page de détail de la facture
    router.push(`/merchant/invoices/${invoiceId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Dans une implémentation réelle, on utiliserait:
    // refetchInvoices({ page, limit: pageSize });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Facturation & Paiements</h1>

      <Tabs defaultValue="overview" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Résumé général */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total payé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(billingStats.totalPaid, billingStats.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  En attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(billingStats.pendingPayments, billingStats.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  En retard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(billingStats.overdueAmount, billingStats.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Factures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">{billingStats.totalInvoices}</span>
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <span className="flex items-center text-green-500 mr-2">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {billingStats.paidInvoices} payées
                  </span>
                  <span className="flex items-center text-yellow-500 mr-2">
                    <Clock className="mr-1 h-3 w-3" />
                    {billingStats.pendingInvoices} en attente
                  </span>
                  <span className="flex items-center text-red-500">
                    <XCircle className="mr-1 h-3 w-3" />
                    {billingStats.overdueInvoices} en retard
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dernières factures */}
          <Card>
            <CardHeader>
              <CardTitle>Dernières factures</CardTitle>
              <CardDescription>Les 5 dernières factures émises</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceList
                invoices={invoices.slice(0, 5)}
                isLoading={isLoading}
                onDownload={handleDownloadInvoice}
                onView={handleViewInvoice}
                pagination={{ currentPage: 1, totalPages: 1, totalItems: invoices.length }}
              />

              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={() => setActiveTab('invoices')}>
                  Voir toutes les factures
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Méthodes de paiement */}
          <Card>
            <CardHeader>
              <CardTitle>Méthodes de paiement</CardTitle>
              <CardDescription>Gérez vos méthodes de paiement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-md border p-4">
                <div className="flex items-center gap-4">
                  <CreditCard className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Visa se terminant par 4242</p>
                    <p className="text-sm text-muted-foreground">Expire le 12/24</p>
                  </div>
                </div>
                <Badge>Par défaut</Badge>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline">Ajouter une carte</Button>
                <Button variant="outline">Gérer les méthodes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="pt-4">
          <InvoiceList
            invoices={invoices}
            isLoading={isLoading}
            onDownload={handleDownloadInvoice}
            onView={handleViewInvoice}
            onPageChange={handlePageChange}
            pagination={{
              currentPage,
              totalPages: Math.ceil(invoices.length / pageSize),
              totalItems: invoices.length,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
