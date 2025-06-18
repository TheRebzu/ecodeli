"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  MapPin, 
  Package, 
  User, 
  Star, 
  Euro,
  Calendar,
  Truck,
  CheckCircle,
  AlertCircle,
  XCircle,
  Timer
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AnnouncementStatusCardProps {
  announcement: {
    id: string;
    title: string;
    status: string;
    pickupAddress: string;
    deliveryAddress: string;
    pickupDate: Date;
    deliveryDate?: Date;
    packageType: string;
    maxPrice?: number;
    urgencyLevel: string;
    createdAt: Date;
    deliverer?: {
      id: string;
      name: string;
      rating?: number;
      image?: string;
    } | null;
    proposals?: {
      id: string;
      price: number;
      deliverer: {
        name: string;
        rating: number;
      };
    }[];
  };
  showActions?: boolean;
  compact?: boolean;
}

export default function AnnouncementStatusCard({ 
  announcement, 
  showActions = true, 
  compact = false 
}: AnnouncementStatusCardProps) {
  const t = useTranslations("announcements.status");
  const router = useRouter();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "DRAFT":
        return {
          label: t("draft"),
          color: "bg-gray-500",
          textColor: "text-gray-600",
          icon: Clock,
          progress: 0
        };
      case "PUBLISHED":
        return {
          label: t("published"),
          color: "bg-blue-500",
          textColor: "text-blue-600",
          icon: Package,
          progress: 20
        };
      case "PROPOSALS_RECEIVED":
        return {
          label: t("proposalsReceived"),
          color: "bg-yellow-500",
          textColor: "text-yellow-600",
          icon: User,
          progress: 40
        };
      case "ASSIGNED":
        return {
          label: t("assigned"),
          color: "bg-purple-500",
          textColor: "text-purple-600",
          icon: CheckCircle,
          progress: 60
        };
      case "IN_PROGRESS":
        return {
          label: t("inProgress"),
          color: "bg-orange-500",
          textColor: "text-orange-600",
          icon: Truck,
          progress: 80
        };
      case "DELIVERED":
        return {
          label: t("delivered"),
          color: "bg-green-500",
          textColor: "text-green-600",
          icon: CheckCircle,
          progress: 100
        };
      case "CANCELLED":
        return {
          label: t("cancelled"),
          color: "bg-red-500",
          textColor: "text-red-600",
          icon: XCircle,
          progress: 0
        };
      case "EXPIRED":
        return {
          label: t("expired"),
          color: "bg-gray-500",
          textColor: "text-gray-600",
          icon: Timer,
          progress: 0
        };
      default:
        return {
          label: t("unknown"),
          color: "bg-gray-500",
          textColor: "text-gray-600",
          icon: AlertCircle,
          progress: 0
        };
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "LOW": return "bg-green-100 text-green-800";
      case "NORMAL": return "bg-blue-100 text-blue-800";
      case "HIGH": return "bg-orange-100 text-orange-800";
      case "URGENT": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const statusConfig = getStatusConfig(announcement.status);
  const StatusIcon = statusConfig.icon;
  
  const handleViewDetails = () => {
    router.push(`/client/announcements/${announcement.id}`);
  };

  const handleEdit = () => {
    router.push(`/client/announcements/${announcement.id}/edit`);
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewDetails}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${statusConfig.color}`}>
                <StatusIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-sm">{announcement.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {format(announcement.createdAt, "dd MMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={statusConfig.textColor}>
              {statusConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${statusConfig.textColor}`} />
              {announcement.title}
            </CardTitle>
            <CardDescription>
              {t("createdOn")} {format(announcement.createdAt, "dd MMM yyyy à HH:mm", { locale: fr })}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getUrgencyColor(announcement.urgencyLevel)}>
              {t(`urgency.${announcement.urgencyLevel.toLowerCase()}`)}
            </Badge>
            <Badge variant="outline" className={statusConfig.textColor}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t("progress")}</span>
            <span>{statusConfig.progress}%</span>
          </div>
          <Progress value={statusConfig.progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations de livraison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="font-medium">{t("pickup")}:</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{announcement.pickupAddress}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="font-medium">{t("delivery")}:</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{announcement.deliveryAddress}</p>
          </div>
        </div>

        {/* Dates et détails */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
            <div>
              <p className="font-medium">{t("pickupDate")}</p>
              <p className="text-muted-foreground">
                {format(announcement.pickupDate, "dd MMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          
          {announcement.deliveryDate && (
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <div>
                <p className="font-medium">{t("deliveryDate")}</p>
                <p className="text-muted-foreground">
                  {format(announcement.deliveryDate, "dd MMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
          )}
          
          {announcement.maxPrice && (
            <div className="flex items-center text-sm">
              <Euro className="h-4 w-4 text-muted-foreground mr-2" />
              <div>
                <p className="font-medium">{t("maxPrice")}</p>
                <p className="text-muted-foreground">{announcement.maxPrice.toFixed(2)}€</p>
              </div>
            </div>
          )}
        </div>

        {/* Informations du livreur (si assigné) */}
        {announcement.deliverer && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t("assignedTo")}</p>
                <p className="text-sm text-muted-foreground">{announcement.deliverer.name}</p>
              </div>
            </div>
            {announcement.deliverer.rating && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">{announcement.deliverer.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        {/* Propositions reçues */}
        {announcement.proposals && announcement.proposals.length > 0 && !announcement.deliverer && (
          <div className="space-y-2">
            <p className="font-medium text-sm">
              {t("proposalsReceived")} ({announcement.proposals.length})
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {announcement.proposals.slice(0, 3).map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{proposal.deliverer.name}</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs">{proposal.deliverer.rating}</span>
                    </div>
                  </div>
                  <span className="font-medium text-sm">{proposal.price.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleViewDetails}>
              {t("actions.view")}
            </Button>
            {["DRAFT", "PUBLISHED", "PROPOSALS_RECEIVED"].includes(announcement.status) && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                {t("actions.edit")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
