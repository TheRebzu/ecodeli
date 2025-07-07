"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Filter, Star, Clock, MapPin, User, Calendar, Euro, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";

interface ServicesBrowserProps {
  clientId?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  type: string;
  basePrice: number;
  priceUnit: string;
  duration?: number;
  minAdvanceBooking: number;
  maxAdvanceBooking: number;
  requirements: string[];
  completedBookings: number;
  createdAt: string;
  provider: {
    id: string;
    businessName?: string;
    description?: string;
    averageRating: number;
    totalBookings: number;
    specialties: string[];
    hourlyRate?: number;
    user: {
      id: string;
      name: string;
      avatar?: string;
      city?: string;
    };
  };
}

interface SearchFilters {
  search: string;
  category: string;
  priceMin: string;
  priceMax: string;
  city: string;
  sortBy: string;
  sortOrder: string;
}

interface ApiResponse {
  services: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    total: number;
    averagePrice: number;
    priceRange: {
      min: number;
      max: number;
    };
    categoryBreakdown: Array<{
      type: string;
      _count: { type: number };
    }>;
  };
}

const serviceCategories = [
  { value: "PERSON_TRANSPORT", label: "Transport de personnes", icon: "🚗" },
  { value: "AIRPORT_TRANSFER", label: "Transfert aéroport", icon: "✈️" },
  { value: "SHOPPING", label: "Courses", icon: "🛒" },
  { value: "INTERNATIONAL_PURCHASE", label: "Achats internationaux", icon: "🌍" },
  { value: "PET_CARE", label: "Garde d'animaux", icon: "🐕" },
  { value: "HOME_SERVICE", label: "Services à domicile", icon: "🏠" },
  { value: "CART_DROP", label: "Lâcher de chariot", icon: "🛒" },
  { value: "OTHER", label: "Autre", icon: "⚡" }
];

const sortOptions = [
  { value: "created", label: "Plus récents" },
  { value: "price", label: "Prix" },
  { value: "rating", label: "Note" },
  { value: "name", label: "Nom" }
];

