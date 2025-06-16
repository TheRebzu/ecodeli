"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { formatDistance } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Clock, Package, Truck, Heart } from "lucide-react";
import { cn } from "@/lib/utils/common";
import type { AnnouncementStatus, UserRole } from "@prisma/client";
import Link from "next/link";

// Définir un type étendu pour les statuts qui inclut ceux utilisés dans l'UI mais pas dans le schéma
type ExtendedAnnouncementStatus =
  | AnnouncementStatus
  | "IN_APPLICATION"
  | "DELIVERED"
  | "PAID"
  | "PROBLEM"
  | "DISPUTE";

// Types pour le composant
type AnnouncementCardProps = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: AnnouncementStatus | ExtendedAnnouncementStatus;
  price: number;
  distance?: number;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate?: Date | null;
  deliveryDate?: Date | null;
  createdAt: Date;
  isFavorite?: boolean;
  userRole?: UserRole;
  clientName?: string;
  clientImage?: string;
  clientRating?: number;
  delivererName?: string;
  delivererImage?: string;
  delivererRating?: number;
  onFavoriteToggle?: (id: string) => void;
  onApply?: (id: string) => void;
  onCancel?: (id: string) => void;
  onPayNow?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  className?: string;
};

/**
 * Carte d'annonce pour afficher une annonce dans une liste
 */
