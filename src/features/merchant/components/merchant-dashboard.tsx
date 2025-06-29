"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Store, 
  Package, 
  ShoppingCart, 
  Euro, 
  Plus, 
  AlertCircle, 
  TrendingUp, 
  Bell, 
  Calendar, 
  MapPin, 
  Clock, 
  CreditCard,
  FileText,
  Users,
  Target
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";

interface MerchantDashboardProps {
  merchantId: string;
}

interface DashboardStats {
  activeAnnouncements: number;
  totalAnnouncements: number;
  monthlyDeliveries: number;
  pendingDeliveries: number;
  monthlyRevenue: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
}

interface RecentAnnouncement {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  finalPrice: number;
  isUrgent: boolean;
  pickupAddress: string;
  deliveryAddress: string;
  createdAt: string;
  hasDeliverer: boolean;
}

export function MerchantDashboard({ merchantId }: MerchantDashboardProps) {
  const t = useTranslations("merchant.dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<RecentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/merchant/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentAnnouncements(data.recentAnnouncements || []);
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
  }, [merchantId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", label: t("status.active") },
      draft: { color: "bg-gray-100 text-gray-800", label: t("status.draft") },
      completed: { color: "bg-blue-100 text-blue-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") },
    };
    
    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig];
    if (!config) return null;
    
    return <Badge className={config.color}>{config.label}</Badge>;
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.active_announcements")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAnnouncements}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAnnouncements} {t("stats.total")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.monthly_deliveries")}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingDeliveries} {t("stats.pending")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.monthly_revenue")}
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyRevenue.toFixed(2)}€</div>
            <p className="text-xs text-green-600">
              {stats.totalRevenue.toFixed(2)}€ {t("stats.total")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.conversion_rate")}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.average_order")}: {stats.averageOrderValue.toFixed(2)}€
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quick_actions.title")}</CardTitle>
          <CardDescription>
            {t("quick_actions.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/merchant/announcements">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <Package className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.announcements")}</span>
              </Button>
            </Link>
            
            <Link href="/merchant/contracts">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.contracts")}</span>
              </Button>
            </Link>
            
            <Link href="/merchant/billing">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <CreditCard className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.billing")}</span>
              </Button>
            </Link>
            
            <Link href="/merchant/analytics">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <TrendingUp className="h-6 w-6 mb-2" />
                <span className="text-sm">{t("quick_actions.analytics")}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Announcements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("recent_announcements.title")}</CardTitle>
            <CardDescription>
              {t("recent_announcements.description")}
            </CardDescription>
          </div>
          <Link href="/merchant/announcements">
            <Button variant="outline" size="sm">
              {t("recent_announcements.view_all")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("no_announcements.title")}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t("no_announcements.description")}
                </p>
                <Link href="/merchant/announcements/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("no_announcements.create_first")}
                  </Button>
                </Link>
              </div>
            ) : (
              recentAnnouncements.map((announcement) => (
                <Card key={announcement.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(announcement.status)}
                          {announcement.isUrgent && (
                            <Badge className="bg-red-100 text-red-800">
                              {t("status.urgent")}
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-lg mb-1">{announcement.title}</h4>
                        <p className="text-gray-600 text-sm mb-2">{announcement.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {announcement.pickupAddress}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {announcement.finalPrice.toFixed(2)}€
                        </div>
                        
                        {announcement.hasDeliverer && (
                          <div className="text-xs text-green-600">
                            ✅ {t("status.deliverer_assigned")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Link href={`/merchant/announcements/${announcement.id}`}>
                        <Button variant="outline" size="sm">
                          {t("actions.view_details")}
                        </Button>
                      </Link>
                      
                      {announcement.status === "active" && !announcement.hasDeliverer && (
                        <Link href={`/merchant/announcements/${announcement.id}/edit`}>
                          <Button variant="outline" size="sm">
                            {t("actions.edit")}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}