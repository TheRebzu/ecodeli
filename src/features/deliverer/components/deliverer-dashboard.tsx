"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Euro,
  Clock,
  TrendingUp,
  MapPin,
  Calendar,
  FileText,
  Star,
} from "lucide-react";
import Link from "next/link";

interface DelivererDashboardProps {
  delivererId: string;
}

interface DashboardStats {
  totalDeliveries: number;
  completedDeliveries: number;
  activeDeliveries: number;
  pendingOpportunities: number;
  totalEarnings: number;
  weeklyEarnings: number;
  averageRating: number;
  documentsStatus: {
    validated: number;
    pending: number;
    rejected: number;
  };
}

interface RecentActivity {
  id: string;
  type: "delivery" | "opportunity" | "payment" | "document";
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  amount?: number;
}

export function DelivererDashboard({ delivererId }: DelivererDashboardProps) {
  const t = useTranslations("deliverer.dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/deliverer/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentActivities(data.recentActivities || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [delivererId]);

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "delivery":
        return <Package className="h-4 w-4" />;
      case "opportunity":
        return <MapPin className="h-4 w-4" />;
      case "payment":
        return <Euro className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "delivery":
        return "text-blue-600";
      case "opportunity":
        return "text-green-600";
      case "payment":
        return "text-purple-600";
      case "document":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        color: "bg-green-100 text-green-800",
        label: t("status.completed"),
      },
      active: { color: "bg-blue-100 text-blue-800", label: t("status.active") },
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("status.pending"),
      },
      validated: {
        color: "bg-green-100 text-green-800",
        label: t("status.validated"),
      },
      rejected: {
        color: "bg-red-100 text-red-800",
        label: t("status.rejected"),
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.total_deliveries")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedDeliveries} {t("stats.completed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.active_deliveries")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOpportunities} {t("stats.opportunities")}
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
            <p className="text-xs text-muted-foreground">
              +{stats.weeklyEarnings.toFixed(2)}€ {t("stats.this_week")}
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
            <Link href="/deliverer/opportunities">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <MapPin className="h-6 w-6 mb-2" />
                <span className="text-sm">
                  {t("quick_actions.opportunities")}
                </span>
              </Button>
            </Link>

            <Link href="/deliverer/deliveries">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Package className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.deliveries")}</span>
              </Button>
            </Link>

            <Link href="/deliverer/wallet">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Euro className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.wallet")}</span>
              </Button>
            </Link>

            <Link href="/deliverer/documents">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.documents")}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("documents.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {t("documents.validated")}
                </span>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800">
                    {stats.documentsStatus.validated}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {t("documents.pending")}
                </span>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats.documentsStatus.pending}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {t("documents.rejected")}
                </span>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-red-100 text-red-800">
                    {stats.documentsStatus.rejected}
                  </Badge>
                </div>
              </div>

              {stats.documentsStatus.pending > 0 && (
                <Link href="/deliverer/documents">
                  <Button size="sm" className="w-full mt-4">
                    {t("documents.manage")}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recent_activities.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t("recent_activities.no_activities")}
                </p>
              ) : (
                recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div
                      className={`p-1 rounded-full ${getActivityColor(activity.type)}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.subtitle}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {getStatusBadge(activity.status)}
                          {activity.amount && (
                            <span className="text-xs font-medium text-green-600">
                              +{activity.amount.toFixed(2)}€
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {recentActivities.length > 5 && (
                <div className="text-center">
                  <Button variant="ghost" size="sm">
                    {t("recent_activities.view_all")}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
