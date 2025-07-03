'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface MonthlyBilling {
  id: string;
  providerId: string;
  year: number;
  month: number;
  totalServices: number;
  totalRevenue: number;
  ecoDeliCommission: number;
  netAmount: number;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'PAID';
  invoiceUrl?: string;
  generatedAt?: string;
  paidAt?: string;
  services: BillingService[];
}

interface BillingService {
  id: string;
  name: string;
  category: string;
  completedAt: string;
  price: number;
  commission: number;
  netAmount: number;
  clientName: string;
}

export function CurrentMonthSummary() {
  const { user } = useAuth();
  const { execute } = useApi();
  const [billing, setBilling] = useState<MonthlyBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
    fetchCurrentMonthBilling();
  }, [user?.id]);

  const fetchCurrentMonthBilling = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await get(`/api/provider/billing/monthly?providerId=${user.id}&year=${year}&month=${month}`);
      
      if (response) {
        setBilling(response);
      }
    } catch (error) {
      console.error("Error fetching current month billing:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    if (!billing) return;
    
    try {
      setGenerating(true);
      const response = await post(`/api/provider/billing/invoices`, {
        body: JSON.stringify({
          providerId: user?.id,
          year: billing.year,
          month: billing.month
        })
      });

      if (response) {
        toast.success("Facture générée avec succès");
        fetchCurrentMonthBilling(); // Refresh data
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Erreur lors de la génération de la facture");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentDate = new Date();
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: { color: "bg-gray-100 text-gray-800", label: "Brouillon" },
      GENERATED: { color: "bg-blue-100 text-blue-800", label: "Générée" },
      SENT: { color: "bg-yellow-100 text-yellow-800", label: "Envoyée" },
      PAID: { color: "bg-green-100 text-green-800", label: "Payée" }
    };

    const statusConfig = config[status as keyof typeof config] || config.DRAFT;
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Facture du mois en cours</h1>
        <p className="text-muted-foreground mt-2">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </p>
      </div>

      {billing ? (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Résumé du mois
                  </CardTitle>
                  <CardDescription>
                    Prestations réalisées en {monthNames[billing.month - 1]} {billing.year}
                  </CardDescription>
                </div>
                {getStatusBadge(billing.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{billing.totalServices}</div>
                  <p className="text-sm text-muted-foreground">Prestations</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {billing.totalRevenue.toFixed(2)}€
                  </div>
                  <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {billing.ecoDeliCommission.toFixed(2)}€
                  </div>
                  <p className="text-sm text-muted-foreground">Commission EcoDeli</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {billing.netAmount.toFixed(2)}€
                  </div>
                  <p className="text-sm text-muted-foreground">Montant net</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Détail des prestations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billing.services.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aucune prestation réalisée ce mois-ci</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {billing.services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{service.name}</h4>
                          <Badge variant="outline">{service.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Client: {service.clientName} • {new Date(service.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{service.price.toFixed(2)}€</div>
                        <div className="text-sm text-muted-foreground">
                          -{service.commission.toFixed(2)}€ = {service.netAmount.toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {billing.status === 'DRAFT' && billing.totalServices > 0 && (
                  <Button
                    onClick={generateInvoice}
                    disabled={generating}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {generating ? "Génération..." : "Générer la facture"}
                  </Button>
                )}
                
                {billing.invoiceUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(billing.invoiceUrl, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Télécharger la facture
                  </Button>
                )}
              </div>

              {billing.status === 'DRAFT' && billing.totalServices === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune prestation réalisée ce mois-ci. La facture sera générée automatiquement le 30 du mois.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune donnée de facturation
            </h3>
            <p className="text-gray-600">
              Les données de facturation apparaîtront dès que vous aurez réalisé des prestations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 