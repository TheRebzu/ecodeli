"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Navigation, 
  Search, 
  Filter, 
  Truck, 
  Package, 
  Clock, 
  Euro,
  User,
  Phone,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import dynamic from 'next/dynamic';
import { api } from "@/trpc/react";
import { AnnouncementType, AnnouncementStatus } from "@prisma/client";

// Import dynamique de Leaflet pour éviter les problèmes SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface AnnouncementMapViewProps {
  userLocation?: { latitude: number; longitude: number };
  onAnnouncementSelect?: (announcement: MapAnnouncement) => void;
  showFilters?: boolean;
  maxDistance?: number;
}

interface MapAnnouncement {
  id: string;
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLocation: { latitude: number; longitude: number };
  deliveryLocation: { latitude: number; longitude: number };
  price: number;
  status: 'active' | 'assigned' | 'completed' | 'cancelled';
  urgency: 'low' | 'medium' | 'high';
  createdAt: Date;
  deadline: Date;
  clientName: string;
  clientPhone?: string;
  distance?: number;
  packageSize: 'small' | 'medium' | 'large';
  vehicleType: 'bike' | 'scooter' | 'car' | 'van';
}

export default function AnnouncementMapView({ 
  userLocation, 
  onAnnouncementSelect,
  showFilters = true,
  maxDistance = 50
}: AnnouncementMapViewProps) {
  const t = useTranslations("announcements");
  const [announcements, setAnnouncements] = useState<MapAnnouncement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<MapAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(userLocation);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all");
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>("all");
  const [distanceFilter, setDistanceFilter] = useState<number>(maxDistance);

  // Utiliser tRPC pour récupérer les annonces
  const { data: announcementsData, error, isLoading, refetch } = api.announcement.getAll.useQuery({
    limit: 100,
    status: selectedStatus !== "all" ? selectedStatus as AnnouncementStatus : undefined,
    includeLocation: true,
    maxDistance: currentLocation ? distanceFilter : undefined,
    userLatitude: currentLocation?.latitude,
    userLongitude: currentLocation?.longitude
  });

  // Charger les annonces depuis l'API
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(isLoading);
        
        if (error) {
          console.error("Erreur lors du chargement des annonces:", error);
          toast.error(t("map.errorLoading"));
          return;
        }

        if (announcementsData?.items) {
          // Transformer les données de l'API en format MapAnnouncement
          const mappedAnnouncements: MapAnnouncement[] = announcementsData.items.map(announcement => ({
            id: announcement.id,
            title: announcement.title,
            description: announcement.description || "",
            pickupAddress: announcement.pickupAddress,
            deliveryAddress: announcement.deliveryAddress,
            pickupLocation: { 
              latitude: announcement.pickupLatitude, 
              longitude: announcement.pickupLongitude 
            },
            deliveryLocation: { 
              latitude: announcement.deliveryLatitude, 
              longitude: announcement.deliveryLongitude 
            },
            price: announcement.suggestedPrice || 0,
            status: mapAnnouncementStatus(announcement.status),
            urgency: announcement.priority === "HIGH" ? "high" : 
                    announcement.priority === "MEDIUM" ? "medium" : "low",
            createdAt: new Date(announcement.createdAt),
            deadline: announcement.deliveryDate ? new Date(announcement.deliveryDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
            clientName: announcement.client?.name || "Client anonyme",
            clientPhone: announcement.client?.phoneNumber,
            packageSize: getPackageSize(announcement.weight, announcement.width, announcement.height, announcement.length),
            vehicleType: getVehicleType(announcement.type),
            distance: announcement.distance
          }));

          // Calculer les distances si position utilisateur disponible
          if (currentLocation) {
            mappedAnnouncements.forEach(announcement => {
              if (!announcement.distance) {
                const distance = calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  announcement.pickupLocation.latitude,
                  announcement.pickupLocation.longitude
                );
                announcement.distance = distance;
              }
            });
          }

          setAnnouncements(mappedAnnouncements);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des annonces:", error);
        toast.error(t("map.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, [announcementsData, error, isLoading, currentLocation, t]);

  // Fonction pour mapper le statut de l'annonce
  const mapAnnouncementStatus = (status: AnnouncementStatus): 'active' | 'assigned' | 'completed' | 'cancelled' => {
    switch (status) {
      case 'PUBLISHED':
      case 'DRAFT':
        return 'active';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'assigned';
      case 'DELIVERED':
      case 'COMPLETED':
      case 'PAID':
        return 'completed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'active';
    }
  };

  // Fonction pour déterminer la taille du colis
  const getPackageSize = (weight?: number, width?: number, height?: number, length?: number): 'small' | 'medium' | 'large' => {
    if (!weight && !width && !height && !length) return 'medium';
    
    const volume = (width || 0) * (height || 0) * (length || 0);
    const w = weight || 0;
    
    if (w < 5 && volume < 1000) return 'small';
    if (w < 20 && volume < 10000) return 'medium';
    return 'large';
  };

  // Fonction pour déterminer le type de véhicule
  const getVehicleType = (type: AnnouncementType): 'bike' | 'scooter' | 'car' | 'van' => {
    switch (type) {
      case 'URGENT':
        return 'scooter';
      case 'FRAGILE':
        return 'car';
      case 'BULK':
        return 'van';
      default:
        return 'bike';
    }
  };

  // Calculer la distance entre deux points (formule de Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Obtenir la géolocalisation de l'utilisateur
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success(t("map.locationFound"));
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          toast.error(t("map.locationError"));
        }
      );
    } else {
      toast.error(t("map.geolocationNotSupported"));
    }
  }, [t]);

  // Filtrer les annonces
  useEffect(() => {
    let filtered = announcements;

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(announcement => 
        announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (selectedStatus !== "all") {
      filtered = filtered.filter(announcement => announcement.status === selectedStatus);
    }

    // Filtre par urgence
    if (selectedUrgency !== "all") {
      filtered = filtered.filter(announcement => announcement.urgency === selectedUrgency);
    }

    // Filtre par type de véhicule
    if (selectedVehicleType !== "all") {
      filtered = filtered.filter(announcement => announcement.vehicleType === selectedVehicleType);
    }

    // Filtre par distance
    if (currentLocation) {
      filtered = filtered.filter(announcement => 
        !announcement.distance || announcement.distance <= distanceFilter
      );
    }

    setFilteredAnnouncements(filtered);
  }, [announcements, searchTerm, selectedStatus, selectedUrgency, selectedVehicleType, distanceFilter, currentLocation]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'bike': return '🚲';
      case 'scooter': return '🛵';
      case 'car': return '🚗';
      case 'van': return '🚐';
      default: return '📦';
    }
  };

  const getMapIcon = (announcement: MapAnnouncement) => {
    // Créer une icône personnalisée basée sur l'urgence
    const color = announcement.urgency === 'high' ? 'red' : 
                 announcement.urgency === 'medium' ? 'orange' : 'green';
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.9 12.5 28.5 12.5 28.5S25 23.4 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="7" fill="white"/>
        <text x="12.5" y="16" text-anchor="middle" font-size="12" fill="${color}">€</text>
      </svg>
    `)}`;
  };

  // Position par défaut (Paris)
  const defaultCenter = currentLocation || { latitude: 48.8566, longitude: 2.3522 };

  return (
    <div className="w-full h-full">
      {/* Filtres */}
      {showFilters && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t("map.filters")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Input
                  placeholder={t("map.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t("map.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("map.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("status.active")}</SelectItem>
                  <SelectItem value="assigned">{t("status.assigned")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
                <SelectTrigger>
                  <SelectValue placeholder={t("map.allUrgencies")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("map.allUrgencies")}</SelectItem>
                  <SelectItem value="high">{t("urgency.high")}</SelectItem>
                  <SelectItem value="medium">{t("urgency.medium")}</SelectItem>
                  <SelectItem value="low">{t("urgency.low")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("map.allVehicles")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("map.allVehicles")}</SelectItem>
                  <SelectItem value="bike">{t("vehicle.bike")}</SelectItem>
                  <SelectItem value="scooter">{t("vehicle.scooter")}</SelectItem>
                  <SelectItem value="car">{t("vehicle.car")}</SelectItem>
                  <SelectItem value="van">{t("vehicle.van")}</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={getUserLocation} variant="outline" className="w-full">
                <Navigation className="h-4 w-4 mr-2" />
                {t("map.getLocation")}
              </Button>
            </div>

            {currentLocation && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  {t("map.maxDistance")}: {distanceFilter}km
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={distanceFilter}
                  onChange={(e) => setDistanceFilter(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Carte */}
      <Card className="flex-1">
        <CardContent className="p-0">
          <div className="h-[600px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <MapContainer
                center={[defaultCenter.latitude, defaultCenter.longitude]}
                zoom={13}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Marqueur de position utilisateur */}
                {currentLocation && (
                  <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
                    <Popup>
                      <div className="text-center">
                        <strong>{t("map.yourLocation")}</strong>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Marqueurs des annonces */}
                {filteredAnnouncements.map((announcement) => (
                  <React.Fragment key={announcement.id}>
                    {/* Marqueur de collecte */}
                    <Marker position={[announcement.pickupLocation.latitude, announcement.pickupLocation.longitude]}>
                      <Popup>
                        <div className="min-w-[300px] p-2">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">{announcement.title}</h3>
                            <Badge className={cn("text-xs", getUrgencyColor(announcement.urgency))}>
                              {t(`urgency.${announcement.urgency}`)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{announcement.description}</p>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span><strong>{t("map.pickup")}:</strong> {announcement.pickupAddress}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-600" />
                              <span><strong>{t("map.delivery")}:</strong> {announcement.deliveryAddress}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Euro className="h-4 w-4 text-blue-600" />
                              <span><strong>{t("map.price")}:</strong> {announcement.price.toFixed(2)}€</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span><strong>{t("map.deadline")}:</strong> {format(announcement.deadline, "PPP à HH:mm", { locale: fr })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-purple-600" />
                              <span><strong>{t("map.vehicle")}:</strong> {getVehicleIcon(announcement.vehicleType)} {t(`vehicle.${announcement.vehicleType}`)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-indigo-600" />
                              <span><strong>{t("map.client")}:</strong> {announcement.clientName}</span>
                            </div>
                            {announcement.distance && (
                              <div className="flex items-center gap-2">
                                <Navigation className="h-4 w-4 text-teal-600" />
                                <span><strong>{t("map.distance")}:</strong> {announcement.distance.toFixed(1)} km</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <Button 
                              size="sm" 
                              onClick={() => onAnnouncementSelect?.(announcement)}
                              className="flex-1"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              {t("map.viewDetails")}
                            </Button>
                            {announcement.clientPhone && (
                              <Button size="sm" variant="outline">
                                <Phone className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Marqueur de livraison */}
                    <Marker position={[announcement.deliveryLocation.latitude, announcement.deliveryLocation.longitude]}>
                      <Popup>
                        <div className="text-center">
                          <strong>{t("map.deliveryPoint")}</strong><br />
                          {announcement.deliveryAddress}
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                ))}
              </MapContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t("map.totalAnnouncements")}</p>
                <p className="text-2xl font-bold">{filteredAnnouncements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">{t("map.urgentAnnouncements")}</p>
                <p className="text-2xl font-bold">
                  {filteredAnnouncements.filter(a => a.urgency === 'high').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t("map.averagePrice")}</p>
                <p className="text-2xl font-bold">
                  {filteredAnnouncements.length > 0 
                    ? (filteredAnnouncements.reduce((sum, a) => sum + a.price, 0) / filteredAnnouncements.length).toFixed(2)
                    : "0.00"
                  }€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
