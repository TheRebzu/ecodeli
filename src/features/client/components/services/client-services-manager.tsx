"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, MapPin, Star, User, Plus, Search, Filter, MessageSquare } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

interface ClientServicesManagerProps {
  clientId: string;
}

interface ServiceProvider {
  id: string;
  name: string;
  profilePhoto?: string;
  rating: number;
  reviewCount: number;
  description: string;
  experience: number;
  location: string;
  distance?: number;
  services: ServiceOffering[];
  availability: AvailabilitySlot[];
  certifications: string[];
  languages: string[];
  responseTime: number; // en minutes
}

interface ServiceOffering {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number; // en minutes
  price: number;
  homeService: boolean;
  requirements?: string[];
}

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  status: "available" | "busy" | "blocked";
}

interface ServiceBooking {
  id: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  location: string;
  price: number;
  notes?: string;
  specialRequests?: string;
  rating?: number;
  review?: string;
  createdAt: string;
}

interface BookingForm {
  providerId: string;
  serviceId: string;
  date: Date | undefined;
  timeSlot: string;
  location: string;
  homeService: boolean;
  notes: string;
  specialRequests: string;
}

export default function ClientServicesManager({ clientId }: ClientServicesManagerProps) {
  const t = useTranslations("client.services");
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  
  const [filters, setFilters] = useState({
    maxDistance: "",
    minRating: "",
    maxPrice: "",
    homeService: false
  });

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    providerId: "",
    serviceId: "",
    date: undefined,
    timeSlot: "",
    location: "",
    homeService: false,
    notes: "",
    specialRequests: ""
  });

  useEffect(() => {
    fetchServicesData();
  }, [clientId]);

  const fetchServicesData = async () => {
    try {
      const [providersRes, bookingsRes, categoriesRes] = await Promise.all([
        fetch(`/api/client/services?clientId=${clientId}`),
        fetch(`/api/client/bookings?clientId=${clientId}`),
        fetch("/api/shared/service-categories")
      ]);

      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviders(data.providers || []);
      }

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setServiceCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching services data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = async () => {
    if (!bookingForm.date || !bookingForm.timeSlot) return;

    try {
      const response = await fetch("/api/client/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          ...bookingForm,
          date: format(bookingForm.date, "yyyy-MM-dd")
        })
      });

      if (response.ok) {
        await fetchServicesData();
        setShowBookingDialog(false);
        setBookingForm({
          providerId: "",
          serviceId: "",
          date: undefined,
          timeSlot: "",
          location: "",
          homeService: false,
          notes: "",
          specialRequests: ""
        });
      }
    } catch (error) {
      console.error("Error booking service:", error);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId })
      });

      if (response.ok) {
        await fetchServicesData();
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  };

  const handleRateService = async (bookingId: string, rating: number, review: string) => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, rating, review })
      });

      if (response.ok) {
        await fetchServicesData();
      }
    } catch (error) {
      console.error("Error rating service:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      confirmed: { color: "bg-blue-100 text-blue-800", label: t("status.confirmed") },
      in_progress: { color: "bg-orange-100 text-orange-800", label: t("status.in_progress") },
      completed: { color: "bg-green-100 text-green-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getAvailableSlots = (provider: ServiceProvider, selectedDate: Date) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return provider.availability.filter(slot => 
      slot.date === dateStr && 
      slot.status === "available" && 
      slot.currentBookings < slot.maxBookings
    );
  };

  const filteredProviders = providers.filter(provider => {
    // Recherche textuelle
    if (searchTerm && !provider.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !provider.services.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }

    // Catégorie
    if (selectedCategory !== "all" && !provider.services.some(s => s.category === selectedCategory)) {
      return false;
    }

    // Filtres avancés
    if (filters.maxDistance && provider.distance && provider.distance > parseFloat(filters.maxDistance)) {
      return false;
    }
    
    if (filters.minRating && provider.rating < parseFloat(filters.minRating)) {
      return false;
    }
    
    if (filters.maxPrice && provider.services.every(s => s.price > parseFloat(filters.maxPrice))) {
      return false;
    }
    
    if (filters.homeService && !provider.services.some(s => s.homeService)) {
      return false;
    }

    return true;
  });

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">{t("tabs.browse_services")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("tabs.my_bookings")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                {t("search.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={t("search.placeholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("search.category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("search.all_categories")}</SelectItem>
                    {serviceCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  type="number"
                  placeholder={t("filters.max_distance")}
                  value={filters.maxDistance}
                  onChange={(e) => setFilters({...filters, maxDistance: e.target.value})}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder={t("filters.min_rating")}
                  value={filters.minRating}
                  onChange={(e) => setFilters({...filters, minRating: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder={t("filters.max_price")}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                />
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.homeService}
                    onChange={(e) => setFilters({...filters, homeService: e.target.checked})}
                  />
                  <span className="text-sm">{t("filters.home_service")}</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {provider.profilePhoto ? (
                        <img src={provider.profilePhoto} alt={provider.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{provider.rating.toFixed(1)}</span>
                          <span className="text-gray-500">({provider.reviewCount})</span>
                        </div>
                        {provider.distance && (
                          <span className="text-gray-500">• {provider.distance.toFixed(1)}km</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2">{provider.description}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{provider.experience} {t("years_experience")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{provider.location}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {provider.services.slice(0, 3).map((service) => (
                      <Badge key={service.id} variant="secondary" className="text-xs">
                        {service.name} - €{service.price}
                      </Badge>
                    ))}
                    {provider.services.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{provider.services.length - 3} {t("more_services")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowProviderDialog(true);
                      }}
                    >
                      {t("actions.view_profile")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBookingForm({...bookingForm, providerId: provider.id});
                        setShowBookingDialog(true);
                      }}
                    >
                      {t("actions.book_service")}
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500">
                    {t("response_time")}: ~{provider.responseTime} min
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProviders.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_search.title")}</h3>
                <p className="text-gray-600 text-center">{t("empty_search.description")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {bookings.filter(b => ["pending", "confirmed", "in_progress"].includes(b.status)).map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{booking.serviceName}</CardTitle>
                    <CardDescription>
                      {t("with_provider", { provider: booking.providerName })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(booking.date).toLocaleDateString()} {booking.startTime}-{booking.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{booking.location}</span>
                  </div>
                  <div className="text-sm font-semibold">
                    €{booking.price}
                  </div>
                </div>

                {booking.notes && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>{t("notes")}:</strong> {booking.notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {t("actions.contact_provider")}
                  </Button>
                  
                  {booking.status === "pending" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      {t("actions.cancel")}
                    </Button>
                  )}

                  {booking.status === "completed" && !booking.rating && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Star className="h-3 w-3 mr-1" />
                          {t("actions.rate_service")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("rating_dialog.title")}</DialogTitle>
                          <DialogDescription>
                            {t("rating_dialog.description", { service: booking.serviceName })}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>{t("rating_dialog.rating")}</Label>
                            <div className="flex gap-1 mt-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className="h-6 w-6 cursor-pointer"
                                  onClick={() => {/* Handle rating selection */}}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="review">{t("rating_dialog.review")}</Label>
                            <Textarea
                              id="review"
                              placeholder={t("rating_dialog.review_placeholder")}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => {/* Handle submit rating */}}>
                            {t("rating_dialog.submit")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {bookings.filter(b => ["pending", "confirmed", "in_progress"].includes(b.status)).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_bookings.title")}</h3>
                <p className="text-gray-600 text-center">{t("empty_bookings.description")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {bookings.filter(b => ["completed", "cancelled"].includes(b.status)).map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{booking.serviceName}</h4>
                    <p className="text-sm text-gray-600">
                      {booking.providerName} • {new Date(booking.date).toLocaleDateString()}
                    </p>
                    {booking.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{booking.rating}/5</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">€{booking.price}</div>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {showBookingDialog && (
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("booking_dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("booking_dialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="service">{t("booking_dialog.select_service")}</Label>
                <Select value={bookingForm.serviceId} onValueChange={(value) => setBookingForm({...bookingForm, serviceId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("booking_dialog.choose_service")} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProvider?.services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - €{service.price} ({service.duration}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("booking_dialog.select_date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingForm.date ? format(bookingForm.date, "PPP") : t("booking_dialog.pick_date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={bookingForm.date}
                        onSelect={(date) => setBookingForm({...bookingForm, date})}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="timeSlot">{t("booking_dialog.select_time")}</Label>
                  <Select value={bookingForm.timeSlot} onValueChange={(value) => setBookingForm({...bookingForm, timeSlot: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("booking_dialog.choose_time")} />
                    </SelectTrigger>
                    <SelectContent>
                      {bookingForm.date && selectedProvider && getAvailableSlots(selectedProvider, bookingForm.date).map((slot) => (
                        <SelectItem key={slot.id} value={`${slot.startTime}-${slot.endTime}`}>
                          {slot.startTime} - {slot.endTime}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location">{t("booking_dialog.location")}</Label>
                <Input
                  id="location"
                  value={bookingForm.location}
                  onChange={(e) => setBookingForm({...bookingForm, location: e.target.value})}
                  placeholder={t("booking_dialog.location_placeholder")}
                />
              </div>

              <div>
                <Label htmlFor="notes">{t("booking_dialog.notes")}</Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                  placeholder={t("booking_dialog.notes_placeholder")}
                />
              </div>

              <div>
                <Label htmlFor="specialRequests">{t("booking_dialog.special_requests")}</Label>
                <Textarea
                  id="specialRequests"
                  value={bookingForm.specialRequests}
                  onChange={(e) => setBookingForm({...bookingForm, specialRequests: e.target.value})}
                  placeholder={t("booking_dialog.special_requests_placeholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleBookService}>
                {t("booking_dialog.confirm_booking")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showProviderDialog && selectedProvider && (
        <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProvider.name}</DialogTitle>
              <DialogDescription>
                {t("provider_dialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                  {selectedProvider.profilePhoto ? (
                    <img src={selectedProvider.profilePhoto} alt={selectedProvider.name} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{selectedProvider.rating.toFixed(1)}</span>
                    <span className="text-gray-600">({selectedProvider.reviewCount} {t("reviews")})</span>
                  </div>
                  <p className="text-gray-600 mb-2">{selectedProvider.description}</p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{selectedProvider.experience} {t("years_experience")}</span>
                    <span>{selectedProvider.location}</span>
                    {selectedProvider.distance && <span>{selectedProvider.distance.toFixed(1)}km</span>}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">{t("provider_dialog.services")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedProvider.services.map((service) => (
                    <Card key={service.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{service.name}</h5>
                          <p className="text-sm text-gray-600">{service.description}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            {service.duration}min • {service.homeService ? t("home_service") : t("office_only")}
                          </div>
                        </div>
                        <div className="text-lg font-semibold">€{service.price}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedProvider.certifications.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">{t("provider_dialog.certifications")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider.certifications.map((cert, index) => (
                      <Badge key={index} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedProvider.languages.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">{t("provider_dialog.languages")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider.languages.map((lang, index) => (
                      <Badge key={index} variant="secondary">{lang}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => {
                setBookingForm({...bookingForm, providerId: selectedProvider.id});
                setShowProviderDialog(false);
                setShowBookingDialog(true);
              }}>
                {t("provider_dialog.book_service")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}