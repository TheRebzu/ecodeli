"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Euro,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  TrendingUp,
  Info
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { format, addMonths, subMonths, endOfMonth, startOfMonth, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface MonthlyBillingData {
  currentMonth: {
    totalServices: number;
    totalAmount: number;
    servicesDetails: ServiceDetail[];
    estimatedPaymentDate: string;
  };
  lastInvoice?: {
    id: string;
    month: number;
    year: number;
    amount: number;
    status: "PENDING" | "GENERATED" | "PAID";
    pdfUrl?: string;
    generatedAt: string;
    paidAt?: string;
  };
  upcomingInvoice: {
    generationDate: string;
    estimatedAmount: number;
    servicesCount: number;
  };
  billingSettings: {
    autoGeneration: boolean;
    generationDay: number;
    generationHour: number;
    paymentDelay: number; // jours
  };
}

interface ServiceDetail {
  id: string;
  name: string;
  date: string;
  clientName: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: "COMPLETED" | "PENDING";
}

export function MonthlyBilling() {
  const t = useTranslations("provider.billing.monthly");
  const { user } = useAuth();
  const { execute } = useApi();
  const [billingData, setBillingData] = useState<MonthlyBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Créer les méthodes GET et POST basées sur execute
  const get = async (url: string) => {
    return await execute(url, { method: 'GET' });
  };

  const post = async (url: string, options: { body: string }) => {
    return await execute(url, { 
      method: 'POST',
      body: options.body,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  useEffect(() => {
    fetchBillingData();
  }, [user?.id, selectedMonth]);

  const fetchBillingData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await get(`/api/provider/billing/monthly?providerId=${user.id}&month=${format(selectedMonth, "yyyy-MM")}`);
      if (response) {
        setBillingData(response);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast.error("Erreur lors du chargement des données de facturation");
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await get(`/api/provider/billing/invoices/${invoiceId}/download`);
      if (response?.url) {
        window.open(response.url, "_blank");
        toast.success("Téléchargement de la facture démarré");
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement de la facture");
    }
  };

  const previewInvoice = async () => {
    try {
      const response = await get(`/api/provider/billing/preview?providerId=${user?.id}&month=${format(selectedMonth, "yyyy-MM")}`);
      if (response?.url) {
        window.open(response.url, "_blank");
      }
    } catch (error) {
      toast.error("Erreur lors de la prévisualisation");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const nextGenerationDate = new Date();
  nextGenerationDate.setDate(30);
  nextGenerationDate.setHours(23, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Alerte facturation automatique */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Facturation automatique</AlertTitle>
        <AlertDescription className="text-blue-800">
          La facturation est générée automatiquement le 30 de chaque mois à 23h00. 
          Le virement bancaire est effectué dans les 3-5 jours ouvrés suivants.
        </AlertDescription>
      </Alert>

      {/* Statistiques du mois en cours */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prestations ce mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingData?.currentMonth.totalServices || 0}</div>
            <p className="text-xs text-muted-foreground">
              Services réalisés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant brut</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingData?.currentMonth.totalAmount.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">
              Avant commission EcoDeli
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochaine facture</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(nextGenerationDate, "dd/MM")}</div>
            <p className="text-xs text-muted-foreground">
              Génération à 23h00
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dernier paiement</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingData?.lastInvoice?.amount.toFixed(2)}€
            </div>
            {billingData?.lastInvoice?.paidAt && (
              <p className="text-xs text-muted-foreground">
                Payé le {format(new Date(billingData.lastInvoice.paidAt), "dd/MM/yyyy")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dernière facture */}
      {billingData?.lastInvoice && (
        <Card>
          <CardHeader>
            <CardTitle>Dernière facture générée</CardTitle>
            <CardDescription>
              Facture du mois de {format(new Date(billingData.lastInvoice.year, billingData.lastInvoice.month - 1), "MMMM yyyy", { locale: fr })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium">
                    Facture #{billingData.lastInvoice.id.slice(0, 8)}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Générée le {format(new Date(billingData.lastInvoice.generatedAt), "dd/MM/yyyy à HH:mm")}
                  </p>
                  <p className="text-lg font-semibold text-green-600 mt-1">
                    {billingData.lastInvoice.amount.toFixed(2)}€
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={billingData.lastInvoice.status === "PAID" ? "default" : "secondary"}>
                  {billingData.lastInvoice.status === "PAID" ? "Payée" : 
                   billingData.lastInvoice.status === "GENERATED" ? "Générée" : "En attente"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadInvoice(billingData.lastInvoice!.id)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Détails des prestations du mois */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des prestations du mois en cours</CardTitle>
          <CardDescription>
            Prestations réalisées en {format(selectedMonth, "MMMM yyyy", { locale: fr })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant brut</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Net à percevoir</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingData?.currentMonth.servicesDetails.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    {format(new Date(service.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.clientName}</TableCell>
                  <TableCell>{service.amount.toFixed(2)}€</TableCell>
                  <TableCell className="text-red-600">-{service.commission.toFixed(2)}€</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {service.netAmount.toFixed(2)}€
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.status === "COMPLETED" ? "default" : "secondary"}>
                      {service.status === "COMPLETED" ? "Terminé" : "En cours"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {billingData?.currentMonth.servicesDetails.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune prestation ce mois-ci</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" onClick={previewInvoice}>
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser la prochaine facture
          </Button>
          <Button variant="outline" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
            <Calendar className="h-4 w-4 mr-2" />
            Voir le mois précédent
          </Button>
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-900">
            <Clock className="h-5 w-5 inline mr-2" />
            Processus de facturation automatique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-amber-800">
            <li className="flex gap-2">
              <span className="font-semibold">1.</span>
              <span>Le 30 de chaque mois à 23h00 : Génération automatique de la facture PDF</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2.</span>
              <span>Synthèse de toutes vos prestations du mois avec calcul des commissions</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3.</span>
              <span>Envoi automatique de la facture par email</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4.</span>
              <span>Virement bancaire effectué sous 3-5 jours ouvrés</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">5.</span>
              <span>Archives accessibles à tout moment pour votre comptabilité</span>
            </li>
          </ol>
          <Alert className="mt-4 border-amber-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              En tant qu'autoentrepreneur, conservez toutes vos factures pour votre déclaration URSSAF.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 