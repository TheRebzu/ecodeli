"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  DollarSign,
  Users,
  FileText,
  Play,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface BillingStats {
  period: string;
  totalInvoices: number;
  totalAmount: number;
  activeProviders: number;
  pendingInvoices: number;
  generatedInvoices: number;
}

interface BillingResult {
  providerId: string;
  email: string;
  amount?: number;
  invoiceNumber?: string;
  success: boolean;
  error?: string;
}

export function ProviderBillingDashboard() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [lastResults, setLastResults] = useState<BillingResult[]>([]);
  const { toast } = useToast();

  // Générer les options de mois et année
  const currentDate = new Date();
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: new Date(0, i).toLocaleDateString("fr-FR", { month: "long" }),
  }));

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentDate.getFullYear() - i).toString(),
    label: (currentDate.getFullYear() - i).toString(),
  }));

  useEffect(() => {
    // Initialiser avec le mois/année actuels
    setSelectedMonth(currentDate.getMonth() + 1 + "");
    setSelectedYear(currentDate.getFullYear() + "");

    loadStats();
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      loadStats(parseInt(selectedMonth), parseInt(selectedYear));
    }
  }, [selectedMonth, selectedYear]);

  const loadStats = async (month?: number, year?: number) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (month) params.append("month", month.toString());
      if (year) params.append("year", year.toString());

      const response = await fetch(`/api/cron/provider-billing?${params}`, {
        headers: {
          "X-Cron-Key": process.env.NEXT_PUBLIC_CRON_SECRET_KEY || "dev-key",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les statistiques",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading billing stats:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des statistiques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerBilling = async (targetMonth?: number, targetYear?: number) => {
    try {
      setProcessing(true);

      const params = new URLSearchParams();
      if (targetMonth) params.append("month", targetMonth.toString());
      if (targetYear) params.append("year", targetYear.toString());

      const response = await fetch(`/api/cron/provider-billing?${params}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || "dev-secret"}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        setLastResults(data.results || []);

        toast({
          title: "Facturation terminée",
          description: `${data.stats.successful} factures générées avec succès`,
        });

        // Recharger les statistiques
        loadStats(targetMonth, targetYear);
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.error || "Erreur lors de la facturation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error triggering billing:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du déclenchement de la facturation",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturation Prestataires</h1>
          <p className="text-gray-600">
            Gestion automatique des factures mensuelles
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() =>
              loadStats(parseInt(selectedMonth), parseInt(selectedYear))
            }
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prestataires actifs
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProviders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Factures générées
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.generatedInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                sur {stats.totalInvoices} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Montant total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalAmount.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="manual">Facturation manuelle</TabsTrigger>
          <TabsTrigger value="results">Derniers résultats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processus automatique</CardTitle>
              <CardDescription>
                La facturation automatique s'exécute le 30 de chaque mois à 23h
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Récupération des prestataires actifs</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Calcul des prestations du mois écoulé</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Génération des factures PDF</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Virements bancaires automatiques</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Notifications aux prestataires</span>
                </div>
              </div>

              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  La commission EcoDeli de 15% est automatiquement déduite du
                  montant brut. Les prestataires auto-entrepreneurs ne sont pas
                  soumis à la TVA.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Déclenchement manuel</CardTitle>
              <CardDescription>
                Lancer la facturation pour un mois spécifique (tests et
                rattrapages)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Attention : Cette action va générer les factures pour tous les
                  prestataires ayant des prestations terminées pour la période
                  sélectionnée.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Période cible :</label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedMonth}
                      onValueChange={setSelectedMonth}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedYear}
                      onValueChange={setSelectedYear}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() =>
                    triggerBilling(
                      parseInt(selectedMonth),
                      parseInt(selectedYear),
                    )
                  }
                  disabled={processing || !selectedMonth || !selectedYear}
                  className="mt-6"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Lancer la facturation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Résultats de la dernière exécution</CardTitle>
              <CardDescription>
                Détails des factures générées lors du dernier traitement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun résultat disponible. Lancez une facturation pour voir
                  les résultats.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">
                          Succès
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {lastResults.filter((r) => r.success).length}
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-900">Échecs</span>
                      </div>
                      <div className="text-2xl font-bold text-red-700">
                        {lastResults.filter((r) => !r.success).length}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Total</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {lastResults
                          .filter((r) => r.success && r.amount)
                          .reduce((sum, r) => sum + (r.amount || 0), 0)
                          .toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {lastResults.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          result.success
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium">{result.email}</span>
                          {result.invoiceNumber && (
                            <Badge variant="outline">
                              {result.invoiceNumber}
                            </Badge>
                          )}
                        </div>

                        <div className="text-right">
                          {result.success && result.amount ? (
                            <span className="font-medium text-green-700">
                              {result.amount.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-red-600">
                              {result.error || "Erreur inconnue"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
