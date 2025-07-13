"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes?: string;
  price: number;
  createdAt: string;
}

export function ProviderBookings() {
  const t = useTranslations("provider.bookings");
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    fetchBookings();
  }, [user?.id, activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);

      let url = `/api/provider/bookings?providerId=${user?.id}`;
      if (activeTab === "upcoming") {
        url = `/api/provider/bookings/upcoming?providerId=${user?.id}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.bookings) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch(
        `/api/provider/bookings/${bookingId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      if (response.ok) {
        toast.success(
          status === "CONFIRMED"
            ? "Réservation confirmée"
            : status === "COMPLETED"
              ? "Prestation marquée comme terminée"
              : "Statut mis à jour",
        );
        fetchBookings();
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const cancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch(
        `/api/provider/bookings/${selectedBooking.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason }),
        },
      );

      if (response.ok) {
        toast.success("Réservation annulée");
        setShowCancelDialog(false);
        setCancelReason("");
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">En attente</Badge>;
      case "CONFIRMED":
        return <Badge className="bg-blue-100 text-blue-800">Confirmée</Badge>;
      case "IN_PROGRESS":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>
        );
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Terminée</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBookingsByStatus = (status: string) => {
    return bookings.filter((booking) => {
      if (status === "upcoming") {
        return (
          ["PENDING", "CONFIRMED"].includes(booking.status) &&
          new Date(booking.scheduledAt) > new Date()
        );
      }
      return booking.status === status;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À venir</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBookingsByStatus("upcoming").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBookingsByStatus("PENDING").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmées</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBookingsByStatus("CONFIRMED").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminées</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getBookingsByStatus("COMPLETED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de réservations */}
      <Card>
        <CardHeader>
          <CardTitle>Mes réservations</CardTitle>
          <CardDescription>
            Gérez vos réservations et interventions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="upcoming">À venir</TabsTrigger>
              <TabsTrigger value="PENDING">En attente</TabsTrigger>
              <TabsTrigger value="CONFIRMED">Confirmées</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">En cours</TabsTrigger>
              <TabsTrigger value="COMPLETED">Terminées</TabsTrigger>
              <TabsTrigger value="CANCELLED">Annulées</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {getBookingsByStatus(activeTab).length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Aucune réservation dans cette catégorie
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Heure</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Adresse</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getBookingsByStatus(activeTab).map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {format(
                                new Date(booking.scheduledAt),
                                "dd/MM/yyyy",
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.scheduledAt), "HH:mm")} (
                              {booking.duration}min)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{booking.serviceName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.clientName}</p>
                            {booking.clientPhone && (
                              <p className="text-sm text-muted-foreground">
                                {booking.clientPhone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.clientAddress ? (
                            <div className="flex items-start gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span className="text-sm">
                                {booking.clientAddress}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {booking.price.toFixed(2)}€
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {booking.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "CONFIRMED")
                                  }
                                >
                                  Confirmer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowCancelDialog(true);
                                  }}
                                >
                                  Refuser
                                </Button>
                              </>
                            )}
                            {booking.status === "CONFIRMED" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateBookingStatus(
                                      booking.id,
                                      "IN_PROGRESS",
                                    )
                                  }
                                >
                                  Commencer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowCancelDialog(true);
                                  }}
                                >
                                  Annuler
                                </Button>
                              </>
                            )}
                            {booking.status === "IN_PROGRESS" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateBookingStatus(booking.id, "COMPLETED")
                                }
                              >
                                Terminer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog d'annulation */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la réservation</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison de l'annulation. Le client sera
              notifié.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Raison de l'annulation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
              }}
            >
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={cancelBooking}
              disabled={!cancelReason}
            >
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
