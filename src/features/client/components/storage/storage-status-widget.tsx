"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  MapPin,
  QrCode,
  Calendar,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StorageRental {
  id: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  storageBox: {
    boxNumber: string;
    size: string;
    pricePerDay: number;
    location: {
      name: string;
      city: string;
    };
  };
}

export function StorageStatusWidget() {
  const [rentals, setRentals] = useState<StorageRental[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const response = await fetch("/api/client/storage-boxes/rentals");

      if (response.ok) {
        const data = await response.json();
        setRentals(data.rentals || []);
      }
    } catch (error) {
      console.error("Error fetching storage rentals:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeRentals = rentals.filter((rental) => rental.isActive);
  const expiringRentals = rentals.filter(
    (rental) =>
      rental.isActive &&
      rental.endDate &&
      new Date(rental.endDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000, // 7 jours
  );

  const getSizeLabel = (size: string) => {
    const labels = {
      SMALL: "Petit",
      MEDIUM: "Moyen",
      LARGE: "Grand",
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

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Mes Box de Stockage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeRentals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Box de Stockage
          </CardTitle>
          <CardDescription>Aucun box loué actuellement</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => router.push("/client/storage")}
            className="w-full"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Louer un box
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5" />
          Mes Box de Stockage
        </CardTitle>
        <CardDescription>
          {activeRentals.length} box(es) actuellement louée(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alertes pour les box qui expirent bientôt */}
        {expiringRentals.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-800 text-sm">
              <AlertCircle className="w-4 h-4" />
              {expiringRentals.length} box expire(nt) dans moins de 7 jours
            </div>
          </div>
        )}

        {/* Liste des box actives */}
        <div className="space-y-3">
          {activeRentals.slice(0, 3).map((rental) => (
            <div key={rental.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    Box {rental.storageBox.boxNumber}
                  </span>
                  <Badge className={getSizeBadgeColor(rental.storageBox.size)}>
                    {getSizeLabel(rental.storageBox.size)}
                  </Badge>
                </div>
                <span className="text-sm font-medium text-green-600">
                  {rental.storageBox.pricePerDay}€/jour
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>
                  {rental.storageBox.location.name},{" "}
                  {rental.storageBox.location.city}
                </span>
              </div>

              {rental.endDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Expire le{" "}
                    {new Date(rental.endDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => router.push("/client/storage")}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Gérer mes box
          </Button>
          {activeRentals.length < 3 && (
            <Button
              onClick={() => router.push("/client/storage")}
              size="sm"
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Louer un box
            </Button>
          )}
        </div>

        {activeRentals.length > 3 && (
          <div className="text-center text-sm text-gray-500">
            et {activeRentals.length - 3} autre(s) box...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
