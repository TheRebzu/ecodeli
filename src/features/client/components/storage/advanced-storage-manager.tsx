"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Package, MapPin, Clock, Calendar, Key, AlertCircle, CheckCircle, Search, Filter, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { loadStripe } from '@stripe/stripe-js';

interface AdvancedStorageManagerProps {
  clientId: string;
}

interface StorageBox {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  size: "small" | "medium" | "large" | "xl";
  type: "secure" | "refrigerated" | "standard" | "fragile";
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  availability: "available" | "occupied" | "maintenance" | "reserved";
  features: string[];
  maxWeight: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  accessHours: {
    start: string;
    end: string;
  };
  security: {
    camera: boolean;
    alarm: boolean;
    keypadAccess: boolean;
    biometric: boolean;
  };
  distance?: number;
}

interface StorageRental {
  id: string;
  storageBoxId: string;
  storageBox: StorageBox;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  status: "active" | "completed" | "cancelled" | "overdue";
  totalCost: number;
  accessCode: string;
  items: StorageItem[];
  paymentStatus: "paid" | "pending" | "overdue";
  autoExtend: boolean;
  notes?: string;
}

interface StorageItem {
  id: string;
  name: string;
  description?: string;
  value: number;
  fragile: boolean;
  category: string;
  addedAt: string;
  photo?: string;
}

interface RentalForm {
  storageBoxId: string;
  duration: number;
  durationType: "hours" | "days" | "weeks" | "months";
  startDate: string;
  startTime: string;
  autoExtend: boolean;
  items: Omit<StorageItem, "id" | "addedAt">[];
}

