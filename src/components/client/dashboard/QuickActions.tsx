"use client";

import Link from "next/link";
import {
  Package,
  Truck,
  Map,
  ShoppingCart,
  MessageSquare,
  Calendar,
  Box,
  Store,
  RefreshCw,
  Clock,
  Bell,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  isLoading?: boolean;
  className?: string;
}

export function QuickActions({ isLoading = false, className }: QuickActionsProps) {
  const actions = [
    {
      name: "Créer une annonce",
      href: "/client/announcements/new",
      icon: <Package className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-50",
    },
    {
      name: "Demande express",
      href: "/client/urgent",
      icon: <Clock className="h-5 w-5 text-pink-500" />,
      color: "bg-pink-50",
    },
    {
      name: "Suivre un colis",
      href: "/client/tracking",
      icon: <Truck className="h-5 w-5 text-amber-500" />,
      color: "bg-amber-50",
    },
    {
      name: "Voir mes trajets",
      href: "/client/routes",
      icon: <Map className="h-5 w-5 text-emerald-500" />,
      color: "bg-emerald-50",
    },
    {
      name: "Achats groupés",
      href: "/client/cart-drops",
      icon: <ShoppingCart className="h-5 w-5 text-violet-500" />,
      color: "bg-violet-50",
    },
    {
      name: "Messages",
      href: "/client/messages",
      icon: <MessageSquare className="h-5 w-5 text-cyan-500" />,
      color: "bg-cyan-50",
    },
    {
      name: "Calendrier",
      href: "/client/calendar",
      icon: <Calendar className="h-5 w-5 text-indigo-500" />,
      color: "bg-indigo-50",
    },
    {
      name: "Stockage",
      href: "/client/storage-box",
      icon: <Box className="h-5 w-5 text-orange-500" />,
      color: "bg-orange-50",
    },
    {
      name: "Marchands",
      href: "/client/favorite-stores",
      icon: <Store className="h-5 w-5 text-lime-500" />,
      color: "bg-lime-50",
    },
    {
      name: "Impact écologique",
      href: "/client/eco-tracking",
      icon: <RefreshCw className="h-5 w-5 text-green-500" />,
      color: "bg-green-50",
    },
    {
      name: "Notifications",
      href: "/client/notifications",
      icon: <Bell className="h-5 w-5 text-rose-500" />,
      color: "bg-rose-50",
    },
    {
      name: "Documents",
      href: "/client/documents",
      icon: <FileText className="h-5 w-5 text-slate-500" />,
      color: "bg-slate-50",
    },
  ];

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200 p-6", className)}>
      <h3 className="font-medium text-lg">Actions rapides</h3>
      
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {isLoading ? (
          // État de chargement
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
          ))
        ) : (
          // Actions normales
          actions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 transition-colors text-center h-24 border border-gray-100"
            >
              <div className={cn("p-2 rounded-full mb-2", action.color)}>
                {action.icon}
              </div>
              <span className="text-sm font-medium">{action.name}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
} 