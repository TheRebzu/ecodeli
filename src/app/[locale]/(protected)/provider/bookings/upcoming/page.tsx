"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Phone, Euro } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface UpcomingBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  totalPrice: number;
  address: any;
  notes?: string;
  client: {
    id: string;
    user: {
      profile?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
    };
  };
  service: {
    id: string;
    name: string;
    type: string;
  };
}

export default function UpcomingBookingsPage() {
  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchUpcomingBookings();
  }, []);

  const fetchUpcomingBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/provider/bookings/upcoming", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des réservations");
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: "En attente", variant: "outline" as const },
      CONFIRMED: { label: "Confirmée", variant: "default" as const },
      IN_PROGRESS: { label: "En cours", variant: "secondary" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: "outline" as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewDetails = (bookingId: string) => {
    router.push(`/provider/bookings/${bookingId}`);
  };

  const handleStartIntervention = (bookingId: string) => {
    router.push(`/provider/interventions/${bookingId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-red-600">
              <p>Erreur : {error}</p>
              <Button
                onClick={fetchUpcomingBookings}
                variant="outline"
                className="mt-4"
              >
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Réservations à venir</h1>
          <p className="text-muted-foreground">
            Gérez vos prochaines interventions
          </p>
        </div>
        <Badge variant="secondary">
          {bookings.length} réservation{bookings.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                Aucune réservation à venir
              </h3>
              <p className="text-muted-foreground">
                Vous n'avez aucune intervention programmée pour le moment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card
              key={booking.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {booking.service.name}
                      {getStatusBadge(booking.status)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(
                          new Date(booking.scheduledDate),
                          "EEEE dd MMMM yyyy",
                          { locale: fr },
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {booking.scheduledTime} ({booking.duration} min)
                      </span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-semibold">
                      <Euro className="h-4 w-4" />
                      {booking.totalPrice}€
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {booking.client.user.profile?.firstName || "Client"}{" "}
                          {booking.client.user.profile?.lastName || ""}
                        </p>
                        {booking.client.user.profile?.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {booking.client.user.profile.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          {typeof booking.address === "object"
                            ? `${booking.address.street}, ${booking.address.city}`
                            : booking.address}
                        </p>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Notes :</strong> {booking.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <Button
                      onClick={() => handleViewDetails(booking.id)}
                      variant="outline"
                      size="sm"
                    >
                      Voir détails
                    </Button>

                    {booking.status === "CONFIRMED" && (
                      <Button
                        onClick={() => handleStartIntervention(booking.id)}
                        size="sm"
                      >
                        Commencer l'intervention
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