export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ id,
  title,
  description,
  type,
  status,
  price,
  distance,
  pickupAddress,
  deliveryAddress,
  pickupDate,
  deliveryDate,
  createdAt,
  isFavorite,
  userRole,
  clientName,
  clientImage,
  clientRating,
  delivererName,
  delivererImage,
  delivererRating,
  onFavoriteToggle,
  onApply,
  onCancel,
  onPayNow,
  onViewDetails,
  className }) => {
  const t = useTranslations("Announcements");

  // Déterminer le statut à afficher
  const getStatusBadge = () => {
    const statusStyles: Record<string, string> = {
      DRAFT: "bg-gray-200 hover:bg-gray-300 text-gray-700",
      PENDING: "bg-gray-200 hover:bg-gray-300 text-gray-700",
      PUBLISHED: "bg-blue-100 hover:bg-blue-200 text-blue-800", IN_APPLICATION: "bg-purple-100 hover:bg-purple-200 text-purple-800",
      ASSIGNED: "bg-indigo-100 hover:bg-indigo-200 text-indigo-800", IN_PROGRESS: "bg-amber-100 hover:bg-amber-200 text-amber-800",
      DELIVERED: "bg-green-100 hover:bg-green-200 text-green-800",
      COMPLETED: "bg-emerald-100 hover:bg-emerald-200 text-emerald-800",
      CANCELLED: "bg-red-100 hover:bg-red-200 text-red-800",
      PAID: "bg-green-100 hover:bg-green-200 text-green-800",
      PROBLEM: "bg-red-100 hover:bg-red-200 text-red-800",
      DISPUTE: "bg-red-100 hover:bg-red-200 text-red-800"};

    return (
      <Badge
        variant="outline"
        className={cn("font-normal", statusStyles[status] || "")}
      >
        {t(`status.${status}`)}
      </Badge>
    );
  };

  // Déterminer les actions disponibles selon le rôle et le statut
  const getActions = () => {
    // Actions pour les clients
    if (userRole === "CLIENT") {
      if (status === "DRAFT" || status === "PENDING") {
        return (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(id)}
            >
              {t("actions.edit")}
            </Button>
            <Button size="sm" onClick={() => onViewDetails?.(id)}>
              {t("actions.publish")}
            </Button>
          </>
        );
      }

      if (status === "PUBLISHED" || status === "IN_APPLICATION") {
        return (
          <>
            <Button variant="outline" size="sm" onClick={() => onCancel?.(id)}>
              {t("actions.cancel")}
            </Button>
            <Button size="sm" onClick={() => onViewDetails?.(id)}>
              {t("actions.viewApplications")}
            </Button>
          </>
        );
      }

      if (status === "DELIVERED") {
        return (
          <Button size="sm" onClick={() => onViewDetails?.(id)}>
            {t("actions.confirmDelivery")}
          </Button>
        );
      }

      if (status === "COMPLETED") {
        if (typeof status === "string" && !status.includes("PAID")) {
          return (
            <Button size="sm" onClick={() => onPayNow?.(id)}>
              {t("actions.payNow")}
            </Button>
          );
        }
      }
    }

    // Actions pour les livreurs
    if (userRole === "DELIVERER") {
      if (status === "PUBLISHED" || status === "IN_APPLICATION") {
        return (
          <Button size="sm" onClick={() => onApply?.(id)}>
            {t("actions.apply")}
          </Button>
        );
      }

      if (status === "ASSIGNED" || status === "IN_PROGRESS") {
        return (
          <Button size="sm" onClick={() => onViewDetails?.(id)}>
            {t("actions.trackDelivery")}
          </Button>
        );
      }
    }

    // Action par défaut
    return (
      <Button variant="outline" size="sm" onClick={() => onViewDetails?.(id)}>
        {t("actions.viewDetails")}
      </Button>
    );
  };

  // Formatage du prix
  const formattedPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"}).format(price);

  // Formatage des dates relatives
  const getRelativeDate = (date: Date) => {
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: fr});
  };

  return (
    <Card
      className={cn(
        "w-full overflow-hidden hover:shadow-md transition-shadow",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
            <CardDescription className="flex items-center space-x-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{getRelativeDate(createdAt)}</span>
              {getStatusBadge()}
            </CardDescription>
          </div>
          {onFavoriteToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onFavoriteToggle(id)}
              aria-label={
                isFavorite
                  ? t("actions.removeFromFavorites")
                  : t("actions.addToFavorites")
              }
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  isFavorite ? "fill-red-500 text-red-500" : "text-gray-500",
                )}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex flex-col space-y-3">
          <p className="text-sm line-clamp-2 text-muted-foreground">
            {description}
          </p>

          <div className="flex items-start space-x-3 text-sm">
            <div className="flex-1 flex items-start space-x-1">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="line-clamp-2 text-muted-foreground">
                {pickupAddress}
              </span>
            </div>
            <div className="flex-1 flex items-start space-x-1">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="line-clamp-2 text-muted-foreground">
                {deliveryAddress}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {type.includes("PACKAGE") && (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
              {type.includes("TRANSPORT") && (
                <Truck className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{t(`types.${type}`)}</span>
            </div>

            <div className="text-right">
              <span className="text-sm font-normal text-muted-foreground">
                {t("price")}
              </span>
              <p className="text-lg font-bold">{formattedPrice}</p>
            </div>
          </div>

          {/* Afficher le client ou le livreur selon le contexte */}
          {userRole === "DELIVERER" && clientName && (
            <div className="flex items-center mt-2">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={clientImage} alt={clientName} />
                <AvatarFallback>
                  {clientName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {t("client")}
                </span>
                <span className="text-sm font-medium">{clientName}</span>
              </div>
            </div>
          )}

          {userRole === "CLIENT" && delivererName && (
            <div className="flex items-center mt-2">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={delivererImage} alt={delivererName} />
                <AvatarFallback>
                  {delivererName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {t("deliverer")}
                </span>
                <span className="text-sm font-medium">{delivererName}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-2">
        {distance !== undefined && (
          <div className="text-sm text-muted-foreground">
            {t("distance")}:{" "}
            {distance < 1
              ? `${(distance * 1000).toFixed(0)}m`
              : `${distance.toFixed(1)}km`}
          </div>
        )}
        <div className="flex space-x-2">{getActions()}</div>
      </CardFooter>
    </Card>
  );
};

export default AnnouncementCard;
