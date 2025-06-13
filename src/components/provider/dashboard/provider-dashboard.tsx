"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/system/use-socket";
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
} from "recharts";

// Icons
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  Package,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Star,
  MapPin,
  Phone,
  AlertTriangle,
  Settings,
  Eye,
  Plus,
  FileText,
  Euro,
  Home,
  Zap,
  Sparkles,
  BarChart3,
  Activity,
  Target,
  Bell,
  MessageSquare,
} from "lucide-react";

// Types
interface ProviderStats {
  weekAppointments: number;
  monthlyRevenue: number;
  clientsServed: number;
  averageRating: number;
  completionRate: number;
  nextWeekBookings: number;
  pendingInterventions: number;
  unreadMessages: number;
}

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  serviceDescription: string;
  scheduledDate: string;
  duration: number;
  price: number;
  address: string;
  status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  isUrgent: boolean;
  notes?: string;
}

interface RecentEvaluation {
  id: string;
  clientName: string;
  serviceName: string;
  rating: number;
  comment?: string;
  createdAt: string;
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
  bgColor = "bg-primary/10",
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  onClick?: () => void;
  color?: string;
  bgColor?: string;
  subtitle?: string;
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
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
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
  onView,
}: {
  appointment: Appointment;
  onView: (id: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
      case "CONFIRMED":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200";
      case "COMPLETED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SCHEDULED: "Planifié",
      CONFIRMED: "Confirmé",
      IN_PROGRESS: "En cours",
      COMPLETED: "Terminé",
      CANCELLED: "Annulé",
    };
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
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{appointment.clientName}</h4>
              {appointment.isUrgent && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {appointment.serviceName}
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
            <Clock className="h-3 w-3" />
            <span>{new Date(appointment.scheduledDate).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{appointment.address}</span>
          </div>
          {appointment.notes && (
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              <span className="truncate">{appointment.notes}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Composant d'évaluation récente
const EvaluationCard = ({ evaluation }: { evaluation: RecentEvaluation }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium text-sm">{evaluation.clientName}</h4>
            <p className="text-xs text-muted-foreground">
              {evaluation.serviceName}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3 w-3",
                  i < evaluation.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300",
                )}
              />
            ))}
          </div>
        </div>

        {evaluation.comment && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            "{evaluation.comment}"
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          {new Date(evaluation.createdAt).toLocaleDateString()}
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
      icon: <Calendar className="h-5 w-5" />,
      label: "Planning",
      description: "Gérer les créneaux",
      action: () => router.push("/provider/schedule"),
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50",
    },
    {
      icon: <Plus className="h-5 w-5" />,
      label: "Nouveau service",
      description: "Ajouter une prestation",
      action: () => router.push("/provider/services/create"),
      color: "text-green-600 bg-green-100 dark:bg-green-900/50",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Statistiques",
      description: "Voir les performances",
      action: () => router.push("/provider/stats"),
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/50",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: "Factures",
      description: "Gestion facturation",
      action: () => router.push("/provider/invoices"),
      color: "text-orange-600 bg-orange-100 dark:bg-orange-900/50",
    },
  ];

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

  // Récupérer les données du dashboard
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.provider.getDashboardStats.useQuery();

  const { data: upcomingAppointments, isLoading: isLoadingAppointments } =
    api.provider.getUpcomingAppointments.useQuery({ limit: 5 });

  const { data: recentEvaluations } =
    api.provider.getRecentEvaluations.useQuery({ limit: 3 });

  const { data: performanceChart } = api.provider.getPerformanceChart.useQuery({
    period: "month",
  });

  // Socket.io pour les mises à jour temps réel
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    // Écouter les nouveaux rendez-vous
    socket.on("provider:new:appointment", (appointment) => {
      refetchStats();
      // Afficher notification
    });

    // Écouter les mises à jour de stats
    socket.on("provider:stats:update", (data) => {
      setRealtimeStats(data);
    });

    // Écouter les évaluations
    socket.on("provider:new:evaluation", (evaluation) => {
      // Afficher notification d'évaluation
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("provider:new:appointment");
      socket.off("provider:stats:update");
      socket.off("provider:new:evaluation");
    };
  }, [socket, refetchStats]);

  const handleViewAppointment = (appointmentId: string) => {
    router.push(`/provider/appointments/${appointmentId}`);
  };

  const currentStats = realtimeStats ||
    stats || {
      weekAppointments: 0,
      monthlyRevenue: 0,
      clientsServed: 0,
      averageRating: 0,
      completionRate: 0,
      nextWeekBookings: 0,
      pendingInterventions: 0,
      unreadMessages: 0,
    };
  const isLoading = isLoadingStats || isLoadingAppointments;

  return (
    <div className="space-y-6">
      {/* Notifications importantes */}
      {currentStats.pendingInterventions > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Interventions en attente</AlertTitle>
          <AlertDescription>
            {currentStats.pendingInterventions} intervention(s) nécessitent
            votre attention.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => router.push("/provider/appointments")}
            >
              Voir les détails
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Planning semaine"
          value={currentStats.weekAppointments}
          subtitle="rendez-vous planifiés"
          icon={<Calendar className="h-5 w-5" />}
          isLoading={isLoading}
          onClick={() => router.push("/provider/schedule")}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/50"
        />

        <StatCard
          title="Revenus mois"
          value={`${currentStats.monthlyRevenue}€`}
          subtitle="facturation en cours"
          icon={<Euro className="h-5 w-5" />}
          trend={{ value: 15, label: "vs mois dernier" }}
          isLoading={isLoading}
          onClick={() => router.push("/provider/billing")}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/50"
        />

        <StatCard
          title="Note moyenne"
          value={`${currentStats.averageRating}/5`}
          subtitle="évaluations clients"
          icon={<Star className="h-5 w-5" />}
          isLoading={isLoading}
          onClick={() => router.push("/provider/ratings")}
          color="text-yellow-600"
          bgColor="bg-yellow-100 dark:bg-yellow-900/50"
        />

        <StatCard
          title="Taux réussite"
          value={`${currentStats.completionRate}%`}
          subtitle="interventions réussies"
          icon={<Target className="h-5 w-5" />}
          isLoading={isLoading}
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
          <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Prochains rendez-vous */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Prochaines interventions</span>
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
                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-32 w-full" />
                        ))}
                      </div>
                    ) : upcomingAppointments &&
                      upcomingAppointments.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingAppointments.map((appointment) => (
                          <AppointmentCard
                            key={appointment.id}
                            appointment={appointment}
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
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => router.push("/provider/schedule")}
                        >
                          Gérer le planning
                        </Button>
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
                    <Activity className="h-5 w-5" />
                    Performance du mois
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Clients servis
                    </span>
                    <span className="font-medium">
                      {currentStats.clientsServed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Taux de réussite
                    </span>
                    <span className="font-medium">
                      {currentStats.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Note moyenne
                    </span>
                    <span className="font-medium flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {currentStats.averageRating}/5
                    </span>
                  </div>

                  <Progress
                    value={currentStats.completionRate}
                    className="mt-4"
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Excellent taux de satisfaction client
                  </p>
                </CardContent>
              </Card>

              {/* Messages et notifications */}
              {currentStats.unreadMessages > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Messages
                      </span>
                      <Badge variant="destructive">
                        {currentStats.unreadMessages}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vous avez {currentStats.unreadMessages} message(s) non
                      lu(s)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push("/provider/messages")}
                    >
                      Voir les messages
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Statut de vérification */}
              <Card>
                <CardHeader>
                  <CardTitle>Statut de vérification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Compte vérifié</h3>
                    <p className="text-center text-sm text-muted-foreground">
                      Votre compte est entièrement opérationnel
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments?.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onView={handleViewAppointment}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentEvaluations?.map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Graphique de performance */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution des revenus</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceChart && performanceChart.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                      </LineChart>
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

            {/* Métriques détaillées */}
            <Card>
              <CardHeader>
                <CardTitle>Indicateurs clés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {currentStats.clientsServed}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Clients servis
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {currentStats.completionRate}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Taux réussite
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {currentStats.averageRating}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Note moyenne
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {currentStats.nextWeekBookings}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Semaine prochaine
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => router.push("/provider/stats")}
                >
                  Voir le rapport complet
                </Button>
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