export default function ServicesBrowser({ clientId }: ServicesBrowserProps) {
  const t = useTranslations("client.services");
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<ApiResponse["stats"] | null>(null);
  const [pagination, setPagination] = useState<ApiResponse["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [bookingForm, setBookingForm] = useState({
    startDate: '',
    endDate: '',
    timeSlot: '',
    location: '',
    notes: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    search: "",
    category: "all",
    priceMin: "",
    priceMax: "",
    city: "",
    sortBy: "created",
    sortOrder: "desc"
  });

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchServices();
  }, [filters, currentPage]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "12");
      
      if (filters.search) params.append("search", filters.search);
      if (filters.category && filters.category !== "all") params.append("category", filters.category);
      if (filters.priceMin) params.append("priceMin", filters.priceMin);
      if (filters.priceMax) params.append("priceMax", filters.priceMax);
      if (filters.city) params.append("city", filters.city);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

      const response = await fetch(`/api/public/services?${params.toString()}`);
      
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setServices(data.services);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const getCategoryInfo = (type: string) => {
    return serviceCategories.find(cat => cat.value === type) || 
           { value: type, label: type, icon: "⚡" };
  };

  const formatPrice = (price: number, unit: string) => {
    const unitLabels: Record<string, string> = {
      "HOUR": "/heure",
      "FLAT": "forfait",
      "DAY": "/jour",
      "KM": "/km"
    };
    return `${price}€${unitLabels[unit] || ""}`;
  };

  // Fonction helper pour calculer la durée d'un créneau en heures
  const getTimeSlotDuration = (timeSlot: string): number => {
    if (!timeSlot) return 1;
    
    // Créneaux flexibles ou personnalisés = 1 heure par défaut
    if (timeSlot.includes('flexible') || timeSlot === 'custom') {
      return 1;
    }
    
    // Extraire les heures de début et fin (format "HH:MM-HH:MM")
    const timeMatch = timeSlot.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    if (timeMatch) {
      const [, startHour, startMin, endHour, endMin] = timeMatch;
      const startTime = parseInt(startHour) + parseInt(startMin) / 60;
      const endTime = parseInt(endHour) + parseInt(endMin) / 60;
      return endTime - startTime;
    }
    
    return 1; // Durée par défaut
  };

  // Fonction helper pour calculer le prix total d'une réservation
  const calculateTotalPrice = (service: Service, startDate: string, endDate: string, timeSlot: string): { totalPrice: number, details: string } => {
    if (!startDate || !endDate) {
      return { totalPrice: service.basePrice, details: formatPrice(service.basePrice, service.priceUnit) };
    }

    const durationDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const timeSlotHours = getTimeSlotDuration(timeSlot);

    let totalPrice = service.basePrice;
    let details = formatPrice(service.basePrice, service.priceUnit);

    switch (service.priceUnit) {
      case 'HOUR':
        // Prix à l'heure × nombre d'heures par jour × nombre de jours
        totalPrice = service.basePrice * timeSlotHours * durationDays;
        details = `${service.basePrice}€/h × ${timeSlotHours}h × ${durationDays} jour${durationDays > 1 ? 's' : ''} = ${totalPrice}€`;
        break;
      
      case 'DAY':
        // Prix par jour × nombre de jours
        totalPrice = service.basePrice * durationDays;
        details = `${service.basePrice}€/jour × ${durationDays} jour${durationDays > 1 ? 's' : ''} = ${totalPrice}€`;
        break;
      
      case 'FLAT':
        // Prix forfaitaire × nombre de jours (pour des services récurrents)
        if (durationDays > 1) {
          totalPrice = service.basePrice * durationDays;
          details = `${service.basePrice}€ forfait × ${durationDays} jour${durationDays > 1 ? 's' : ''} = ${totalPrice}€`;
        } else {
          totalPrice = service.basePrice;
          details = `${service.basePrice}€ forfait`;
        }
        break;
      
      default:
        // Prix par défaut × nombre de jours
        totalPrice = service.basePrice * durationDays;
        details = `${service.basePrice}€ × ${durationDays} jour${durationDays > 1 ? 's' : ''} = ${totalPrice}€`;
    }

    return { totalPrice, details };
  };

  const openServiceDialog = (service: Service) => {
    setSelectedService(service);
    setShowServiceDialog(true);
  };

  const handleBookService = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setBookingService(service);
      setBookingForm({
        startDate: '',
        endDate: '',
        timeSlot: '',
        location: '',
        notes: ''
      });
      setShowBookingDialog(true);
      setShowServiceDialog(false); // Fermer le dialog de détails s'il est ouvert
    }
  };

  const handleSubmitBooking = async () => {
    if (!bookingService || !clientId) return;

    try {
      setLoading(true);
      
      // Calculer la durée en jours
      const startDate = new Date(bookingForm.startDate);
      const endDate = new Date(bookingForm.endDate);
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calculer le prix total avec la durée du créneau
      const priceInfo = calculateTotalPrice(bookingService, bookingForm.startDate, bookingForm.endDate, bookingForm.timeSlot);
      const timeSlotHours = getTimeSlotDuration(bookingForm.timeSlot);
      
      const response = await fetch('/api/client/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId,
          providerId: bookingService.provider.id,
          serviceId: bookingService.id,
          startDate: bookingForm.startDate,
          endDate: bookingForm.endDate,
          timeSlot: bookingForm.timeSlot,
          location: bookingForm.location,
          notes: bookingForm.notes,
          durationDays: durationDays,
          timeSlotHours: timeSlotHours,
          totalPrice: priceInfo.totalPrice,
          priceBreakdown: priceInfo.details
        })
      });

      if (response.ok) {
        const result = await response.json();
        setShowBookingDialog(false);
        setBookingService(null);
        // Afficher un message de succès avec plus de détails
        alert(`Réservation créée avec succès !\n${priceInfo.details}\nVous recevrez une confirmation par email.`);
      } else {
        const error = await response.json();
        alert(`Erreur lors de la réservation: ${error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Erreur lors de la réservation. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && services.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des services...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Services disponibles</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Euro className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prix moyen</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averagePrice)}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fourchette de prix</p>
                  <p className="text-2xl font-bold">{stats.priceRange.min}€ - {stats.priceRange.max}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Catégories</p>
                  <p className="text-2xl font-bold">{stats.categoryBreakdown.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher des services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Rechercher un service, prestataire..."
                value={filters.search}
                onChange={(e) => handleSearch({ search: e.target.value })}
              />
            </div>
            <Select 
              value={filters.category} 
              onValueChange={(value) => handleSearch({ category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {serviceCategories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="priceMin">Prix min</Label>
                <Input
                  id="priceMin"
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => handleSearch({ priceMin: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="priceMax">Prix max</Label>
                <Input
                  id="priceMax"
                  type="number"
                  placeholder="1000"
                  value={filters.priceMax}
                  onChange={(e) => handleSearch({ priceMax: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Paris..."
                  value={filters.city}
                  onChange={(e) => handleSearch({ city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sortBy">Trier par</Label>
                <Select 
                  value={filters.sortBy} 
                  onValueChange={(value) => handleSearch({ sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sortOrder">Ordre</Label>
                <Select 
                  value={filters.sortOrder} 
                  onValueChange={(value) => handleSearch({ sortOrder: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Décroissant</SelectItem>
                    <SelectItem value="asc">Croissant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des services */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun service trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier vos critères de recherche
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const categoryInfo = getCategoryInfo(service.type);
              return (
                <Card key={service.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">
                            {categoryInfo.icon} {categoryInfo.label}
                          </Badge>
                          <span className="text-lg font-semibold text-primary">
                            {formatPrice(service.basePrice, service.priceUnit)}
                          </span>
                        </div>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {service.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Informations du prestataire */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {service.provider.user.avatar ? (
                          <img 
                            src={service.provider.user.avatar} 
                            alt={service.provider.user.name} 
                            className="w-10 h-10 rounded-full object-cover" 
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{service.provider.user.name}</p>
                        {service.provider.businessName && (
                          <p className="text-xs text-muted-foreground">{service.provider.businessName}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {service.provider.averageRating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{service.provider.averageRating.toFixed(1)}</span>
                            </div>
                          )}
                          <span>•</span>
                          <span>{service.completedBookings} missions</span>
                          {service.provider.user.city && (
                            <>
                              <span>•</span>
                              <span>{service.provider.user.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Détails du service */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      {service.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{service.duration} min</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Réservation {service.minAdvanceBooking}h à l'avance</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openServiceDialog(service)}
                      >
                        Voir détails
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleBookService(service.id)}
                      >
                        Réserver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog de détails du service */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedService && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getCategoryInfo(selectedService.type).icon}
                  {selectedService.name}
                </DialogTitle>
                <DialogDescription>
                  Par {selectedService.provider.user.name}
                  {selectedService.provider.businessName && ` - ${selectedService.provider.businessName}`}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedService.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Prix</h4>
                    <p className="text-lg font-semibold text-primary">
                      {formatPrice(selectedService.basePrice, selectedService.priceUnit)}
                    </p>
                  </div>
                  {selectedService.duration && (
                    <div>
                      <h4 className="font-medium mb-2">Durée</h4>
                      <p className="text-sm">{selectedService.duration} minutes</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Délais de réservation</h4>
                  <p className="text-sm text-muted-foreground">
                    Entre {selectedService.minAdvanceBooking}h et {selectedService.maxAdvanceBooking}h à l'avance
                  </p>
                </div>

                {selectedService.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Prérequis</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedService.requirements.map((req, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">À propos du prestataire</h4>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {selectedService.provider.user.avatar ? (
                        <img 
                          src={selectedService.provider.user.avatar} 
                          alt={selectedService.provider.user.name} 
                          className="w-12 h-12 rounded-full object-cover" 
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selectedService.provider.user.name}</p>
                      {selectedService.provider.businessName && (
                        <p className="text-sm text-muted-foreground">{selectedService.provider.businessName}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {selectedService.provider.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{selectedService.provider.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                        <span>•</span>
                        <span>{selectedService.provider.totalBookings} missions</span>
                      </div>
                    </div>
                  </div>
                  {selectedService.provider.description && (
                    <p className="text-sm text-muted-foreground">{selectedService.provider.description}</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowServiceDialog(false)}>
                  Fermer
                </Button>
                <Button onClick={() => handleBookService(selectedService.id)}>
                  Réserver ce service
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de réservation */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {bookingService && (
            <>
              <DialogHeader>
                <DialogTitle>Réserver : {bookingService.name}</DialogTitle>
                <DialogDescription>
                  Avec {bookingService.provider.user.name} - {formatPrice(bookingService.basePrice, bookingService.priceUnit)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="booking-start-date">Date de début *</Label>
                    <Input
                      id="booking-start-date"
                      type="date"
                      value={bookingForm.startDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, startDate: e.target.value }))}
                      min={new Date(Date.now() + bookingService.minAdvanceBooking * 60 * 60 * 1000).toISOString().split('T')[0]}
                      max={new Date(Date.now() + bookingService.maxAdvanceBooking * 60 * 60 * 1000).toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="booking-end-date">Date de fin *</Label>
                    <Input
                      id="booking-end-date"
                      type="date"
                      value={bookingForm.endDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, endDate: e.target.value }))}
                      min={bookingForm.startDate || new Date(Date.now() + bookingService.minAdvanceBooking * 60 * 60 * 1000).toISOString().split('T')[0]}
                      max={new Date(Date.now() + bookingService.maxAdvanceBooking * 60 * 60 * 1000).toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Réservation possible entre {bookingService.minAdvanceBooking}h et {bookingService.maxAdvanceBooking}h à l'avance
                  {bookingForm.startDate && bookingForm.endDate && (
                    <span className="font-medium text-primary ml-2">
                      • Durée : {Math.ceil((new Date(bookingForm.endDate).getTime() - new Date(bookingForm.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} jour(s)
                    </span>
                  )}
                </p>

                <div>
                  <Label htmlFor="booking-time">Créneau horaire *</Label>
                  <Select 
                    value={bookingForm.timeSlot} 
                    onValueChange={(value) => setBookingForm(prev => ({ ...prev, timeSlot: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un créneau" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Créneaux d'1 heure */}
                      <SelectItem value="09:00-10:00">09h00 - 10h00 (1h)</SelectItem>
                      <SelectItem value="10:00-11:00">10h00 - 11h00 (1h)</SelectItem>
                      <SelectItem value="11:00-12:00">11h00 - 12h00 (1h)</SelectItem>
                      <SelectItem value="14:00-15:00">14h00 - 15h00 (1h)</SelectItem>
                      <SelectItem value="15:00-16:00">15h00 - 16h00 (1h)</SelectItem>
                      <SelectItem value="16:00-17:00">16h00 - 17h00 (1h)</SelectItem>
                      <SelectItem value="17:00-18:00">17h00 - 18h00 (1h)</SelectItem>
                      
                      {/* Créneaux de 2 heures */}
                      <SelectItem value="09:00-11:00">09h00 - 11h00 (2h)</SelectItem>
                      <SelectItem value="10:00-12:00">10h00 - 12h00 (2h)</SelectItem>
                      <SelectItem value="14:00-16:00">14h00 - 16h00 (2h)</SelectItem>
                      <SelectItem value="15:00-17:00">15h00 - 17h00 (2h)</SelectItem>
                      <SelectItem value="16:00-18:00">16h00 - 18h00 (2h)</SelectItem>
                      
                      {/* Créneaux de 3 heures */}
                      <SelectItem value="09:00-12:00">09h00 - 12h00 (3h)</SelectItem>
                      <SelectItem value="14:00-17:00">14h00 - 17h00 (3h)</SelectItem>
                      <SelectItem value="15:00-18:00">15h00 - 18h00 (3h)</SelectItem>
                      
                      {/* Demi-journée (4 heures) */}
                      <SelectItem value="08:00-12:00">08h00 - 12h00 (Matinée - 4h)</SelectItem>
                      <SelectItem value="09:00-13:00">09h00 - 13h00 (Matinée - 4h)</SelectItem>
                      <SelectItem value="14:00-18:00">14h00 - 18h00 (Après-midi - 4h)</SelectItem>
                      <SelectItem value="15:00-19:00">15h00 - 19h00 (Après-midi - 4h)</SelectItem>
                      
                      {/* Journée complète (8 heures) */}
                      <SelectItem value="08:00-16:00">08h00 - 16h00 (Journée complète - 8h)</SelectItem>
                      <SelectItem value="09:00-17:00">09h00 - 17h00 (Journée complète - 8h)</SelectItem>
                      <SelectItem value="10:00-18:00">10h00 - 18h00 (Journée complète - 8h)</SelectItem>
                      
                      {/* Créneaux flexibles */}
                      <SelectItem value="flexible-morning">Flexible matinée (À convenir)</SelectItem>
                      <SelectItem value="flexible-afternoon">Flexible après-midi (À convenir)</SelectItem>
                      <SelectItem value="flexible-evening">Flexible soirée (À convenir)</SelectItem>
                      <SelectItem value="custom">Horaire personnalisé (À préciser dans les notes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="booking-location">Adresse d'intervention *</Label>
                  <Input
                    id="booking-location"
                    placeholder="123 rue de la Paix, 75001 Paris"
                    value={bookingForm.location}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="booking-notes">Instructions particulières</Label>
                  <Textarea
                    id="booking-notes"
                    placeholder="Détails supplémentaires, code d'accès, étage..."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                {bookingService.requirements.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Prérequis pour ce service :</h4>
                    <div className="flex flex-wrap gap-1">
                      {bookingService.requirements.map((req, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total estimé :</span>
                    <span className="text-lg font-bold text-primary">
                      {(() => {
                        const priceInfo = calculateTotalPrice(bookingService, bookingForm.startDate, bookingForm.endDate, bookingForm.timeSlot);
                        return priceInfo.totalPrice > 0 ? `${priceInfo.totalPrice}€` : formatPrice(bookingService.basePrice, bookingService.priceUnit);
                      })()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {(() => {
                      const priceInfo = calculateTotalPrice(bookingService, bookingForm.startDate, bookingForm.endDate, bookingForm.timeSlot);
                      return priceInfo.details;
                    })()}
                  </div>
                  {bookingForm.timeSlot && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Créneau sélectionné : {getTimeSlotDuration(bookingForm.timeSlot)}h par jour
                    </p>
                  )}
                  {bookingService.duration && (
                    <p className="text-sm text-muted-foreground">
                      Durée estimée du service : {bookingService.duration} minutes
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSubmitBooking}
                  disabled={!bookingForm.startDate || !bookingForm.endDate || !bookingForm.timeSlot || !bookingForm.location || loading}
                >
                  {loading ? 'Réservation...' : 'Confirmer la réservation'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 