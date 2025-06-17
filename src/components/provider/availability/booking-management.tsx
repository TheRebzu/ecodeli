"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  X,
  AlertCircle,
  Eye,
  Edit,
  Filter,
  Search,
  CalendarDays,
  MessageSquare,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays, isSameDay, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";

interface BookingManagementProps {
  providerId: string;
  onBookingUpdate?: () => void;
}

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  serviceDescription: string;
  scheduledDate: Date;
  duration: number; // en minutes
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price: number;
  location: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  reminderSent: boolean;
  cancellationReason?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
}

interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  booking?: Booking;
}

export default function BookingManagement({ 
  providerId, 
  onBookingUpdate 
}: BookingManagementProps) {
  const t = useTranslations("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendar");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);

  // Utiliser tRPC pour récupérer les réservations
  const { data: bookingsData, error: bookingsError, isLoading } = api.provider.getBookings.useQuery({
    startDate: startOfDay(addDays(new Date(), -30)), // 30 jours dans le passé
    endDate: endOfDay(addDays(new Date(), 90)), // 90 jours dans le futur
    limit: 100
  });

  // Mutations pour gérer les réservations (à implémenter dans le routeur si nécessaire)
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Charger les réservations
  useEffect(() => {
    if (bookingsError) {
      console.error("Erreur lors du chargement des réservations:", bookingsError);
      toast.error(t("management.errorLoading"));
      return;
    }

    if (bookingsData?.bookings) {
      // Transformer les données de l'API en format Booking
      const mappedBookings: Booking[] = bookingsData.bookings.map((booking: any) => ({
        id: booking.id,
        clientName: booking.client?.user?.name || "Client anonyme",
        clientEmail: booking.client?.user?.email || "",
        clientPhone: booking.client?.user?.phoneNumber || "",
        serviceName: booking.service?.name || "Service",
        serviceDescription: booking.service?.description || booking.service?.category || "",
        scheduledDate: new Date(booking.scheduledAt),
        duration: booking.service?.duration || 120,
        status: mapBookingStatus(booking.status),
        price: booking.service?.price || 0,
        location: booking.location || "",
        notes: booking.notes,
        priority: 'medium',
        reminderSent: booking.reminderSent || false,
        cancellationReason: booking.cancellationReason,
        rating: booking.rating,
        feedback: booking.feedback,
        createdAt: new Date(booking.createdAt)
      }));

      setBookings(mappedBookings);
    }
  }, [bookingsData, bookingsError, t]);

  // Fonction pour mapper le statut de la réservation
  const mapBookingStatus = (status: string): 'pending' | 'confirmed' | 'cancelled' | 'completed' => {
    switch (status) {
      case 'CONFIRMED':
        return 'confirmed';
      case 'CANCELLED':
        return 'cancelled';
      case 'COMPLETED':
        return 'completed';
      case 'PENDING':
      default:
        return 'pending';
    }
  };

  // Filtrer les réservations
  useEffect(() => {
    let filtered = bookings;

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  // Mutation pour confirmer une réservation
  const confirmBookingMutation = api.provider.confirmBooking.useMutation({
    onSuccess: () => {
      toast.success(t("management.bookingConfirmed"));
      onBookingUpdate?.();
      // Invalidation du cache pour rafraîchir les données
      void api.provider.getBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("management.errorConfirming"));
    }
  });

  const handleConfirmBooking = async (bookingId: string) => {
    setIsConfirming(true);
    await confirmBookingMutation.mutateAsync({ id: bookingId });
    setIsConfirming(false);
  };

  // Mutation pour annuler une réservation
  const cancelBookingMutation = api.provider.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success(t("management.bookingCancelled"));
      onBookingUpdate?.();
      // Invalidation du cache pour rafraîchir les données
      void api.provider.getBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("management.errorCancelling"));
    }
  });

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    setIsCancelling(true);
    await cancelBookingMutation.mutateAsync({ id: bookingId });
    setIsCancelling(false);
  };

  // Mutation pour finaliser une réservation
  const completeBookingMutation = api.provider.completeBooking.useMutation({
    onSuccess: () => {
      toast.success(t("management.bookingCompleted"));
      onBookingUpdate?.();
      // Invalidation du cache pour rafraîchir les données
      void api.provider.getBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("management.errorCompleting"));
    }
  });

  const handleCompleteBooking = async (bookingId: string) => {
    setIsCompleting(true);
    await completeBookingMutation.mutateAsync({ id: bookingId });
    setIsCompleting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      case 'completed': return <Star className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getDayBookings = (date: Date) => {
    return bookings.filter(booking => isSameDay(booking.scheduledDate, date));
  };

  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 18;
    const slotDuration = 60; // 1 heure

    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      const booking = bookings.find(b => 
        b.scheduledDate >= slotStart && 
        b.scheduledDate < slotEnd &&
        b.status !== 'cancelled'
      );

      slots.push({
        start: slotStart,
        end: slotEnd,
        isAvailable: !booking,
        booking
      });
    }

    return slots;
  };

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(booking.status)}
              <Badge className={cn("text-xs", getStatusColor(booking.status))}>
                {t(`status.${booking.status}`)}
              </Badge>
            </div>
            <Badge className={cn("text-xs", getPriorityColor(booking.priority))}>
              {t(`priority.${booking.priority}`)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedBooking(booking);
                setShowBookingDetails(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-lg">{booking.serviceName}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span>{booking.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{format(booking.scheduledDate, "PPP à HH:mm", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{booking.clientPhone}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="truncate">{booking.location}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600">{booking.serviceDescription}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-lg">{booking.price.toFixed(2)}€</span>
            <span className="text-sm text-gray-500">{booking.duration} min</span>
          </div>
          
          <div className="flex gap-2">
            {booking.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleConfirmBooking(booking.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t("management.confirm")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelBooking(booking.id, "Annulé par le prestataire")}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t("management.cancel")}
                </Button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <Button
                size="sm"
                onClick={() => handleCompleteBooking(booking.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Star className="h-4 w-4 mr-1" />
                {t("management.complete")}
              </Button>
            )}
          </div>
        </div>

        {booking.notes && (
          <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
            <p className="text-sm"><strong>{t("management.notes")}:</strong> {booking.notes}</p>
          </div>
        )}

        {booking.rating && (
          <div className="mt-3 p-2 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{booking.rating}/5</span>
            </div>
            {booking.feedback && (
              <p className="text-sm italic">"{booking.feedback}"</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCalendarDay = (date: Date) => {
    const dayBookings = getDayBookings(date);
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, selectedDate);

    return (
      <div
        key={date.getTime()}
        className={cn(
          "p-2 border rounded-lg cursor-pointer transition-colors",
          isToday && "bg-blue-50 border-blue-200",
          isSelected && "bg-primary text-primary-foreground",
          dayBookings.length > 0 && "border-green-200 bg-green-50"
        )}
        onClick={() => setSelectedDate(date)}
      >
        <div className="text-center">
          <div className="text-sm font-medium">{format(date, "d", { locale: fr })}</div>
          <div className="text-xs text-gray-500">{format(date, "EEE", { locale: fr })}</div>
          {dayBookings.length > 0 && (
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs">
                {dayBookings.length}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">{t("management.pending")}</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t("management.confirmed")}</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t("management.completed")}</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">{t("management.avgRating")}</p>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => b.rating).length > 0 
                    ? (bookings.filter(b => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) / bookings.filter(b => b.rating).length).toFixed(1)
                    : "N/A"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t("management.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t("management.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("management.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("status.pending")}</SelectItem>
                <SelectItem value="confirmed">{t("status.confirmed")}</SelectItem>
                <SelectItem value="completed">{t("status.completed")}</SelectItem>
                <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">
            <CalendarDays className="h-4 w-4 mr-2" />
            {t("management.calendar")}
          </TabsTrigger>
          <TabsTrigger value="list">
            <Filter className="h-4 w-4 mr-2" />
            {t("management.list")}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            {t("management.timeline")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mini calendrier */}
            <Card>
              <CardHeader>
                <CardTitle>{t("management.calendar")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = addDays(startOfDay(new Date()), i - 3);
                    return renderCalendarDay(date);
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Créneaux du jour sélectionné */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("management.slotsFor")} {format(selectedDate, "PPP", { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {generateTimeSlots(selectedDate).map((slot, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        slot.isAvailable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
                        </span>
                        {slot.booking ? (
                          <div className="text-sm">
                            <span className="font-medium">{slot.booking.clientName}</span>
                            <br />
                            <span className="text-gray-600">{slot.booking.serviceName}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">{t("management.available")}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{t("management.noBookings")}</p>
                </CardContent>
              </Card>
            ) : (
              filteredBookings.map(renderBookingCard)
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("management.upcomingBookings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings
                  .filter(b => b.status === 'confirmed' && b.scheduledDate > new Date())
                  .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
                  .map((booking, index) => (
                    <div key={booking.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{booking.serviceName}</h3>
                        <p className="text-sm text-gray-600">{booking.clientName}</p>
                        <p className="text-sm text-gray-500">
                          {format(booking.scheduledDate, "PPP à HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{booking.price.toFixed(2)}€</p>
                        <p className="text-sm text-gray-500">{booking.duration} min</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal détails réservation */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedBooking.serviceName}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBookingDetails(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t("management.client")}</Label>
                  <p>{selectedBooking.clientName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("management.status")}</Label>
                  <Badge className={cn("mt-1", getStatusColor(selectedBooking.status))}>
                    {t(`status.${selectedBooking.status}`)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">{t("management.description")}</Label>
                <p>{selectedBooking.serviceDescription}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t("management.date")}</Label>
                  <p>{format(selectedBooking.scheduledDate, "PPP à HH:mm", { locale: fr })}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("management.duration")}</Label>
                  <p>{selectedBooking.duration} minutes</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">{t("management.location")}</Label>
                <p>{selectedBooking.location}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t("management.phone")}</Label>
                  <p>{selectedBooking.clientPhone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("management.email")}</Label>
                  <p>{selectedBooking.clientEmail}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">{t("management.price")}</Label>
                <p className="text-lg font-semibold">{selectedBooking.price.toFixed(2)}€</p>
              </div>
              
              {selectedBooking.notes && (
                <div>
                  <Label className="text-sm font-medium">{t("management.notes")}</Label>
                  <p className="bg-yellow-50 p-3 rounded-lg">{selectedBooking.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
