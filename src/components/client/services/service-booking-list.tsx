"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  User, 
  Star, 
  Euro,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  Eye,
  MessageSquare
} from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface ServiceBooking {
  id: string;
  status: string;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  notes?: string;
  createdAt: Date;
  service: {
    id: string;
    name: string;
    category: string;
    description: string;
  };
  provider: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
  review?: {
    id: string;
    rating: number;
    comment: string;
  } | null;
}

export default function ServiceBookingList() {
  const t = useTranslations("services.bookings");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Récupération des réservations
  const { data: bookings, isLoading, refetch } = api.client.getMyClientBookings.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter
  });

  // Mutation pour annuler une réservation
  const cancelBookingMutation = api.client.cancelServiceBooking.useMutation({
    onSuccess: () => {
      toast.success(t("cancelSuccess"));
      refetch();
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
          icon: Timer
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

  const handleCancelBooking = async (bookingId: string) => {
    if (confirm(t("confirmCancel"))) {
      await cancelBookingMutation.mutateAsync({ id: bookingId });
    }
  };

  const handleViewDetails = (bookingId: string) => {
    router.push(`/client/services/bookings/${bookingId}`);
  };

  const handleMessageProvider = (providerId: string) => {
    router.push(`/client/messages?with=${providerId}`);
  };

  const filteredBookings = bookings?.filter((booking: ServiceBooking) => {
    const matchesSearch = booking.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.provider.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getBookingsByStatus = (status: string) => {
    if (status === "all") return filteredBookings;
    return filteredBookings.filter((booking: ServiceBooking) => booking.status === status);
  };

  const upcomingBookings = filteredBookings.filter((booking: ServiceBooking) => 
    ["CONFIRMED", "PENDING"].includes(booking.status) && new Date(booking.startTime) > new Date()
  );

  const pastBookings = filteredBookings.filter((booking: ServiceBooking) => 
    ["COMPLETED", "CANCELLED"].includes(booking.status) || new Date(booking.startTime) < new Date()
  );

  if (isLoading) {
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

  const BookingCard = ({ booking }: { booking: ServiceBooking }) => {
    const statusConfig = getStatusConfig(booking.status);
    const StatusIcon = statusConfig.icon;
    const isUpcoming = new Date(booking.startTime) > new Date();
    const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status) && isUpcoming;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{booking.service.name}</CardTitle>
              <CardDescription>
                {booking.service.category} • {t("bookedOn")} {format(booking.createdAt, "dd MMM yyyy", { locale: fr })}
              </CardDescription>
            </div>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Informations du prestataire */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{booking.provider.name}</p>
              {booking.provider.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-sm text-muted-foreground">{booking.provider.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Détails de la réservation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{format(booking.startTime, "dd MMM yyyy", { locale: fr })}</p>
                <p className="text-muted-foreground">
                  {format(booking.startTime, "HH:mm", { locale: fr })} - {format(booking.endTime, "HH:mm", { locale: fr })}
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

          {/* Notes */}
          {booking.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{booking.notes}</p>
            </div>
          )}

          {/* Avis (si terminé) */}
          {booking.review && (
            <div className="p-3 border rounded-lg">
              <div className="flex items-center space-x-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= booking.review!.rating
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="text-sm font-medium ml-2">{booking.review.rating}/5</span>
              </div>
              <p className="text-sm text-muted-foreground">{booking.review.comment}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => handleViewDetails(booking.id)}>
              <Eye className="h-4 w-4 mr-1" />
              {t("actions.view")}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleMessageProvider(booking.provider.id)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              {t("actions.message")}
            </Button>

            {canCancel && (
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header et filtres */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("status.all")}</SelectItem>
              <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
              <SelectItem value="CONFIRMED">{t("status.confirmed")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t("status.inProgress")}</SelectItem>
              <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
              <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">{t("tabs.all")} ({filteredBookings.length})</TabsTrigger>
          <TabsTrigger value="upcoming">{t("tabs.upcoming")} ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">{t("tabs.past")} ({pastBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noBookings")}</h3>
                <p className="text-muted-foreground mb-4">{t("noBookingsDescription")}</p>
                <Button onClick={() => router.push("/client/services")}>
                  {t("actions.browseServices")}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noUpcoming")}</h3>
                <p className="text-muted-foreground">{t("noUpcomingDescription")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length > 0 ? (
            pastBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noPast")}</h3>
                <p className="text-muted-foreground">{t("noPastDescription")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
