"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  Euro,
  Star,
  Phone,
  Eye,
  MessageSquare,
  Navigation
} from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function BookingsWidget() {
  const t = useTranslations("dashboard.provider.bookings");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Récupération des réservations
  const { data: upcomingBookings, isLoading: loadingUpcoming } = api.provider.getUpcomingBookings.useQuery();
  const { data: todayBookings, isLoading: loadingToday } = api.provider.getTodayBookings.useQuery();
  const { data: recentBookings } = api.provider.getRecentBookings.useQuery({ limit: 5 });
  const { data: bookingStats } = api.provider.getBookingStats.useQuery();

  // Mutations
  const confirmBookingMutation = api.provider.confirmBooking.useMutation({
    onSuccess: () => {
      toast.success(t("confirmSuccess"));
      // Refresh data
    },
    onError: (error) => {
      toast.error(error.message || t("confirmError"));
    }
  });

  const cancelBookingMutation = api.provider.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success(t("cancelSuccess"));
      // Refresh data
    },
    onError: (error) => {
      toast.error(error.message || t("cancelError"));
    }
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          label: t("status.pending"),
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock
        };
      case "CONFIRMED":
        return {
          label: t("status.confirmed"),
          color: "bg-blue-100 text-blue-800",
          icon: CheckCircle
        };
      case "IN_PROGRESS":
        return {
          label: t("status.inProgress"),
          color: "bg-orange-100 text-orange-800",
          icon: Clock
        };
      case "COMPLETED":
        return {
          label: t("status.completed"),
          color: "bg-green-100 text-green-800",
          icon: CheckCircle
        };
      case "CANCELLED":
        return {
          label: t("status.cancelled"),
          color: "bg-red-100 text-red-800",
          icon: XCircle
        };
      default:
        return {
          label: t("status.unknown"),
          color: "bg-gray-100 text-gray-800",
          icon: AlertCircle
        };
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    await confirmBookingMutation.mutateAsync({ id: bookingId });
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (confirm(t("confirmCancel"))) {
      await cancelBookingMutation.mutateAsync({ id: bookingId });
    }
  };

  const handleViewBooking = (bookingId: string) => {
    router.push(`/provider/bookings/${bookingId}`);
  };

  const handleContactClient = (clientId: string) => {
    router.push(`/provider/messages?with=${clientId}`);
  };

  if (loadingUpcoming || loadingToday) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const BookingCard = ({ booking, showActions = true }: { booking: any; showActions?: boolean }) => {
    const statusConfig = getStatusConfig(booking.status);
    const StatusIcon = statusConfig.icon;
    const isToday = format(new Date(booking.startTime), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
    const isUpcoming = new Date(booking.startTime) > new Date();

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{booking.service.name}</CardTitle>
              <CardDescription>
                {booking.service.category} • {format(new Date(booking.createdAt), "dd MMM yyyy", { locale: fr })}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isToday && (
                <Badge variant="default" className="bg-blue-500">
                  {t("today")}
                </Badge>
              )}
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Informations client */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{booking.client.user.name}</p>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{booking.client.user.phoneNumber || t("noPhone")}</span>
              </div>
            </div>
          </div>

          {/* Détails de la réservation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{format(new Date(booking.startTime), "dd MMM yyyy", { locale: fr })}</p>
                <p className="text-muted-foreground">
                  {format(new Date(booking.startTime), "HH:mm", { locale: fr })} - {format(new Date(booking.endTime), "HH:mm", { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.totalPrice.toFixed(2)}€</p>
                <p className="text-muted-foreground">{t("totalPrice")}</p>
              </div>
            </div>
          </div>

          {/* Adresse */}
          {booking.address && (
            <div className="flex items-start space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{t("serviceLocation")}</p>
                <p className="text-muted-foreground">{booking.address}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => handleViewBooking(booking.id)}>
                <Eye className="h-4 w-4 mr-1" />
                {t("actions.view")}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleContactClient(booking.client.id)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {t("actions.contact")}
              </Button>

              {booking.status === "PENDING" && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConfirmBooking(booking.id)}
                    disabled={confirmBookingMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t("actions.confirm")}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleCancelBooking(booking.id)}
                    disabled={cancelBookingMutation.isPending}
                  >
                    {t("actions.decline")}
                  </Button>
                </>
              )}

              {booking.status === "CONFIRMED" && isUpcoming && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleCancelBooking(booking.id)}
                  disabled={cancelBookingMutation.isPending}
                >
                  {t("actions.cancel")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.today")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBookings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">{t("stats.todayDesc")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.upcoming")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">{t("stats.upcomingDesc")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.thisMonth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingStats?.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">{t("stats.monthDesc")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("stats.revenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingStats?.monthlyRevenue?.toFixed(0) || 0}€</div>
            <p className="text-xs text-muted-foreground">{t("stats.revenueDesc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets des réservations */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">{t("tabs.today")} ({todayBookings?.length || 0})</TabsTrigger>
          <TabsTrigger value="upcoming">{t("tabs.upcoming")} ({upcomingBookings?.length || 0})</TabsTrigger>
          <TabsTrigger value="recent">{t("tabs.recent")}</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todayBookings && todayBookings.length > 0 ? (
            todayBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noBookingsToday")}</h3>
                <p className="text-muted-foreground">{t("noBookingsTodayDesc")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings && upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noUpcomingBookings")}</h3>
                <p className="text-muted-foreground">{t("noUpcomingBookingsDesc")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {recentBookings && recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} showActions={false} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noRecentBookings")}</h3>
                <p className="text-muted-foreground">{t("noRecentBookingsDesc")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
