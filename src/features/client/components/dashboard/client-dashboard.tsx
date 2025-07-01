"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Package, Truck, Calendar, DollarSign, Plus, Eye } from "lucide-react";
import Link from "next/link";
import ClientTutorialSystem from "@/features/tutorials/components/client-tutorial-system";
import { useAuth } from "@/hooks/use-auth";

interface DashboardStats {
  totalAnnouncements: number;
  activeDeliveries: number;
  pendingBookings: number;
  totalSpent: number;
}

interface RecentActivity {
  id: string;
  type: 'ANNOUNCEMENT' | 'DELIVERY' | 'BOOKING' | 'PAYMENT';
  title: string;
  status: string;
  date: string;
  amount?: number;
}

interface ClientDashboardProps {
  clientId?: string;
}

export function ClientDashboard({ clientId }: ClientDashboardProps) {
  const t = useTranslations("client.dashboard");
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [clientId]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/client/dashboard?clientId=${clientId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentActivities(data.recentActivities || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT': return <Package className="h-4 w-4" />;
      case 'DELIVERY': return <Truck className="h-4 w-4" />;
      case 'BOOKING': return <Calendar className="h-4 w-4" />;
      case 'PAYMENT': return <DollarSign className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': case 'ACTIVE': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/client/announcements/create">
          <Button className="w-full h-20 text-left justify-start bg-blue-600 hover:bg-blue-700">
            <Plus className="h-6 w-6 mr-3" />
            <div>
              <div className="font-semibold">{t("actions.create_announcement")}</div>
              <div className="text-sm opacity-90">{t("actions.create_announcement_desc")}</div>
            </div>
          </Button>
        </Link>
        
        <Link href="/client/services">
          <Button variant="outline" className="w-full h-20 text-left justify-start">
            <Calendar className="h-6 w-6 mr-3" />
            <div>
              <div className="font-semibold">{t("actions.book_service")}</div>
              <div className="text-sm text-gray-600">{t("actions.book_service_desc")}</div>
            </div>
          </Button>
        </Link>
        
        <Link href="/client/deliveries">
          <Button variant="outline" className="w-full h-20 text-left justify-start">
            <Truck className="h-6 w-6 mr-3" />
            <div>
              <div className="font-semibold">{t("actions.track_deliveries")}</div>
              <div className="text-sm text-gray-600">{t("actions.track_deliveries_desc")}</div>
            </div>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t("stats.announcements")}</p>
                  <p className="text-2xl font-bold">{stats.totalAnnouncements}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t("stats.deliveries")}</p>
                  <p className="text-2xl font-bold">{stats.activeDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t("stats.bookings")}</p>
                  <p className="text-2xl font-bold">{stats.pendingBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t("stats.spent")}</p>
                  <p className="text-2xl font-bold">{stats.totalSpent}€</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recent_activities.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {t("recent_activities.empty")}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getActivityIcon(activity.type)}
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {activity.amount && (
                      <span className="font-semibold">{activity.amount}€</span>
                    )}
                    <Badge className={getStatusColor(activity.status)}>
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tutoriel pour nouveaux clients uniquement */}
      {user && (
        <ClientTutorialSystem 
          userId={user.id}
          onComplete={() => {
            console.log('Tutorial completed');
          }}
        />
      )}
    </div>
  );
}