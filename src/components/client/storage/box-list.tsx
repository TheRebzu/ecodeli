"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  MapPin, 
  Calendar, 
  Euro,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  Plus
} from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface StorageBox {
  id: string;
  size: string;
  dailyPrice: number;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
  warehouse: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
  reservation?: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
  } | null;
}

interface BoxReservation {
  id: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: string;
  box: {
    id: string;
    size: string;
    warehouse: {
      name: string;
      address: string;
    };
  };
}

export default function BoxList() {
  const t = useTranslations("storage.boxes");
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("available");

  // Récupération des boxes disponibles
  const { data: availableBoxes, isLoading: loadingAvailable } = api.clientStorageBoxes.searchAvailableBoxes.useQuery({
    size: sizeFilter === "all" ? undefined : sizeFilter,
    city: searchTerm || undefined
  });

  // Récupération des réservations actives du client
  const { data: clientReservations, isLoading: loadingReservations } = api.client.storage.getActiveBoxes.useQuery();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return {
          label: t("status.available"),
          color: "bg-green-100 text-green-800",
          icon: CheckCircle
        };
      case "OCCUPIED":
        return {
          label: t("status.occupied"),
          color: "bg-red-100 text-red-800",
          icon: Package
        };
      case "RESERVED":
        return {
          label: t("status.reserved"),
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock
        };
      case "MAINTENANCE":
        return {
          label: t("status.maintenance"),
          color: "bg-orange-100 text-orange-800",
          icon: AlertTriangle
        };
      default:
        return {
          label: t("status.unknown"),
          color: "bg-gray-100 text-gray-800",
          icon: Package
        };
    }
  };

  const getSizeLabel = (size: string) => {
    switch (size) {
      case "SMALL": return t("sizes.small");
      case "MEDIUM": return t("sizes.medium");
      case "LARGE": return t("sizes.large");
      case "EXTRA_LARGE": return t("sizes.extraLarge");
      default: return size;
    }
  };

  const handleReserveBox = (boxId: string) => {
    router.push(`/client/storage/${boxId}/reserve`);
  };

  const handleViewReservation = (reservationId: string) => {
    router.push(`/client/storage/reservations/${reservationId}`);
  };

  const filteredAvailableBoxes = availableBoxes?.filter((box: StorageBox) => {
    const matchesSearch = box.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         box.warehouse.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const AvailableBoxCard = ({ box }: { box: StorageBox }) => {
    const statusConfig = getStatusConfig(box.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{getSizeLabel(box.size)}</CardTitle>
              <CardDescription>{box.warehouse.name}</CardDescription>
            </div>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{box.warehouse.address}, {box.warehouse.city}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{box.dailyPrice.toFixed(2)}€ / {t("perDay")}</span>
            </div>
            <Button 
              size="sm" 
              onClick={() => handleReserveBox(box.id)}
              disabled={box.status !== "AVAILABLE"}
            >
              {t("actions.reserve")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ReservationCard = ({ reservation }: { reservation: BoxReservation }) => {
    const isActive = new Date(reservation.endDate) > new Date();
    const daysLeft = Math.ceil((new Date(reservation.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{getSizeLabel(reservation.box.size)}</CardTitle>
              <CardDescription>{reservation.box.warehouse.name}</CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? t("active") : t("expired")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{reservation.box.warehouse.address}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{t("startDate")}</p>
                <p className="text-muted-foreground">
                  {format(reservation.startDate, "dd MMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{t("endDate")}</p>
                <p className="text-muted-foreground">
                  {format(reservation.endDate, "dd MMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          {isActive && daysLeft <= 7 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                {t("expiryWarning", { days: daysLeft })}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{reservation.totalPrice.toFixed(2)}€</span>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleViewReservation(reservation.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {t("actions.view")}
              </Button>
              {isActive && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/client/storage/reservations/${reservation.id}/extend`)}
                >
                  {t("actions.extend")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Filtres */}
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
        <Select value={sizeFilter} onValueChange={setSizeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("filterBySize")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("sizes.all")}</SelectItem>
            <SelectItem value="SMALL">{t("sizes.small")}</SelectItem>
            <SelectItem value="MEDIUM">{t("sizes.medium")}</SelectItem>
            <SelectItem value="LARGE">{t("sizes.large")}</SelectItem>
            <SelectItem value="EXTRA_LARGE">{t("sizes.extraLarge")}</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline"
          onClick={() => router.push("/client/storage/search")}
        >
          {t("advancedSearch")}
        </Button>
      </div>

      {/* Onglets */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "available" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("available")}
        >
          {t("tabs.available")}
        </Button>
        <Button
          variant={activeTab === "myReservations" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("myReservations")}
        >
          {t("tabs.myReservations")}
        </Button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === "available" && (
        <div className="space-y-4">
          {loadingAvailable ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAvailableBoxes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAvailableBoxes.map((box) => (
                <AvailableBoxCard key={box.id} box={box} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noBoxes")}</h3>
                <p className="text-muted-foreground mb-4">{t("noBoxesDescription")}</p>
                <Button onClick={() => router.push("/client/storage/search")}>
                  {t("actions.searchOther")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "myReservations" && (
        <div className="space-y-4">
          {loadingReservations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : clientReservations && clientReservations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("noReservations")}</h3>
                <p className="text-muted-foreground mb-4">{t("noReservationsDescription")}</p>
                <Button onClick={() => setActiveTab("available")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("actions.reserveFirst")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
