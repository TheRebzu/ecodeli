"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Package,
  Truck,
  Clock,
  ShoppingBag,
  Box,
  Hammer,
  Calendar,
  PlusCircle,
  Search,
  MapPin,
  Building,
  MessageSquare,
  HelpCircle
} from "lucide-react";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  color: string;
  isNew?: boolean;
}

export function QuickActions({ className = "" }: { className?: string }) {
  const router = useRouter();

  const quickActions: QuickAction[] = [
    {
      id: "create-delivery",
      title: "Créer une livraison",
      description: "Demander une livraison de colis",
      icon: <Truck className="h-5 w-5" />,
      url: "/client/announcements/new",
      color: "bg-blue-500 text-white",
    },
    {
      id: "track-package",
      title: "Suivre un colis",
      description: "Consulter l'état de vos livraisons",
      icon: <Search className="h-5 w-5" />,
      url: "/client/tracking",
      color: "bg-emerald-500 text-white",
    },
    {
      id: "book-service",
      title: "Réserver un service",
      description: "Montage, transport, aide au déménagement",
      icon: <Hammer className="h-5 w-5" />,
      url: "/client/services/book",
      color: "bg-violet-500 text-white",
      isNew: true,
    },
    {
      id: "rent-storage",
      title: "Louer un stockage",
      description: "Espace de stockage sécurisé",
      icon: <Box className="h-5 w-5" />,
      url: "/client/storage/rent",
      color: "bg-amber-500 text-white",
    },
    {
      id: "schedule-pickup",
      title: "Planifier un ramassage",
      description: "Pour vos retours ou envois",
      icon: <Calendar className="h-5 w-5" />,
      url: "/client/pickups/schedule",
      color: "bg-indigo-500 text-white",
    },
    {
      id: "contact-support",
      title: "Contacter le support",
      description: "Besoin d'aide ou de conseils",
      icon: <MessageSquare className="h-5 w-5" />,
      url: "/client/support",
      color: "bg-gray-500 text-white",
    },
  ];

  const handleActionClick = (url: string) => {
    router.push(url);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Actions rapides</h2>
      </div>
      
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action.url)}
            className="flex flex-col items-center text-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors relative group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <div className={`p-3 rounded-full ${action.color} mb-3`}>
              {action.icon}
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">{action.title}</h3>
            <p className="text-xs text-gray-500">{action.description}</p>
            
            {action.isNew && (
              <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                New
              </span>
            )}
          </button>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={() => router.push("/client/help")} 
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Voir toutes les fonctionnalités
        </button>
      </div>
    </div>
  );
} 