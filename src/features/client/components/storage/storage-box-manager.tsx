"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  MapPin,
  Clock,
  Euro,
  QrCode,
  Calendar,
  Search,
  Filter,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Plus,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StorageBox {
  id: string;
  boxNumber: string;
  size: "SMALL" | "MEDIUM" | "LARGE";
  pricePerDay: number;
  isAvailable: boolean;
  location: {
    id: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
    lat: number;
    lng: number;
    openingHours?: any[];
  };
  distance?: number;
}

interface StorageRental {
  id: string;
  startDate: Date;
  endDate?: Date;
  accessCode: string;
  totalPrice?: number;
  isPaid: boolean;
  isActive: boolean;
  qrCode?: string;
  storageBox: {
    boxNumber: string;
    size: string;
    pricePerDay: number;
    location: {
      name: string;
      address: string;
      city: string;
      openingHours?: any[];
    };
  };
}

interface RentalFormData {
  storageBoxId: string;
  startDate: string;
  endDate?: string;
  duration?: number;
}

export function StorageBoxManager() {
  const t = useTranslations("client.storage");

  const [availableBoxes, setAvailableBoxes] = useState<StorageBox[]>([]);
  const [userRentals, setUserRentals] = useState<StorageRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState<StorageBox | null>(null);
  const [selectedRental, setSelectedRental] = useState<StorageRental | null>(
    null,
  );
  const [showRentalDialog, setShowRentalDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Filtres
  const [filters, setFilters] = useState({
    city: "",
    size: "all",
    maxPrice: "",
    sortBy: "distance",
  });

  // Formulaire de location
  const [rentalForm, setRentalForm] = useState<RentalFormData>({
    storageBoxId: "",
    startDate: "",
    endDate: "",
    duration: 1,
  });

  useEffect(() => {
    loadData();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyBoxes();
    }
  }, [userLocation, filters]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation not available:", error);
          // Fallback: charger tous les box
          loadAvailableBoxes();
        },
      );
    } else {
      loadAvailableBoxes();
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([loadUserRentals()]);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadNearbyBoxes = async () => {
    if (!userLocation) return;

    try {
      const params = new URLSearchParams({
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        radius: "20",
      });

      if (filters.city) params.append("city", filters.city);
      if (filters.size && filters.size !== "all") params.append("size", filters.size);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);

      const response = await fetch(
        `/api/client/storage-boxes/nearby?${params}`,
      );

      if (response.ok) {
        const data = await response.json();
        let boxes = data.boxes;

        // Tri
        if (filters.sortBy === "price") {
          boxes.sort(
            (a: StorageBox, b: StorageBox) => a.pricePerDay - b.pricePerDay,
          );
        } else if (filters.sortBy === "size") {
          const sizeOrder = { SMALL: 1, MEDIUM: 2, LARGE: 3 };
          boxes.sort(
            (a: StorageBox, b: StorageBox) =>
              (sizeOrder[a.size] || 0) - (sizeOrder[b.size] || 0),
          );
        }
        // Par défaut: tri par distance (déjà fait côté serveur)

        setAvailableBoxes(boxes);
      }
    } catch (error) {
      console.error("Error loading nearby boxes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBoxes = async () => {
    try {
      const params = new URLSearchParams();

      if (filters.city) params.append("city", filters.city);
      if (filters.size && filters.size !== "all") params.append("size", filters.size);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);

      const response = await fetch(`/api/client/storage-boxes?${params}`);

      if (response.ok) {
        const data = await response.json();
        setAvailableBoxes(data.boxes);
      }
    } catch (error) {
      console.error("Error loading available boxes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRentals = async () => {
    try {
      const response = await fetch("/api/client/storage-boxes/rentals");

      if (response.ok) {
        const data = await response.json();
        setUserRentals(data.rentals);
      }
    } catch (error) {
      console.error("Error loading user rentals:", error);
    }
  };

  const handleRentBox = async () => {
    if (!selectedBox) return;

    try {
      const startDate = new Date(rentalForm.startDate);
      let endDate: Date | undefined;

      if (rentalForm.endDate) {
        endDate = new Date(rentalForm.endDate);
      } else if (rentalForm.duration) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + rentalForm.duration);
      }

      const response = await fetch("/api/client/storage-boxes/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageBoxId: selectedBox.id,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Actualiser les données
        await loadData();
        if (userLocation) {
          await loadNearbyBoxes();
        } else {
          await loadAvailableBoxes();
        }

        setShowRentalDialog(false);
        setSelectedBox(null);
        setRentalForm({
          storageBoxId: "",
          startDate: "",
          endDate: "",
          duration: 1,
        });

        // Afficher le QR code de la nouvelle location
        if (data.rental) {
          setSelectedRental(data.rental);
          setShowQRDialog(true);
        }
      } else {
        const error = await response.json();
        console.error("Error renting box:", error.message);
      }
    } catch (error) {
      console.error("Error renting box:", error);
    }
  };

  const handleExtendRental = async (rentalId: string, newEndDate: Date) => {
    try {
      const response = await fetch(
        `/api/client/storage-boxes/rentals/${rentalId}/extend`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newEndDate: newEndDate.toISOString(),
          }),
        },
      );

      if (response.ok) {
        await loadUserRentals();
      }
    } catch (error) {
      console.error("Error extending rental:", error);
    }
  };

  const getSizeLabel = (size: string) => {
    const labels = {
      SMALL: "Petit (50x50x50 cm)",
      MEDIUM: "Moyen (80x80x80 cm)",
      LARGE: "Grand (120x80x80 cm)",
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getSizeBadgeColor = (size: string) => {
    const colors = {
      SMALL: "bg-green-100 text-green-800",
      MEDIUM: "bg-blue-100 text-blue-800",
      LARGE: "bg-purple-100 text-purple-800",
    };
    return colors[size as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatOpeningHours = (hours: any[]) => {
    if (!hours || hours.length === 0) return "Horaires non définis";

    const today = new Date().getDay();
    const todayHours = hours.find((h) => h.day === today);

    if (todayHours) {
      return `Aujourd'hui : ${todayHours.open} - ${todayHours.close}`;
    }

    return "Voir les horaires détaillés";
  };

  const calculateTotalPrice = () => {
    if (!selectedBox || !rentalForm.startDate) return 0;

    let days = rentalForm.duration || 1;

    if (rentalForm.endDate) {
      const start = new Date(rentalForm.startDate);
      const end = new Date(rentalForm.endDate);
      days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return days * selectedBox.pricePerDay;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold">Mes Box de Stockage</h1>
        <p className="text-gray-600 mt-1">
          Gérez vos locations de box de stockage temporaire
        </p>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Box disponibles ({availableBoxes.length})
          </TabsTrigger>
          <TabsTrigger value="rentals" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Mes locations ({userRentals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtres de recherche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    placeholder="Paris..."
                    value={filters.city}
                    onChange={(e) =>
                      setFilters({ ...filters, city: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="size">Taille</Label>
                  <Select
                    value={filters.size}
                    onValueChange={(value) =>
                      setFilters({ ...filters, size: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les tailles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les tailles</SelectItem>
                      <SelectItem value="SMALL">Petit</SelectItem>
                      <SelectItem value="MEDIUM">Moyen</SelectItem>
                      <SelectItem value="LARGE">Grand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxPrice">Prix max/jour (€)</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="50"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="sortBy">Trier par</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) =>
                      setFilters({ ...filters, sortBy: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">Distance</SelectItem>
                      <SelectItem value="price">Prix</SelectItem>
                      <SelectItem value="size">Taille</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des box disponibles */}
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableBoxes.map((box) => (
                <Card
                  key={box.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Box {box.boxNumber}
                      </CardTitle>
                      <Badge className={getSizeBadgeColor(box.size)}>
                        {getSizeLabel(box.size).split(" ")[0]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Localisation */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">{box.location.name}</div>
                        <div className="text-gray-600">
                          {box.location.address}, {box.location.city}
                        </div>
                        {box.distance && (
                          <div className="text-blue-600">
                            À {box.distance.toFixed(1)} km de vous
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Prix */}
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-500" />
                      <span className="font-bold text-lg text-green-600">
                        {box.pricePerDay}€
                      </span>
                      <span className="text-sm text-gray-600">/jour</span>
                    </div>

                    {/* Horaires */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {formatOpeningHours(box.location.openingHours)}
                      </span>
                    </div>

                    {/* Dimensions */}
                    <div className="text-sm text-gray-600">
                      {getSizeLabel(box.size)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setSelectedBox(box);
                          setRentalForm({
                            ...rentalForm,
                            storageBoxId: box.id,
                          });
                          setShowRentalDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Louer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Ouvrir dans Maps
                          window.open(
                            `https://maps.google.com/?q=${box.location.lat},${box.location.lng}`,
                            "_blank",
                          );
                        }}
                      >
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && availableBoxes.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun box disponible
              </h3>
              <p className="text-gray-600">
                Aucun box de stockage ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rentals" className="space-y-6">
          {/* Mes locations */}
          <div className="space-y-4">
            {userRentals.map((rental) => (
              <Card
                key={rental.id}
                className={`${rental.isActive ? "border-green-200" : "border-gray-200"}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-lg">
                          Box {rental.storageBox.boxNumber}
                        </h3>
                        <Badge
                          className={getSizeBadgeColor(rental.storageBox.size)}
                        >
                          {getSizeLabel(rental.storageBox.size).split(" ")[0]}
                        </Badge>
                        {rental.isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">Terminée</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-700">Lieu</div>
                          <div>{rental.storageBox.location.name}</div>
                          <div className="text-gray-600">
                            {rental.storageBox.location.address},{" "}
                            {rental.storageBox.location.city}
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-gray-700">
                            Période
                          </div>
                          <div>
                            Du{" "}
                            {format(new Date(rental.startDate), "dd/MM/yyyy", {
                              locale: fr,
                            })}
                          </div>
                          {rental.endDate && (
                            <div>
                              Au{" "}
                              {format(new Date(rental.endDate), "dd/MM/yyyy", {
                                locale: fr,
                              })}
                            </div>
                          )}
                          {!rental.endDate && (
                            <div className="text-blue-600">En cours</div>
                          )}
                        </div>

                        <div>
                          <div className="font-medium text-gray-700">Prix</div>
                          <div className="text-lg font-bold text-green-600">
                            {rental.totalPrice
                              ? `${rental.totalPrice}€`
                              : `${rental.storageBox.pricePerDay}€/jour`}
                          </div>
                          {!rental.isPaid && rental.totalPrice && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Impayé
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {rental.isActive && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedRental(rental);
                            setShowQRDialog(true);
                          }}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR Code
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            const newEndDate = prompt(
                              "Nouvelle date de fin (YYYY-MM-DD):",
                            );
                            if (newEndDate) {
                              handleExtendRental(
                                rental.id,
                                new Date(newEndDate),
                              );
                            }
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Prolonger
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {userRentals.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune location
              </h3>
              <p className="text-gray-600">
                Vous n'avez encore aucun box de stockage loué.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de location */}
      <Dialog open={showRentalDialog} onOpenChange={setShowRentalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Louer un box de stockage</DialogTitle>
          </DialogHeader>

          {selectedBox && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold">Box {selectedBox.boxNumber}</h3>
                <p className="text-sm text-gray-600">
                  {selectedBox.location.name}
                </p>
                <p className="text-sm text-gray-600">
                  {getSizeLabel(selectedBox.size)}
                </p>
                <p className="font-bold text-green-600">
                  {selectedBox.pricePerDay}€/jour
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={rentalForm.startDate}
                    onChange={(e) =>
                      setRentalForm({
                        ...rentalForm,
                        startDate: e.target.value,
                      })
                    }
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <Label>Durée</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Nombre de jours"
                      value={rentalForm.duration}
                      onChange={(e) =>
                        setRentalForm({
                          ...rentalForm,
                          duration: parseInt(e.target.value),
                          endDate: "",
                        })
                      }
                      min="1"
                    />
                    <span className="self-center text-sm text-gray-600">
                      jours
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-sm text-gray-600">ou</span>
                </div>

                <div>
                  <Label htmlFor="endDate">Date de fin précise</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={rentalForm.endDate}
                    onChange={(e) =>
                      setRentalForm({
                        ...rentalForm,
                        endDate: e.target.value,
                        duration: undefined,
                      })
                    }
                    min={
                      rentalForm.startDate ||
                      new Date().toISOString().split("T")[0]
                    }
                  />
                </div>

                {rentalForm.startDate && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Prix total :</span>
                      <span className="text-xl font-bold text-green-600">
                        {calculateTotalPrice()}€
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRentalDialog(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRentBox}
                  disabled={
                    !rentalForm.startDate ||
                    (!rentalForm.duration && !rentalForm.endDate)
                  }
                >
                  Confirmer la location
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog QR Code */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Code d'accès QR
            </DialogTitle>
          </DialogHeader>

          {selectedRental && (
            <div className="space-y-4 text-center">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold">
                  Box {selectedRental.storageBox.boxNumber}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedRental.storageBox.location.name}
                </p>
              </div>

              {selectedRental.qrCode && (
                <div className="flex justify-center">
                  <img
                    src={selectedRental.qrCode}
                    alt="QR Code d'accès"
                    className="w-64 h-64 border rounded-lg"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="font-mono text-lg bg-gray-100 p-2 rounded">
                  {selectedRental.accessCode}
                </div>
                <p className="text-sm text-gray-600">
                  Code d'accès manuel (si le QR ne fonctionne pas)
                </p>
              </div>

              <Alert>
                <Smartphone className="w-4 h-4" />
                <AlertDescription>
                  Présentez ce QR code devant le lecteur du box pour l'ouvrir.
                  Le code d'accès est valide jusqu'à la fin de votre location.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Télécharger le QR code
                    if (selectedRental.qrCode) {
                      const link = document.createElement("a");
                      link.href = selectedRental.qrCode;
                      link.download = `qr-code-box-${selectedRental.storageBox.boxNumber}.png`;
                      link.click();
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setShowQRDialog(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
