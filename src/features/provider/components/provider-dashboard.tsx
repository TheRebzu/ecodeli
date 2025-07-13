"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Euro,
  Clock,
  Star,
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ProviderDashboardProps {
  providerId: string;
}

interface DashboardStats {
  totalInterventions: number;
  completedInterventions: number;
  activeInterventions: number;
  totalEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  validationStatus: string;
  documentsStatus: {
    validated: number;
    pending: number;
    rejected: number;
  };
}

interface RecentIntervention {
  id: string;
  clientName: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  status: string;
  price: number;
  rating?: number;
  review?: string;
  createdAt: string;
}

export function ProviderDashboard({ providerId }: ProviderDashboardProps) {
  const t = useTranslations("provider.dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInterventions, setRecentInterventions] = useState<
    RecentIntervention[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/provider/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentInterventions(data.recentInterventions || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [providerId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("status.pending"),
      },
      confirmed: {
        color: "bg-blue-100 text-blue-800",
        label: t("status.confirmed"),
      },
      in_progress: {
        color: "bg-purple-100 text-purple-800",
        label: t("status.in_progress"),
      },
      completed: {
        color: "bg-green-100 text-green-800",
        label: t("status.completed"),
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        label: t("status.cancelled"),
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getValidationStatusBadge = (status: string) => {
    switch (status) {
      case "validated":
        return (
          <Badge className="bg-green-100 text-green-800">
            {t("validation.validated")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            {t("validation.pending")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            {t("validation.rejected")}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            {t("validation.unknown")}
          </Badge>
        );
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
      {/* Validation Status Alert */}
      {stats.validationStatus !== "validated" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">
                  {t("validation.status_alert_title")}
                </h3>
                <p className="text-sm text-yellow-700">
                  {t("validation.status_alert_description")}
                </p>
              </div>
              <Link href="/provider/validation">
                <Button variant="outline" size="sm">
                  {t("validation.complete_validation")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.total_interventions")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInterventions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedInterventions} {t("stats.completed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.active_interventions")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeInterventions}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.this_week")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.total_earnings")}
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalEarnings.toFixed(2)}€
            </div>
            <p className="text-xs text-green-600">
              +{stats.monthlyEarnings.toFixed(2)}€ {t("stats.this_month")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.rating")}
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.average_rating")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quick_actions.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/provider/calendar">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.calendar")}</span>
              </Button>
            </Link>

            <Link href="/provider/documents">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.documents")}</span>
              </Button>
            </Link>

            <Link href="/provider/validation">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <CheckCircle className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.validation")}</span>
              </Button>
            </Link>

            <Link href="/provider/billing">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Euro className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.billing")}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Validation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>{t("validation.title")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {t("validation.status")}
                </span>
                {getValidationStatusBadge(stats.validationStatus)}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("documents.validated")}
                  </span>
                  <Badge className="bg-green-100 text-green-800">
                    {stats.documentsStatus.validated}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("documents.pending")}
                  </span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats.documentsStatus.pending}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("documents.rejected")}
                  </span>
                  <Badge className="bg-red-100 text-red-800">
                    {stats.documentsStatus.rejected}
                  </Badge>
                </div>
              </div>

              {stats.documentsStatus.pending > 0 && (
                <Link href="/provider/documents">
                  <Button size="sm" className="w-full mt-4">
                    {t("documents.manage")}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Interventions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recent_interventions.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInterventions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t("recent_interventions.no_interventions")}
                </p>
              ) : (
                recentInterventions.slice(0, 5).map((intervention) => (
                  <div
                    key={intervention.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {intervention.serviceType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {intervention.clientName}
                          </p>
                        </div>
                        {getStatusBadge(intervention.status)}
                      </div>

                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(
                              intervention.scheduledDate,
                            ).toLocaleDateString()}{" "}
                            {intervention.scheduledTime}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{intervention.address}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-semibold text-green-600">
                          {intervention.price.toFixed(2)}€
                        </span>
                        {intervention.rating && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-400" />
                            <span className="text-xs">
                              {intervention.rating}/5
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {recentInterventions.length > 5 && (
                <div className="text-center">
                  <Link href="/provider/interventions">
                    <Button variant="ghost" size="sm">
                      {t("recent_interventions.view_all")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
