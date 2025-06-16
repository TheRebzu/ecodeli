"use client";

import React, { useMemo } from "react";
import { DeliveryStatus as DeliveryStatusEnum } from "@prisma/client";
import { cn } from "@/lib/utils/common";
import {
  Truck,
  Clock,
  Package,
  CheckCircle2,
  X,
  AlertTriangle,
  Timer,
  Loader2,
  ShieldAlert} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger} from "@/components/ui/tooltip";
import { useDeliveryLiveTracking } from "@/hooks/features/use-delivery-tracking";
import { useDeliveryStatusHistory } from "@/hooks/delivery/use-delivery-status";

export interface DeliveryStatusProps {
  deliveryId?: string;
  status?: DeliveryStatusEnum;
  updatedAt?: Date | string;
  variant?: "default" | "compact" | "detailed";
  className?: string;
  hideIcon?: boolean;
  hideLabel?: boolean;
  hideTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  showTimestamp?: boolean;
  isLoading?: boolean;
}

// Mapping des statuts vers des couleurs et icônes
export const STATUS_CONFIG = {
  [DeliveryStatusEnum.PENDING]: {
    color: "text-slate-500",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-200",
    icon: Clock,
    label: "En attente",
    description: "La livraison est en attente de prise en charge"},
  [DeliveryStatusEnum.ACCEPTED]: {
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Timer,
    label: "Acceptée",
    description: "La livraison a été acceptée par un livreur"},
  [DeliveryStatusEnum.PICKED_UP]: {
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Package,
    label: "Collectée",
    description: "Le colis a été collecté par le livreur"},
  [DeliveryStatusEnum.IN_TRANSIT]: {
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: Truck,
    label: "En transit",
    description: "Le colis est en cours de livraison"},
  [DeliveryStatusEnum.DELIVERED]: {
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle2,
    label: "Livrée",
    description: "Le colis a été livré à destination"},
  [DeliveryStatusEnum.CONFIRMED]: {
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle2,
    label: "Confirmée",
    description: "La livraison a été confirmée par le destinataire"},
  [DeliveryStatusEnum.CANCELLED]: {
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: X,
    label: "Annulée",
    description: "La livraison a été annulée"},
  [DeliveryStatusEnum.DISPUTED]: {
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: ShieldAlert,
    label: "Litige",
    description: "La livraison fait l'objet d'un litige"},
  PROBLEM: {
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: AlertTriangle,
    label: "Problème",
    description: "Un problème est survenu lors de la livraison"},
  UNKNOWN: {
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Loader2,
    label: "Inconnu",
    description: "Le statut de la livraison est inconnu"}};

// Formatage relatif du temps écoulé
const getRelativeTime = (date: Date | string) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours} h`;
  if (diffDays === 1) return "hier";
  if (diffDays < 30) return `il y a ${diffDays} jours`;

  return past.toLocaleDateString();
};

const DeliveryStatusIndicator: React.FC<DeliveryStatusProps> = ({ deliveryId,
  status,
  updatedAt,
  variant = "default",
  className,
  hideIcon = false,
  hideLabel = false,
  hideTooltip = false,
  size = "md",
  showTimestamp = false,
  isLoading: externalLoading }) => {
  // Si deliveryId est fourni, on utilise le hook pour obtenir le statut en temps réel
  const { deliveryInfo, isLoading: trackingLoading } = deliveryId
    ? useDeliveryLiveTracking(deliveryId)
    : { deliveryInfo: null, isLoading: false };

  // Historique des statuts pour l'horodatage
  const { statusHistory, isLoading: historyLoading } = deliveryId
    ? useDeliveryStatusHistory(deliveryId)
    : { statusHistory: [], isLoading: false };

  // Détermine si on utilise le statut fourni en prop ou celui du hook
  const currentStatus = useMemo(() => {
    if (status) return status;
    if (deliveryInfo?.status) return deliveryInfo.status;
    return null;
  }, [status, deliveryInfo]);

  // État de chargement global
  const isLoading = externalLoading || trackingLoading || historyLoading;

  // Obtient la dernière mise à jour
  const lastUpdated = useMemo(() => {
    if (updatedAt) return new Date(updatedAt);
    if (statusHistory && statusHistory.length > 0) {
      return new Date(statusHistory[0].timestamp);
    }
    return new Date();
  }, [updatedAt, statusHistory]);

  // Si le statut est indéfini, afficher un état de chargement ou inconnu
  if (!currentStatus) {
    return (
      <div
        className={cn(
          "inline-flex items-center",
          {
            "gap-1.5": size === "sm",
            "gap-2": size === "md",
            "gap-3": size === "lg"},
          className,
        )}
      >
        {!hideIcon && (
          <Loader2
            className={cn("animate-spin text-slate-400", {
              "h-3 w-3": size === "sm",
              "h-4 w-4": size === "md",
              "h-5 w-5": size === "lg"})}
          />
        )}
        {!hideLabel && (
          <span className="text-slate-500 font-medium">
            {isLoading ? "Chargement..." : "Statut inconnu"}
          </span>
        )}
      </div>
    );
  }

  // Configuration du statut actuel
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.UNKNOWN;
  const Icon = config.icon;

  // Version tooltip du statut
  if (!hideTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center",
                {
                  "gap-1.5": size === "sm",
                  "gap-2": size === "md",
                  "gap-3": size === "lg"},
                className,
              )}
            >
              {!hideIcon && (
                <Icon
                  className={cn(config.color, {
                    "h-3 w-3": size === "sm",
                    "h-4 w-4": size === "md",
                    "h-5 w-5": size === "lg"})}
                />
              )}
              {!hideLabel && (
                <span className={cn("font-medium", config.color)}>
                  {config.label}
                </span>
              )}
              {showTimestamp && (
                <span className="text-muted-foreground text-xs">
                  {getRelativeTime(lastUpdated)}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col space-y-1">
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
            <p className="text-xs">Mis à jour {getRelativeTime(lastUpdated)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Version standard sans tooltip
  return (
    <div
      className={cn(
        "inline-flex items-center",
        {
          "gap-1.5": size === "sm",
          "gap-2": size === "md",
          "gap-3": size === "lg"},
        className,
      )}
    >
      {!hideIcon && (
        <Icon
          className={cn(config.color, {
            "h-3 w-3": size === "sm",
            "h-4 w-4": size === "md",
            "h-5 w-5": size === "lg"})}
        />
      )}
      {!hideLabel && (
        <span className={cn("font-medium", config.color)}>{config.label}</span>
      )}
      {showTimestamp && (
        <span className="text-muted-foreground text-xs">
          {getRelativeTime(lastUpdated)}
        </span>
      )}
    </div>
  );
};

export default DeliveryStatusIndicator;