export default function AdvancedStorageManager({ clientId }: AdvancedStorageManagerProps) {
  const t = useTranslations("client.storage");
  const [storageBoxes, setStorageBoxes] = useState<StorageBox[]>([]);
  const [rentals, setRentals] = useState<StorageRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState("");
  const [filters, setFilters] = useState({
    size: "all",
    type: "all",
    maxPrice: "",
    maxDistance: ""
  });
  const [showRentDialog, setShowRentDialog] = useState(false);
  const [selectedBox, setSelectedBox] = useState<StorageBox | null>(null);
  
  const [rentalForm, setRentalForm] = useState<RentalForm>({
    storageBoxId: "",
    duration: 1,
    durationType: "days",
    startDate: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    autoExtend: false,
    items: []
  });

  const [newItem, setNewItem] = useState<Omit<StorageItem, "id" | "addedAt">>({
    name: "",
    description: "",
    value: 0,
    fragile: false,
    category: "other"
  });

  useEffect(() => {
    fetchStorageData();
    
    // Vérifier si on revient d'un paiement réussi
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const rentalId = urlParams.get('rentalId');
    
    if (success === 'true' && rentalId) {
      // Confirmer le paiement
      confirmPayment(rentalId);
    }
  }, [clientId]);

  const confirmPayment = async (rentalId: string) => {
    try {
      const response = await fetch(`/api/client/storage-boxes/rentals/${rentalId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Rafraîchir les données
        await fetchStorageData();
        alert('Paiement confirmé ! Votre location est maintenant active.');
        
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        console.error('Erreur lors de la confirmation du paiement');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  const fetchStorageData = async () => {
    try {
      const [boxesRes, rentalsRes] = await Promise.all([
        fetch(`/api/client/storage-boxes?clientId=${clientId}`),
        fetch(`/api/client/storage-boxes/rentals?clientId=${clientId}`)
      ]);

      if (boxesRes.ok) {
        const boxesData = await boxesRes.json();
        // Mapper les données de l'API vers le format attendu par l'interface
        const mappedBoxes = (boxesData.boxes || []).map((box: any) => {
          // Définir les dimensions et poids selon la taille
          const sizeConfig = {
            SMALL: { width: 60, height: 60, depth: 60, weight: 50 },
            MEDIUM: { width: 100, height: 100, depth: 100, weight: 100 },
            LARGE: { width: 150, height: 150, depth: 150, weight: 200 },
            EXTRA_LARGE: { width: 200, height: 200, depth: 200, weight: 500 }
          };
          
          const config = sizeConfig[box.size as keyof typeof sizeConfig] || sizeConfig.MEDIUM;
          
          return {
            id: box.id,
            name: box.boxNumber, // Utiliser le numéro de box comme nom
            address: box.location?.address || 'Adresse non disponible',
            latitude: box.location?.lat || 0,
            longitude: box.location?.lng || 0,
            size: box.size?.toLowerCase() || 'medium',
            type: 'standard', // Type par défaut
            hourlyRate: box.pricePerDay / 24, // Calculer le tarif horaire
            dailyRate: box.pricePerDay,
            weeklyRate: box.pricePerDay * 7,
            monthlyRate: box.pricePerDay * 30,
            availability: box.isAvailable ? 'available' : 'occupied',
            features: ['Sécurisé', 'Accès 24h/24'],
            maxWeight: config.weight,
            dimensions: {
              width: config.width,
              height: config.height,
              depth: config.depth
            },
            accessHours: {
              start: '00:00',
              end: '23:59'
            },
            security: {
              camera: true,
              alarm: true,
              keypadAccess: true,
              biometric: false
            },
            distance: undefined
          };
        });
        setStorageBoxes(mappedBoxes);
      }

      if (rentalsRes.ok) {
        const rentalsData = await rentalsRes.json();
        setRentals(rentalsData.rentals || []);
      }
    } catch (error) {
      console.error("Error fetching storage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchNearbyBoxes = async () => {
    if (!searchLocation.trim()) return;

    try {
      const response = await fetch(`/api/client/storage-boxes/nearby?location=${encodeURIComponent(searchLocation)}&clientId=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        // Mapper les données de la même façon
        const mappedBoxes = (data.boxes || []).map((box: any) => {
          // Définir les dimensions et poids selon la taille
          const sizeConfig = {
            SMALL: { width: 60, height: 60, depth: 60, weight: 50 },
            MEDIUM: { width: 100, height: 100, depth: 100, weight: 100 },
            LARGE: { width: 150, height: 150, depth: 150, weight: 200 },
            EXTRA_LARGE: { width: 200, height: 200, depth: 200, weight: 500 }
          };
          
          const config = sizeConfig[box.size as keyof typeof sizeConfig] || sizeConfig.MEDIUM;
          
          return {
            id: box.id,
            name: box.boxNumber,
            address: box.location?.address || 'Adresse non disponible',
            latitude: box.location?.lat || 0,
            longitude: box.location?.lng || 0,
            size: box.size?.toLowerCase() || 'medium',
            type: 'standard',
            hourlyRate: box.pricePerDay / 24,
            dailyRate: box.pricePerDay,
            weeklyRate: box.pricePerDay * 7,
            monthlyRate: box.pricePerDay * 30,
            availability: box.isAvailable ? 'available' : 'occupied',
            features: ['Sécurisé', 'Accès 24h/24'],
            maxWeight: config.weight,
            dimensions: {
              width: config.width,
              height: config.height,
              depth: config.depth
            },
            accessHours: {
              start: '00:00',
              end: '23:59'
            },
            security: {
              camera: true,
              alarm: true,
              keypadAccess: true,
              biometric: false
            },
            distance: box.distance
          };
        });
        setStorageBoxes(mappedBoxes);
      }
    } catch (error) {
      console.error("Error searching nearby boxes:", error);
    }
  };

  const handleRentBox = async () => {
    if (!selectedBox) return;

    try {
      const response = await fetch("/api/client/storage-boxes/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rentalForm,
          storageBoxId: selectedBox.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Si une URL Stripe Checkout est retournée
        if (data.url) {
          // Redirection automatique vers la page de paiement Stripe
          window.location.href = data.url;
        } else if (data.payment && data.payment.clientSecret) {
          // Ancien code pour PaymentIntent (gardé pour compatibilité)
          const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
          
          if (stripe) {
            const { error } = await stripe.confirmPayment({
              clientSecret: data.payment.clientSecret,
              confirmParams: {
                return_url: `${window.location.origin}/fr/client/storage?success=true`,
              },
            });

            if (error) {
              console.error('Erreur paiement Stripe:', error);
              alert('Erreur lors du paiement: ' + error.message);
            } else {
              // Paiement réussi
              await fetchStorageData();
              setShowRentDialog(false);
              setSelectedBox(null);
              setRentalForm({
                storageBoxId: "",
                duration: 1,
                durationType: "days",
                startDate: new Date().toISOString().split('T')[0],
                startTime: "09:00",
                autoExtend: false,
                items: []
              });
              alert('Location créée avec succès !');
            }
          }
        } else {
          // Pas de paiement requis (gratuit ou déjà payé)
          await fetchStorageData();
          setShowRentDialog(false);
          setSelectedBox(null);
          setRentalForm({
            storageBoxId: "",
            duration: 1,
            durationType: "days",
            startDate: new Date().toISOString().split('T')[0],
            startTime: "09:00",
            autoExtend: false,
            items: []
          });
          alert('Location créée avec succès !');
        }
      } else {
        const errorData = await response.json();
        alert('Erreur: ' + (errorData.error || 'Erreur lors de la création de la location'));
      }
    } catch (error) {
      console.error("Error renting storage box:", error);
      alert('Erreur lors de la création de la location');
    }
  };

  const handleExtendRental = async (rentalId: string, additionalDays: number) => {
    try {
      const response = await fetch(`/api/client/storage-boxes/rentals/${rentalId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalDays })
      });

      if (response.ok) {
        await fetchStorageData();
      }
    } catch (error) {
      console.error("Error extending rental:", error);
    }
  };

  const handleEndRental = async (rentalId: string) => {
    try {
      const response = await fetch(`/api/client/storage-boxes/rentals/${rentalId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId })
      });

      if (response.ok) {
        await fetchStorageData();
      }
    } catch (error) {
      console.error("Error ending rental:", error);
    }
  };

  const calculateTotalCost = (box: StorageBox, duration: number, durationType: string) => {
    switch (durationType) {
      case "hours":
        return box.hourlyRate * duration;
      case "days":
        return box.dailyRate * duration;
      case "weeks":
        return box.weeklyRate * duration;
      case "months":
        return box.monthlyRate * duration;
      default:
        return 0;
    }
  };

  const addItemToRental = () => {
    if (!newItem.name.trim()) return;

    setRentalForm({
      ...rentalForm,
      items: [...rentalForm.items, { ...newItem }]
    });

    setNewItem({
      name: "",
      description: "",
      value: 0,
      fragile: false,
      category: "other"
    });
  };

  const removeItemFromRental = (index: number) => {
    setRentalForm({
      ...rentalForm,
      items: rentalForm.items.filter((_, i) => i !== index)
    });
  };

  const getAvailabilityBadge = (availability: string) => {
    const config = {
      available: { color: "bg-green-100 text-green-800", label: t("availability.available") },
      occupied: { color: "bg-red-100 text-red-800", label: t("availability.occupied") },
      maintenance: { color: "bg-orange-100 text-orange-800", label: t("availability.maintenance") },
      reserved: { color: "bg-blue-100 text-blue-800", label: t("availability.reserved") }
    };

    const statusConfig = config[availability as keyof typeof config] || config.available;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: "bg-green-100 text-green-800", label: t("rental_status.active") },
      completed: { color: "bg-gray-100 text-gray-800", label: t("rental_status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("rental_status.cancelled") },
      overdue: { color: "bg-orange-100 text-orange-800", label: t("rental_status.overdue") }
    };

    const statusConfig = config[status as keyof typeof config] || config.active;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const getSizeBadge = (size: string) => {
    const config = {
      small: { color: "bg-blue-100 text-blue-800", label: t("sizes.small") },
      medium: { color: "bg-purple-100 text-purple-800", label: t("sizes.medium") },
      large: { color: "bg-orange-100 text-orange-800", label: t("sizes.large") },
      xl: { color: "bg-red-100 text-red-800", label: t("sizes.xl") }
    };

    const sizeConfig = config[size as keyof typeof config] || config.medium;
    return <Badge variant="outline" className={sizeConfig.color}>{sizeConfig.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const config = {
      secure: { color: "bg-green-100 text-green-800", label: t("types.secure") },
      refrigerated: { color: "bg-blue-100 text-blue-800", label: t("types.refrigerated") },
      standard: { color: "bg-gray-100 text-gray-800", label: t("types.standard") },
      fragile: { color: "bg-yellow-100 text-yellow-800", label: t("types.fragile") }
    };

    const typeConfig = config[type as keyof typeof config] || config.standard;
    return <Badge variant="outline" className={typeConfig.color}>{typeConfig.label}</Badge>;
  };

  const filteredBoxes = storageBoxes.filter(box => {
    if (filters.size !== "all" && box.size !== filters.size) return false;
    if (filters.type !== "all" && box.type !== filters.type) return false;
    if (filters.maxPrice && box.dailyRate > parseFloat(filters.maxPrice)) return false;
    if (filters.maxDistance && box.distance && box.distance > parseFloat(filters.maxDistance)) return false;
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

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">{t("tabs.available")}</TabsTrigger>
          <TabsTrigger value="my_rentals">{t("tabs.my_rentals")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
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
                    placeholder={t("search.location_placeholder")}
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>
                <Button onClick={searchNearbyBoxes}>
                  <Search className="h-4 w-4 mr-2" />
                  {t("search.search")}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={filters.size} onValueChange={(value) => setFilters({...filters, size: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("filters.size")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                    <SelectItem value="small">{t("sizes.small")}</SelectItem>
                    <SelectItem value="medium">{t("sizes.medium")}</SelectItem>
                    <SelectItem value="large">{t("sizes.large")}</SelectItem>
                    <SelectItem value="xl">{t("sizes.xl")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("filters.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                    <SelectItem value="secure">{t("types.secure")}</SelectItem>
                    <SelectItem value="refrigerated">{t("types.refrigerated")}</SelectItem>
                    <SelectItem value="standard">{t("types.standard")}</SelectItem>
                    <SelectItem value="fragile">{t("types.fragile")}</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder={t("filters.max_price")}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                />

                <Input
                  type="number"
                  placeholder={t("filters.max_distance")}
                  value={filters.maxDistance}
                  onChange={(e) => setFilters({...filters, maxDistance: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoxes.map((box) => (
              <Card key={box.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{box.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {box.address}
                        {box.distance && <span className="ml-2">({box.distance.toFixed(1)} km)</span>}
                      </CardDescription>
                    </div>
                    {getAvailabilityBadge(box.availability)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getSizeBadge(box.size)}
                    {getTypeBadge(box.type)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">{t("dimensions")}:</span>
                      <div>{box.dimensions?.width || 0}×{box.dimensions?.height || 0}×{box.dimensions?.depth || 0}cm</div>
                    </div>
                    <div>
                      <span className="text-gray-600">{t("max_weight")}:</span>
                      <div>{box.maxWeight || 0}kg</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">{t("hourly_rate")}:</span>
                      <div>€{box.hourlyRate}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">{t("daily_rate")}:</span>
                      <div>€{box.dailyRate}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{t("access_hours")}: {box.accessHours?.start || '00:00'} - {box.accessHours?.end || '23:59'}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(box.features || []).map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBox(box);
                        setRentalForm({...rentalForm, storageBoxId: box.id});
                      }}
                    >
                      {t("actions.view_details")}
                    </Button>
                    {box.availability === "available" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedBox(box);
                          setShowRentDialog(true);
                        }}
                      >
                        {t("actions.rent")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredBoxes.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_boxes.title")}</h3>
                <p className="text-gray-600 text-center">{t("empty_boxes.description")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my_rentals" className="space-y-4">
          {rentals.filter(r => r.status === "active").map((rental) => (
            <Card key={rental.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{rental.storageBox.name}</CardTitle>
                    <CardDescription>
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {rental.storageBox.address}
                    </CardDescription>
                  </div>
                  {getStatusBadge(rental.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span className="text-sm">{t("access_code")}: {rental.accessCode}</span>
                  </div>
                  <div className="text-sm">
                    {t("total_cost")}: €{rental.totalCost}
                  </div>
                </div>

                {rental.items.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">{t("stored_items")}:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {rental.items.map((item, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-gray-600">€{item.value}</div>
                          {item.fragile && <Badge variant="destructive" className="text-xs mt-1">Fragile</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        {t("actions.extend")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("extend_dialog.title")}</DialogTitle>
                        <DialogDescription>
                          {t("extend_dialog.description")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t("extend_dialog.additional_days")}</Label>
                          <Input type="number" min="1" defaultValue="1" id="extension-days" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => {
                          const days = parseInt((document.getElementById("extension-days") as HTMLInputElement)?.value || "1");
                          handleExtendRental(rental.id, days);
                        }}>
                          {t("extend_dialog.confirm")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleEndRental(rental.id)}
                  >
                    {t("actions.end_rental")}
                  </Button>
                </div>

                {rental.autoExtend && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    {t("auto_extend_enabled")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {rentals.filter(r => r.status === "active").length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("empty_rentals.title")}</h3>
                <p className="text-gray-600 text-center">{t("empty_rentals.description")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {rentals.filter(r => ["completed", "cancelled"].includes(r.status)).map((rental) => (
            <Card key={rental.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-semibold">{rental.storageBox.name}</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span>€{rental.totalCost}</span>
                    {getStatusBadge(rental.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {showRentDialog && selectedBox && (
        <Dialog open={showRentDialog} onOpenChange={setShowRentDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("rent_dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("rent_dialog.description", { name: selectedBox.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("rent_dialog.duration")}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={rentalForm.duration}
                    onChange={(e) => setRentalForm({...rentalForm, duration: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>{t("rent_dialog.duration_type")}</Label>
                  <Select value={rentalForm.durationType} onValueChange={(value) => setRentalForm({...rentalForm, durationType: value as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">{t("duration_types.hours")}</SelectItem>
                      <SelectItem value="days">{t("duration_types.days")}</SelectItem>
                      <SelectItem value="weeks">{t("duration_types.weeks")}</SelectItem>
                      <SelectItem value="months">{t("duration_types.months")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("rent_dialog.start_date")}</Label>
                  <Input
                    type="date"
                    value={rentalForm.startDate}
                    onChange={(e) => setRentalForm({...rentalForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t("rent_dialog.start_time")}</Label>
                  <Input
                    type="time"
                    value={rentalForm.startTime}
                    onChange={(e) => setRentalForm({...rentalForm, startTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={rentalForm.autoExtend}
                  onCheckedChange={(checked) => setRentalForm({...rentalForm, autoExtend: checked})}
                />
                <Label>{t("rent_dialog.auto_extend")}</Label>
              </div>

              <div>
                <h4 className="font-semibold mb-3">{t("rent_dialog.items_to_store")}</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder={t("rent_dialog.item_name")}
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                    <Input
                      type="number"
                      placeholder={t("rent_dialog.item_value")}
                      value={newItem.value}
                      onChange={(e) => setNewItem({...newItem, value: parseFloat(e.target.value)})}
                    />
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">{t("categories.electronics")}</SelectItem>
                        <SelectItem value="furniture">{t("categories.furniture")}</SelectItem>
                        <SelectItem value="clothing">{t("categories.clothing")}</SelectItem>
                        <SelectItem value="documents">{t("categories.documents")}</SelectItem>
                        <SelectItem value="other">{t("categories.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addItemToRental} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {rentalForm.items.length > 0 && (
                    <div className="space-y-2">
                      {rentalForm.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-sm text-gray-600 ml-2">€{item.value}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeItemFromRental(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-semibold">{t("rent_dialog.cost_breakdown")}</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t("rent_dialog.base_cost")}:</span>
                    <span>€{calculateTotalCost(selectedBox, rentalForm.duration, rentalForm.durationType).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>{t("rent_dialog.total")}:</span>
                    <span>€{calculateTotalCost(selectedBox, rentalForm.duration, rentalForm.durationType).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleRentBox}>
                {t("rent_dialog.confirm_rental")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}