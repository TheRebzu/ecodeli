"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  Users,
  AlertCircle,
  MapPin,
  FileText,
  Wallet,
  Award,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ProviderStats {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  totalReviews: number;
  validationStatus: string;
  nextPayout: string;
  availableBalance: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
}

interface UpcomingIntervention {
  id: string;
  serviceName: string;
  clientName: string;
  scheduledAt: string;
  location: string;
  price: number;
  status: string;
}

export function ProviderDashboardComplete() {
  const { user } = useAuth();
  const { execute } = useApi();
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [upcomingInterventions, setUpcomingInterventions] = useState<
    UpcomingIntervention[]
  >([]);
  const [loading, setLoading] = useState(true);

  const get = async (url: string) => {
    return await execute(url, { method: "GET" });
  };

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [statsResponse, activitiesResponse, interventionsResponse] =
        await Promise.all([
          get(`/api/provider/dashboard/stats?providerId=${user.id}`),
          get(`/api/provider/dashboard/activities?providerId=${user.id}`),
          get(`/api/provider/interventions/upcoming?providerId=${user.id}`),
        ]);

      if (statsResponse) {
        setStats(statsResponse);
      }
      if (activitiesResponse) {
        setRecentActivities(activitiesResponse.activities || []);
      }
      if (interventionsResponse) {
        setUpcomingInterventions(interventionsResponse.interventions || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const getValidationStatusBadge = (status: string) => {
    const config = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: "En attente" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "Validé" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "Rejeté" },
    };

    const statusConfig =
      config[status as keyof typeof config] || config.PENDING;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      service_completed: CheckCircle,
      booking_received: Calendar,
      payment_received: DollarSign,
      review_received: Star,
      validation_update: AlertCircle,
    };
    const Icon = icons[type as keyof typeof icons] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre espace prestataire EcoDeli
          </p>
        </div>
        {stats && getValidationStatusBadge(stats.validationStatus)}
      </div>

      {/* Validation Alert */}
      {stats && stats.validationStatus !== "APPROVED" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Validation requise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-4">
              Votre profil prestataire nécessite une validation avant de pouvoir
              recevoir des réservations.
            </p>
            <Link href="/provider/validation">
              <Button>Compléter ma candidature</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Services réalisés
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedServices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingServices || 0} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains du mois</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.monthlyEarnings.toFixed(2) || "0.00"}€
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {stats?.totalEarnings.toFixed(2) || "0.00"}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageRating.toFixed(1) || "0.0"}/5
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalReviews || 0} évaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solde disponible
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.availableBalance.toFixed(2) || "0.00"}€
            </div>
            <p className="text-xs text-muted-foreground">
              Prochain virement:{" "}
              {stats?.nextPayout
                ? new Date(stats.nextPayout).toLocaleDateString()
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="activities">Activités récentes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance ce mois</CardTitle>
                <CardDescription>
                  Evolution de vos services et gains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Services complétés
                    </span>
                    <span className="text-sm">
                      {stats?.completedServices || 0}/
                      {stats?.totalServices || 0}
                    </span>
                  </div>
                  <Progress
                    value={
                      stats?.totalServices
                        ? (stats.completedServices / stats.totalServices) * 100
                        : 0
                    }
                    className="h-2"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Objectif mensuel
                    </span>
                    <span className="text-sm">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
                <CardDescription>
                  Accès direct aux fonctionnalités principales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/provider/calendar">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col py-4"
                    >
                      <Calendar className="h-6 w-6 mb-2" />
                      <span className="text-sm">Calendrier</span>
                    </Button>
                  </Link>

                  <Link href="/provider/interventions">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col py-4"
                    >
                      <MapPin className="h-6 w-6 mb-2" />
                      <span className="text-sm">Interventions</span>
                    </Button>
                  </Link>

                  <Link href="/provider/evaluations">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col py-4"
                    >
                      <Star className="h-6 w-6 mb-2" />
                      <span className="text-sm">Évaluations</span>
                    </Button>
                  </Link>

                  <Link href="/provider/earnings">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col py-4"
                    >
                      <DollarSign className="h-6 w-6 mb-2" />
                      <span className="text-sm">Gains</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prochaines interventions</CardTitle>
              <CardDescription>Vos prestations à venir</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingInterventions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Aucune intervention prévue
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingInterventions.map((intervention) => (
                    <div
                      key={intervention.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {intervention.serviceName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Client: {intervention.clientName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(intervention.scheduledAt).toLocaleString()}{" "}
                          • {intervention.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {intervention.price.toFixed(2)}€
                        </div>
                        <Badge variant="outline">{intervention.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activités récentes</CardTitle>
              <CardDescription>
                Historique de vos dernières actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Aucune activité récente
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{activity.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
