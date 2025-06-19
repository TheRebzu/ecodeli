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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, 
  Clock, 
  Star, 
  Eye, 
  Calendar, 
  MessageCircle,
  Phone,
  CheckCircle,
  Zap,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { 
  type ServiceSearchResult,
  formatServicePrice,
  getServiceCategoryLabel
} from "@/types/client/services";

interface ServiceCardProps {
  service: ServiceSearchResult;
  onBook?: (serviceId: string) => void;
  onView?: (serviceId: string) => void;
  onContact?: (providerId: string) => void;
  onFavorite?: (serviceId: string) => void;
  className?: string;
}

/**
 * Carte de service pour afficher un service dans une liste de recherche
 */
export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onBook,
  onView,
  onContact,
  onFavorite,
  className
}) => {
  const t = useTranslations("services");

  // Formatage des étoiles pour l'affichage des notes
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={cn(
          "h-3 w-3",
          index < rating 
            ? "fill-yellow-400 text-yellow-400" 
            : "text-gray-300"
        )}
      />
    ));
  };

  // Formatage de la prochaine disponibilité
  const getNextAvailabilityText = () => {
    if (!service.availability.nextAvailable) {
      return "Disponibilité à vérifier";
    }
    
    const now = new Date();
    const nextDate = service.availability.nextAvailable;
    
    if (nextDate <= now) {
      return "Disponible maintenant";
    }
    
    return `Disponible ${formatDistance(nextDate, now, { 
      addSuffix: true, 
      locale: fr 
    })}`;
  };

  // Obtenir les highlights à afficher
  const getHighlightBadges = () => {
    const badges = [];
    
    if (service.highlights.verified) {
      badges.push(
        <Badge key="verified" variant="secondary" className="text-xs bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Vérifié
        </Badge>
      );
    }
    
    if (service.highlights.featured) {
      badges.push(
        <Badge key="featured" variant="secondary" className="text-xs bg-purple-100 text-purple-800">
          <Star className="h-3 w-3 mr-1" />
          Recommandé
        </Badge>
      );
    }
    
    if (service.highlights.ecoFriendly) {
      badges.push(
        <Badge key="eco" variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
          🌱 Éco-responsable
        </Badge>
      );
    }
    
    if (service.highlights.fastResponse) {
      badges.push(
        <Badge key="fast" variant="secondary" className="text-xs bg-blue-100 text-blue-800">
          <Zap className="h-3 w-3 mr-1" />
          Réponse rapide
        </Badge>
      );
    }
    
    return badges.slice(0, 2); // Limiter à 2 badges max
  };

  return (
    <Card className={cn("w-full hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg line-clamp-1">{service.title}</CardTitle>
              {service.verified && (
                <CheckCircle className="h-4 w-4 text-blue-600" />
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <span className="font-medium">{getServiceCategoryLabel(service.category)}</span>
              <div className="flex items-center gap-1">
                {renderStars(Math.round(service.providerRating))}
                <span className="ml-1">({service.providerReviews})</span>
              </div>
            </div>
            
            {/* Badges highlights */}
            <div className="flex gap-1 flex-wrap">
              {getHighlightBadges()}
            </div>
          </div>
          
          {onFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onFavorite(service.id)}
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-3">
          <p className="text-sm line-clamp-2 text-muted-foreground">
            {service.description}
          </p>

          {/* Prestataire */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={service.providerAvatar} alt={service.providerName} />
              <AvatarFallback>
                {service.providerName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{service.providerName}</p>
              <p className="text-xs text-muted-foreground">
                Temps de réponse: {service.availability.responseTime}h
              </p>
            </div>
          </div>

          {/* Prix et localisation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{service.location.serviceArea}</span>
              {service.location.distance && (
                <span>• {service.location.distance.toFixed(1)}km</span>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-lg font-bold">
                {formatServicePrice(
                  service.pricing.price, 
                  service.pricing.currency, 
                  service.pricing.priceType
                )}
              </p>
            </div>
          </div>

          {/* Disponibilité */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{getNextAvailabilityText()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-0">
        <div className="flex gap-2">
          {onContact && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContact(service.providerId)}
              className="flex items-center gap-1"
            >
              <MessageCircle className="h-3 w-3" />
              Contacter
            </Button>
          )}
          
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(service.id)}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Détails
            </Button>
          )}
        </div>
        
        {service.actions.canBook && onBook && (
          <Button
            size="sm"
            onClick={() => onBook(service.id)}
            className="flex items-center gap-1"
          >
            <Calendar className="h-3 w-3" />
            Réserver
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ServiceCard;