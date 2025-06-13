"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  Star,
  Clock,
  MapPin,
  Euro,
  Calendar,
  Users,
  TrendingUp,
  Pause,
  Play,
  Settings,
} from "lucide-react";

// Types
interface Service {
  id: string;
  title: string;
  description?: string;
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  price: number;
  priceType: "FIXED" | "HOURLY" | "DAILY" | "CUSTOM";
  duration: number;
  location: "AT_CUSTOMER" | "AT_PROVIDER" | "REMOTE" | "FLEXIBLE";
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";
  images?: string[];
  rating: number;
  totalReviews: number;
  totalBookings: number;
  monthlyRevenue: number;
  isEmergencyService: boolean;
  requiresEquipment: boolean;
  maxClients: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceCardProps {
  service: Service;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleStatus?: (id: string, active: boolean) => void;
  onViewAnalytics?: (id: string) => void;
}

export function ServiceCard({
  service,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  onViewAnalytics,
}: ServiceCardProps) {
  const t = useTranslations("providerServices");
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "SUSPENDED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case "AT_CUSTOMER":
        return <MapPin className="h-3 w-3" />;
      case "AT_PROVIDER":
        return <Users className="h-3 w-3" />;
      case "REMOTE":
        return <Settings className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  };

  const formatPrice = (price: number, type: string) => {
    const basePrice = `${price}€`;
    switch (type) {
      case "HOURLY":
        return `${basePrice}/${t("hour")}`;
      case "DAILY":
        return `${basePrice}/${t("day")}`;
      case "FIXED":
        return basePrice;
      default:
        return basePrice;
    }
  };

  const handleViewService = () => {
    router.push(`/provider/services/${service.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: service.category.color || "#3B82F6" }}
              >
                {service.category.icon || service.category.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {service.category.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={getStatusColor(service.status)}
              >
                {t(`status.${service.status.toLowerCase()}`)}
              </Badge>

              {service.isEmergencyService && (
                <Badge
                  variant="outline"
                  className="bg-orange-100 text-orange-800"
                >
                  {t("emergency")}
                </Badge>
              )}

              {service.requiresEquipment && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {t("equipment")}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewService}>
                <Eye className="h-4 w-4 mr-2" />
                {t("view")}
              </DropdownMenuItem>

              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(service.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t("edit")}
                </DropdownMenuItem>
              )}

              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(service.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t("duplicate")}
                </DropdownMenuItem>
              )}

              {onViewAnalytics && (
                <DropdownMenuItem onClick={() => onViewAnalytics(service.id)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t("analytics")}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {onToggleStatus && (
                <DropdownMenuItem
                  onClick={() =>
                    onToggleStatus(service.id, service.status !== "ACTIVE")
                  }
                >
                  {service.status === "ACTIVE" ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      {t("deactivate")}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {t("activate")}
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(service.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        )}

        {/* Images preview */}
        {service.images && service.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {service.images.slice(0, 3).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${service.title} ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
              />
            ))}
            {service.images.length > 3 && (
              <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center text-xs text-muted-foreground">
                +{service.images.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Service details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {formatPrice(service.price, service.priceType)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{service.duration} min</span>
            </div>

            <div className="flex items-center gap-2">
              {getLocationIcon(service.location)}
              <span>{t(`location.${service.location.toLowerCase()}`)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>
                {service.rating.toFixed(1)} ({service.totalReviews})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {service.totalBookings} {t("bookings")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>
                {service.monthlyRevenue}€/{t("month")}
              </span>
            </div>
          </div>
        </div>

        {/* Performance indicators */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {t("created")}{" "}
              {format(service.createdAt, "d MMM yyyy", { locale: fr })}
            </span>
            <span>
              {t("updated")}{" "}
              {format(service.updatedAt, "d MMM yyyy", { locale: fr })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
