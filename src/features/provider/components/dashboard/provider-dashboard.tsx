"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calendar,
  Star,
  Euro,
  Clock,
  FileText,
  CheckCircle,
  Users,
  AlertCircle,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export function ProviderDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Récupérer le profil provider complet
      const providerRes = await fetch(
        `/api/provider/profile?userId=${user?.id}`,
      );
      const providerData = await providerRes.json();

      if (!providerData.provider) {
        // Si pas de profil provider, rediriger vers validation
        router.push("/provider/validation");
        return;
      }

      // Récupérer les statistiques d'évaluations
      const statsRes = await fetch(
        `/api/provider/evaluations/stats?providerId=${providerData.provider.id}`,
      );
      const statsData = await statsRes.json();
      setStats(statsData);

      // Récupérer les évaluations récentes
      const evalRes = await fetch(
        `/api/provider/evaluations?providerId=${providerData.provider.id}&limit=3`,
      );
      const evalData = await evalRes.json();
      setEvaluations(evalData.evaluations || []);

      // Récupérer les réservations à venir
      const bookingsRes = await fetch(
        `/api/provider/bookings/upcoming?providerId=${providerData.provider.id}`,
      );
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.bookings || []);

      // Récupérer la dernière facture mensuelle
      const invoiceRes = await fetch(
        `/api/provider/billing/invoices?providerId=${providerData.provider.id}&limit=1`,
      );
      const invoiceData = await invoiceRes.json();
      setLastInvoice(invoiceData.invoices?.[0] || null);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Espace Prestataire</h1>
          <p className="text-muted-foreground">Chargement en cours...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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

  // Si l'utilisateur n'est pas validé
  if (!stats || stats.provider?.validationStatus !== "VALIDATED") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Espace Prestataire</h1>
          <p className="text-muted-foreground">
            Gérez vos prestations et suivez vos gains
          </p>
        </div>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Validation requise</AlertTitle>
          <AlertDescription className="text-amber-800">
            Votre profil doit être validé par EcoDeli avant de pouvoir recevoir
            des demandes de prestations.
            <Button
              className="mt-3"
              onClick={() => router.push("/provider/validation")}
            >
              Compléter ma candidature
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Espace Prestataire</h1>
        <p className="text-muted-foreground">
          Gérez vos prestations, évaluations et calendrier
        </p>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Note moyenne
                </p>
                <p className="text-2xl font-bold">
                  {stats?.averageRating?.toFixed(1) || "0"}/5
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Interventions total
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalEvaluations || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Gains ce mois
                </p>
                <p className="text-2xl font-bold">
                  {stats?.monthlyAverage?.toFixed(0) || 0}€
                </p>
              </div>
              <Euro className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tendance
                </p>
                <p className="text-2xl font-bold capitalize">
                  {stats?.trend || "stable"}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Validation du prestataire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Profil validé</h4>
            <p className="text-green-800 text-sm">
              Votre profil a été vérifié par EcoDeli. Vous pouvez recevoir des
              demandes de clients.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/provider/calendar")}
              >
                Gérer mes disponibilités
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/provider/validation/services")}
              >
                Gérer mes services
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Évaluations récentes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Évaluations récentes</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/provider/evaluations")}
            >
              Voir toutes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune évaluation pour le moment
            </p>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <div key={evaluation.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{evaluation.clientName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {evaluation.serviceName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < evaluation.rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-medium">
                        {evaluation.rating}/5
                      </span>
                    </div>
                  </div>
                  {evaluation.comment && (
                    <p className="text-sm text-gray-600 mb-2">
                      {evaluation.comment}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(evaluation.createdAt), "dd MMMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prochaines interventions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Prochaines interventions
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/provider/bookings")}
            >
              Gérer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune intervention programmée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {format(new Date(booking.scheduledAt), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.scheduledAt), "HH:mm")}
                    </TableCell>
                    <TableCell>{booking.clientName}</TableCell>
                    <TableCell>{booking.serviceName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.status === "CONFIRMED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Facturation automatique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Facturation automatique mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastInvoice ? (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-3">Dernière facture</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Période:</span>
                      <span className="font-medium">
                        {format(
                          new Date(lastInvoice.periodStart),
                          "MMMM yyyy",
                          { locale: fr },
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Montant:</span>
                      <span className="font-medium text-green-600">
                        {lastInvoice.totalAmount}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statut:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {lastInvoice.status === "PAID" ? "Payée" : "Générée"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/provider/billing/monthly")}
                  >
                    Voir le détail
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/provider/billing/archives")}
                  >
                    Historique des factures
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucune facture générée pour le moment. La facturation est
                automatique le 30 de chaque mois à 23h.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => router.push("/provider/calendar")}>
              <Calendar className="w-4 h-4 mr-2" />
              Gérer mes disponibilités
            </Button>
            <Button
              onClick={() => router.push("/provider/earnings")}
              variant="outline"
            >
              <Euro className="w-4 h-4 mr-2" />
              Voir mes gains
            </Button>
            <Button
              onClick={() => router.push("/provider/documents")}
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              Mes documents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
