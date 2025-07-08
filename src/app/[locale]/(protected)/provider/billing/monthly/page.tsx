"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText,
  Download,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calculator,
  Send,
  Eye,
  Settings
} from "lucide-react";
import { Link } from "@/i18n/navigation";

interface MonthlyBilling {
  month: string;
  year: number;
  status: 'DRAFT' | 'PENDING' | 'GENERATED' | 'SENT' | 'PAID';
  totalRevenue: number;
  platformFee: number;
  netAmount: number;
  taxAmount: number;
  completedBookings: number;
  invoiceNumber?: string;
  generatedAt?: string;
  sentAt?: string;
  paidAt?: string;
  dueDate?: string;
  billingPeriod: {
    startDate: string;
    endDate: string;
  };
  bookingBreakdown: Array<{
    id: string;
    clientName: string;
    serviceName: string;
    date: string;
    amount: number;
    commission: number;
    netAmount: number;
  }>;
  feeBreakdown: {
    platformCommission: number;
    processingFees: number;
    taxAmount: number;
    otherFees: number;
  };
}

export default function ProviderBillingMonthlyPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.billing");
  const [billing, setBilling] = useState<MonthlyBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchMonthlyBilling = async () => {
      if (!user?.id) return;
      
      try {
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        
        const response = await fetch(`/api/provider/billing/monthly?userId=${user.id}&month=${month}&year=${year}`);
        if (response.ok) {
          const data = await response.json();
          setBilling(data);
        }
      } catch (error) {
        console.error("Error fetching monthly billing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyBilling();
  }, [user]);

  const handleGenerateInvoice = async () => {
    if (!user?.id || !billing) return;
    
    setGenerating(true);
    try {
      const response = await fetch('/api/provider/billing/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          month: billing.month,
          year: billing.year
        })
      });

      if (response.ok) {
        const updatedBilling = await response.json();
        setBilling(updatedBilling);
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'SENT':
        return <Send className="h-4 w-4 text-blue-600" />;
      case 'GENERATED':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'DRAFT':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Payée</Badge>;
      case 'SENT':
        return <Badge className="bg-blue-100 text-blue-800">Envoyée</Badge>;
      case 'GENERATED':
        return <Badge className="bg-purple-100 text-purple-800">Générée</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">Brouillon</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateProgress = () => {
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysPassed = currentDate.getDate() - 1;
    const totalDays = monthEnd.getDate();
    return Math.round((daysPassed / totalDays) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement de la facturation mensuelle...</p>
        </div>
      </div>
    );
  }

  if (!user || !billing) {
    return (
      <div className="text-center py-8">
        <p>Impossible de charger les informations de facturation.</p>
      </div>
    );
  }

  const monthProgress = calculateProgress();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturation Mensuelle"
        description={`Facturation pour ${billing.month} ${billing.year}`}
      />

      {/* Status Alert */}
      {billing.status === 'DRAFT' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Votre facture mensuelle sera générée automatiquement le 30 du mois à 23h. 
            Vous pouvez également la générer manuellement si le mois est terminé.
          </AlertDescription>
        </Alert>
      )}

      {billing.status === 'PENDING' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Génération de facture en attente. Le traitement sera effectué dans les prochaines heures.
          </AlertDescription>
        </Alert>
      )}

      {/* Month Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Progression du Mois
            </div>
            {getStatusBadge(billing.status)}
          </CardTitle>
          <CardDescription>
            Période de facturation: {formatDate(billing.billingPeriod.startDate)} - {formatDate(billing.billingPeriod.endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progression du mois</span>
              <span className="text-sm text-muted-foreground">{monthProgress}%</span>
            </div>
            <Progress value={monthProgress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Bruts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(billing.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {billing.completedBookings} réservations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Plateforme</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">-{formatCurrency(billing.platformFee)}</div>
            <p className="text-xs text-muted-foreground">
              {((billing.platformFee / billing.totalRevenue) * 100).toFixed(1)}% du CA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{formatCurrency(billing.taxAmount)}</div>
            <p className="text-xs text-muted-foreground">
              TVA et charges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net à Payer</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(billing.netAmount)}</div>
            <p className="text-xs text-muted-foreground">
              montant final
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestion de la Facture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {billing.invoiceNumber ? (
                <div>
                  <p className="font-medium">Facture N° {billing.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Générée le {billing.generatedAt && formatDate(billing.generatedAt)}
                  </p>
                  {billing.dueDate && (
                    <p className="text-sm text-muted-foreground">
                      Échéance: {formatDate(billing.dueDate)}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-medium">Facture non générée</p>
                  <p className="text-sm text-muted-foreground">
                    La facture sera générée automatiquement en fin de mois
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {billing.status === 'DRAFT' && new Date().getDate() >= 28 && (
                <Button onClick={handleGenerateInvoice} disabled={generating}>
                  <FileText className="h-4 w-4 mr-2" />
                  {generating ? 'Génération...' : 'Générer la facture'}
                </Button>
              )}
              
              {billing.invoiceNumber && (
                <>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Aperçu
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des Frais</CardTitle>
          <CardDescription>
            Répartition des commissions et frais appliqués
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span>Commission plateforme</span>
              <span className="font-medium">{formatCurrency(billing.feeBreakdown.platformCommission)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span>Frais de traitement</span>
              <span className="font-medium">{formatCurrency(billing.feeBreakdown.processingFees)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span>Taxes</span>
              <span className="font-medium">{formatCurrency(billing.feeBreakdown.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span>Autres frais</span>
              <span className="font-medium">{formatCurrency(billing.feeBreakdown.otherFees)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2 font-bold">
              <span>Total des frais</span>
              <span className="text-red-600">{formatCurrency(billing.platformFee + billing.taxAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des Réservations</CardTitle>
          <CardDescription>
            Liste des réservations facturées ce mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billing.bookingBreakdown.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune réservation ce mois</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billing.bookingBreakdown.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.clientName}</TableCell>
                      <TableCell>{booking.serviceName}</TableCell>
                      <TableCell>{formatDate(booking.date)}</TableCell>
                      <TableCell>{formatCurrency(booking.amount)}</TableCell>
                      <TableCell className="text-orange-600">-{formatCurrency(booking.commission)}</TableCell>
                      <TableCell className="font-medium text-green-600">{formatCurrency(booking.netAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/provider/billing/archives">
                <FileText className="h-4 w-4 mr-2" />
                Voir les archives
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/provider/earnings/summary">
                <DollarSign className="h-4 w-4 mr-2" />
                Résumé des gains
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/provider/billing">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres facturation
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}