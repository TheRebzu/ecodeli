"use client";

import {
  Clock,
  CheckCircle2,
  Truck,
  PenTool,
  Package,
  AlertCircle,
  XCircle,
  Home,
  UserCog,
  Ban
} from "lucide-react";

type OrderStatus = 
  | "PENDING"
  | "ACCEPTED"
  | "PICKUP_IN_PROGRESS"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "IN_STORAGE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function OrderStatusBadge({ 
  status, 
  className = "", 
  size = "md", 
  showIcon = true 
}: OrderStatusBadgeProps) {
  
  // Status configuration (color, icon, text)
  const statusConfig = {
    PENDING: {
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock,
      text: "En attente"
    },
    ACCEPTED: {
      color: "bg-blue-100 text-blue-800",
      icon: CheckCircle2,
      text: "Acceptée"
    },
    PICKUP_IN_PROGRESS: {
      color: "bg-indigo-100 text-indigo-800",
      icon: UserCog,
      text: "Récupération en cours"
    },
    PICKED_UP: {
      color: "bg-violet-100 text-violet-800",
      icon: Package,
      text: "Récupérée"
    },
    IN_TRANSIT: {
      color: "bg-blue-100 text-blue-800",
      icon: Truck,
      text: "En transit"
    },
    IN_STORAGE: {
      color: "bg-amber-100 text-amber-800",
      icon: Home,
      text: "En stockage"
    },
    OUT_FOR_DELIVERY: {
      color: "bg-emerald-100 text-emerald-800",
      icon: Truck,
      text: "En livraison"
    },
    DELIVERED: {
      color: "bg-green-100 text-green-800",
      icon: CheckCircle2,
      text: "Livrée"
    },
    CANCELLED: {
      color: "bg-red-100 text-red-800",
      icon: XCircle,
      text: "Annulée"
    },
    FAILED: {
      color: "bg-gray-100 text-gray-800",
      icon: Ban,
      text: "Échec"
    }
  };
  
  // Font size based on size prop
  const sizeClasses = {
    sm: "text-xs py-0.5 px-2",
    md: "text-sm py-1 px-2.5",
    lg: "text-base py-1.5 px-3"
  };
  
  // Icon size based on size prop
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };
  
  const config = statusConfig[status] || statusConfig.PENDING;
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClasses[size]} ${className}`}>
      {showIcon && <config.icon size={iconSizes[size]} className={size === "sm" ? "mr-0.5" : "mr-1"} />}
      {config.text}
    </span>
  );
} 