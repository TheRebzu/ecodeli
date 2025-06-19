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
  CardTitle
} from "@/components/ui/card";
import { 
  MapPin, 
  Clock, 
  Package, 
  Truck, 
  Edit, 
  Eye, 
  Star,
  Navigation,
  CreditCard,
  X
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { 
  type AnnouncementCard as AnnouncementCardType,
  getAnnouncementStatusColor,
  getAnnouncementStatusLabel,
  getAnnouncementTypeLabel,
  getAnnouncementPriorityLabel,
  getAnnouncementPriorityColor
} from "@/types/client/announcements";

/**
 * Carte d'annonce pour afficher une annonce dans une liste
 */
export const AnnouncementCard: React.FC<AnnouncementCardType> = ({
  id,
  title,
  description,
  type,
  status,
  priority,
  createdAt,
  pickup,
  delivery,
  pricing,
  proposalsCount,
  isUrgent,
  estimatedDeliveryTime,
  ecoFriendly,
  onView,
  onEdit,
  onCancel,
  onTrack,
  onRate,
  onViewProposals
}) => {
  const t = useTranslations("announcements");

  // Formatage des dates relatives
  const getRelativeDate = (date: Date) => {
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: fr
    });
  };

  // Obtenir l'icône selon le type
  const getTypeIcon = () => {
    switch (type) {
      case "delivery":
      case "eco_delivery":
        return <Truck className="h-4 w-4" />;
      case "storage":
        return <Package className="h-4 w-4" />;
      case "service":
        return <Star className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Déterminer les actions disponibles selon le statut
  const getActions = () => {
    const actions = [];

    // Actions selon le statut
    if (status === "draft" || status === "active") {
      actions.push(
        <Button
          key="edit"
          variant="outline"
          size="sm"
          onClick={() => onEdit?.(id)}
          className="flex items-center gap-1"
        >
          <Edit className="h-3 w-3" />
          Modifier
        </Button>
      );
    }

    if (status === "active" || status === "matched") {
      actions.push(
        <Button
          key="cancel"
          variant="outline"
          size="sm"
          onClick={() => onCancel?.(id)}
          className="flex items-center gap-1 text-red-600 hover:text-red-700"
        >
          <X className="h-3 w-3" />
          Annuler
        </Button>
      );
    }

    if (status === "in_progress" || status === "matched") {
      actions.push(
        <Button
          key="track"
          variant="outline"
          size="sm"
          onClick={() => onTrack?.(id)}
          className="flex items-center gap-1"
        >
          <Navigation className="h-3 w-3" />
          Suivre
        </Button>
      );
    }

    if (status === "completed") {
      actions.push(
        <Button
          key="rate"
          variant="outline"
          size="sm"
          onClick={() => onRate?.(id)}
          className="flex items-center gap-1"
        >
          <Star className="h-3 w-3" />
          Noter
        </Button>
      );
    }

    if (proposalsCount > 0) {
      actions.push(
        <Button
          key="proposals"
          size="sm"
          onClick={() => onViewProposals?.(id)}
          className="flex items-center gap-1"
        >
          <Eye className="h-3 w-3" />
          {proposalsCount} propositions
        </Button>
      );
    }

    // Action par défaut si aucune autre
    if (actions.length === 0) {
      actions.push(
        <Button
          key="view"
          variant="outline"
          size="sm"
          onClick={() => onView?.(id)}
          className="flex items-center gap-1"
        >
          <Eye className="h-3 w-3" />
          Voir détails
        </Button>
      );
    }

    return actions;
  };

  return (
    <Card className="w-full overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
              {isUrgent && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
              {ecoFriendly && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  Eco
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center space-x-3 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{getRelativeDate(createdAt)}</span>
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs", getAnnouncementStatusColor(status))}
              >
                {getAnnouncementStatusLabel(status)}
              </Badge>
              <div className={cn("text-xs font-medium", getAnnouncementPriorityColor(priority))}>
                {getAnnouncementPriorityLabel(priority)}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-3">
          <p className="text-sm line-clamp-2 text-muted-foreground">
            {description}
          </p>

          {/* Type et prix */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getTypeIcon()}
              <span className="text-sm font-medium">
                {getAnnouncementTypeLabel(type)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Prix</span>
              <p className="text-lg font-bold">
                {pricing.totalPrice.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: pricing.currency,
                })}
              </p>
            </div>
          </div>

          {/* Adresses */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">Départ:</span>
                <p className="line-clamp-1">{pickup.address}, {pickup.city}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">Arrivée:</span>
                <p className="line-clamp-1">{delivery.address}, {delivery.city}</p>
              </div>
            </div>
          </div>

          {/* Infos supplémentaires */}
          {estimatedDeliveryTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Livraison estimée: {estimatedDeliveryTime}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-0">
        <div className="text-sm text-muted-foreground">
          {proposalsCount > 0 ? (
            <span>{proposalsCount} proposition(s)</span>
          ) : (
            <span>Aucune proposition</span>
          )}
        </div>
        <div className="flex gap-2">
          {getActions()}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AnnouncementCard;
