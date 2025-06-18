"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/socket-provider";
import { useProviderDashboard } from "@/hooks/provider/use-provider-dashboard";
import { api } from "@/trpc/react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar} from "recharts";

// Icons
import {
  Calendar,
  Clock,
  Euro,
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Plus,
  Settings,
  BarChart3,
  Award,
  FileText,
  Eye,
  Phone,
  MapPin,
  Wrench,
  Briefcase,
  Sparkles,
  Activity,
  Timer,
  Target,
  Home,
  ChevronRight,
  AlertCircle} from "lucide-react";

// Types
interface ProviderStats {
  monthlyRevenue: number;
  dailyRevenue: number;
  appointmentsToday: number;
  appointmentsWeek: number;
  completedMonth: number;
  averageRating: number;
  clientsServed: number;
  activeContracts: number;
  certificationsCount: number;
  skillsCount: number;
}

interface Appointment {
  id: string;
  scheduledDate: string;
  client: {
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
  service: {
    name: string;
    description: string;
    category: string;
  };
  duration: number;
  price: number;
  status: string;
}

interface Intervention {
  id: string;
  completedAt: string;
  client: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  service: {
    name: string;
    category: string;
  };
  price: number;
  rating?: number;
}

interface Rating {
  id: string;
  rating: number;
  review: string;
  completedAt: string;
  client: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  service: {
    name: string;
  };
}

type ProviderDashboardProps = {
  locale: string;
};

// Utilitaire pour les classes CSS
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Composant de carte de statistique
const StatCard = ({
  title,
  value,
  icon,
  trend,
  isLoading = false,
  onClick,
  color = "text-primary",
  bgColor = "bg-primary/10"}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  onClick?: () => void;
  color?: string;
  bgColor?: string;
}) => {
  if (isLoading) {
    return (
      <Card
        className={
          onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
        }
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={cn("p-3 rounded-full", bgColor)}>
                <div className="h-5 w-5 bg-gray-300 animate-pulse rounded" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            {trend && <Skeleton className="h-4 w-12" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={cn("p-3 rounded-full", bgColor)}>
              <div className={color}>{icon}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
          </div>
          {trend && (
            <div className="text-right">
              <p
                className={`text-xs flex items-center gap-1 ${
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.value >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </p>
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Composant de rendez-vous
const AppointmentCard = ({
  appointment,
  onView}: {
  appointment: Appointment;
  onView: (id: string) => void;
}) => {
  const isToday =
    new Date(appointment.scheduledDate).toDateString() ===
    new Date().toDateString();
  const isTomorrow =
    new Date(appointment.scheduledDate).toDateString() ===
    new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CONFIRMED: "Confirmé", IN_PROGRESS: "En cours",
      COMPLETED: "Terminé",
      CANCELLED: "Annulé"};
    return labels[status] || status;
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onView(appointment.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">
              {appointment.client.profile.firstName}{" "}
              {appointment.client.profile.lastName}
            </h4>
            <p className="text-xs text-muted-foreground">
              {appointment.service.name}
            </p>
            <Badge
              className={cn("text-xs mt-1", getStatusColor(appointment.status))}
            >
              {getStatusLabel(appointment.status)}
            </Badge>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{appointment.price}€</p>
            <p className="text-xs text-muted-foreground">
              {appointment.duration}min
            </p>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(appointment.scheduledDate).toLocaleDateString()}
            </span>
            {isToday && (
              <span className="text-blue-600 font-medium">Aujourd'hui</span>
            )}
            {isTomorrow && (
              <span className="text-orange-600 font-medium">Demain</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>
              {new Date(appointment.scheduledDate).toLocaleTimeString()}
            </span>
          </div>
          {appointment.client.profile.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span>{appointment.client.profile.phone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Composant d'intervention récente
const InterventionCard = ({ intervention }: { intervention }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm">
              {intervention.client.profile.firstName}{" "}
              {intervention.client.profile.lastName}
            </h4>
            <p className="text-xs text-muted-foreground">
              {intervention.service.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {intervention.service.category}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{intervention.price}€</p>
            {intervention.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">
                  {intervention.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>
              {new Date(intervention.completedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant d'évaluation
const RatingCard = ({ rating }: { rating }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{rating.rating.toFixed(1)}</span>
            </div>
            <h4 className="font-medium text-sm">
              {rating.client.profile.firstName} {rating.client.profile.lastName}
            </h4>
            <p className="text-xs text-muted-foreground">
              {rating.service.name}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(rating.completedAt).toLocaleDateString()}
          </div>
        </div>

        <p className="text-sm text-muted-foreground italic">
          "{rating.review}"
        </p>
      </CardContent>
    </Card>
  );
};

// Actions rapides
const QuickActionsSection = () => {
  const router = useRouter();

  const quickActions = [
    {
      icon: <Plus className="h-5 w-5" />,
      label: "Nouveau service",
      description: "Créer un nouveau service",
      action: () => router.push("/provider/services/create"),
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50"},
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Planning",
      description: "Gérer mon planning",
      action: () => router.push("/provider/schedule"),
      color: "text-green-600 bg-green-100 dark:bg-green-900/50"},
    {
      icon: <Award className="h-5 w-5" />,
      label: "Compétences",
      description: "Gérer mes compétences",
      action: () => router.push("/provider/skills"),
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/50"},
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Statistiques",
      description: "Voir mes performances",
      action: () => router.push("/provider/stats"),
      color: "text-orange-600 bg-orange-100 dark:bg-orange-900/50"}];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex-col p-4 space-y-2"
              onClick={action.action}
            >
              <div className={cn("p-2 rounded-lg", action.color)}>
                {action.icon}
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ProviderDashboard({ locale }: ProviderDashboardProps) {
  const router = useRouter();
  const { socket } = useSocket();
  const [realtimeStats, setRealtimeStats] =
    useState<Partial<ProviderStats> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {
    stats,
    upcomingAppointments,
    recentInterventions,
    revenueChart,
    recentRatings,
    isLoading,
    isLoadingStats,
    isLoadingAppointments,
    refetchStats} = useProviderDashboard();

  // Socket.io pour les mises à jour temps réel
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    // Écouter les nouvelles réservations
    socket.on("provider:new:booking", (booking) => {
      refetchStats();
      // Notification de nouveau RDV
    });

    // Écouter les mises à jour de stats
    socket.on("provider:stats:update", (data) => {
      setRealtimeStats(data);
    });

    // Écouter les nouvelles évaluations
    socket.on("provider:new:rating", (rating) => {
      // Notification de nouvelle évaluation
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("provider:new:booking");
      socket.off("provider:stats:update");
      socket.off("provider:new:rating");
    };
  }, [socket, refetchStats]);

  const handleViewAppointment = (appointmentId: string) => {
    router.push(`/provider/appointments/${appointmentId}`);
  };

  const currentStats = realtimeStats || stats;

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenus mensuel"
          value={`${currentStats?.monthlyRevenue || 0}€`}
          icon={<Euro className="h-5 w-5" />}
          trend={{ value: 15, label: "vs mois dernier" }}
          isLoading={isLoadingStats}
          onClick={() => router.push("/provider/stats/monthly-report")}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/50"
        />

        <StatCard
          title="RDV aujourd'hui"
          value={currentStats?.appointmentsToday || 0}
          icon={<Calendar className="h-5 w-5" />}
          isLoading={isLoadingStats}
          onClick={() => router.push("/provider/schedule")}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/50"
        />

        <StatCard
          title="Note moyenne"
          value={`${currentStats?.averageRating?.toFixed(1) || 0}/5`}
          icon={<Star className="h-5 w-5" />}
          isLoading={isLoadingStats}
          onClick={() => router.push("/provider/ratings")}
          color="text-yellow-600"
          bgColor="bg-yellow-100 dark:bg-yellow-900/50"
        />

        <StatCard
          title="Clients servis"
          value={currentStats?.clientsServed || 0}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 8, label: "ce mois" }}
          isLoading={isLoadingStats}
          color="text-purple-600"
          bgColor="bg-purple-100 dark:bg-purple-900/50"
        />
      </div>

      {/* Actions rapides */}
      <QuickActionsSection />

      {/* Contenu principal avec onglets */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Prochains rendez-vous */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Prochains rendez-vous</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push("/provider/appointments")}
                    >
                      Voir tout
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {isLoadingAppointments ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : upcomingAppointments &&
                      upcomingAppointments.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingAppointments.map((appointment) => (
                          <AppointmentCard
                            key={appointment.id}
                            appointment={appointment as Appointment}
                            onView={handleViewAppointment}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
                        <p className="text-muted-foreground">
                          Aucun rendez-vous à venir
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar avec métriques */}
            <div className="space-y-4">
              {/* Performance du mois */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance du mois
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Interventions
                    </span>
                    <span className="font-medium">
                      {currentStats?.completedMonth || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Revenus jour
                    </span>
                    <span className="font-medium">
                      {currentStats?.dailyRevenue || 0}€
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Contrats actifs
                    </span>
                    <span className="font-medium">
                      {currentStats?.activeContracts || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Compétences
                    </span>
                    <span className="font-medium">
                      {currentStats?.skillsCount || 0}
                    </span>
                  </div>

                  {/* Graphique de performance */}
                  {revenueChart && revenueChart.length > 0 && (
                    <div className="mt-4 h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueChart}>
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Tooltip />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Statut de vérification */}
              <Card>
                <CardHeader>
                  <CardTitle>Statut professionnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">
                      Prestataire vérifié
                    </h3>
                    <p className="text-center text-sm text-muted-foreground mb-3">
                      Votre profil est entièrement vérifié
                    </p>
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Certifications</span>
                        <span className="font-medium">
                          {currentStats?.certificationsCount || 0}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          router.push("/provider/skills/certifications")
                        }
                      >
                        Gérer les certifications
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoadingAppointments ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </>
            ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment as Appointment}
                  onView={handleViewAppointment}
                />
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground opacity-25 mb-2" />
                  <p className="text-muted-foreground mb-4">
                    Aucun rendez-vous planifié
                  </p>
                  <Button onClick={() => router.push("/provider/schedule")}>
                    Gérer mon planning
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentInterventions && recentInterventions.length > 0 ? (
              recentInterventions.map((intervention) => (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention as Intervention}
                />
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground opacity-25 mb-2" />
                  <p className="text-muted-foreground">
                    Aucune intervention récente
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Graphique des revenus */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution des revenus</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueChart && revenueChart.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Données non disponibles
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Évaluations récentes */}
            <Card>
              <CardHeader>
                <CardTitle>Évaluations récentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {recentRatings && recentRatings.length > 0 ? (
                    <div className="space-y-3">
                      {recentRatings.map((rating) => (
                        <RatingCard key={rating.id} rating={rating as Rating} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
                      <p className="text-muted-foreground">
                        Aucune évaluation récente
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Indicateur de connexion temps réel */}
      {isConnected && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-3 py-1.5 rounded-full text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Temps réel actif
        </div>
      )}
    </div>
  );
}
