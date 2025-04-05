"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Hammer, 
  Truck, 
  Home, 
  PackageOpen,
  Box,
  ShoppingBag,
  Wrench,
  Calendar,
  Users,
  Check,
  Clock,
  ChevronRight
} from "lucide-react";
import React from "react";

export interface ServiceProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode | string;
  imageUrl?: string;
  startingPrice: number;
  priceUnit: string;
  estimatedTime?: string;
  availableSlots?: number;
  features?: string[];
  category: 'assembly' | 'transportation' | 'moving' | 'installation' | 'cleaning' | 'delivery' | 'storage' | 'other';
  popular?: boolean;
  url: string;
}

export function ServiceCard({ 
  service,
  className = "",
  featured = false
}: { 
  service: ServiceProps;
  className?: string;
  featured?: boolean;
}) {
  const router = useRouter();
  
  const getCategoryIcon = (category: ServiceProps['category']) => {
    switch (category) {
      case 'assembly':
        return <Hammer className="h-5 w-5" />;
      case 'transportation':
        return <Truck className="h-5 w-5" />;
      case 'moving':
        return <Home className="h-5 w-5" />;
      case 'installation':
        return <Wrench className="h-5 w-5" />;
      case 'cleaning':
        return <Wrench className="h-5 w-5" />;
      case 'delivery':
        return <PackageOpen className="h-5 w-5" />;
      case 'storage':
        return <Box className="h-5 w-5" />;
      default:
        return <ShoppingBag className="h-5 w-5" />;
    }
  };
  
  const handleClick = () => {
    router.push(service.url);
  };
  
  // Determine if the icon is a string URL or a React element
  const renderIcon = () => {
    if (typeof service.icon === 'string') {
      return (
        <div className="h-12 w-12 rounded-full overflow-hidden">
          <Image 
            src={service.icon} 
            alt={service.title} 
            width={48} 
            height={48} 
            className="object-cover"
          />
        </div>
      );
    }
    return (
      <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
        {service.icon || getCategoryIcon(service.category)}
      </div>
    );
  };
  
  return (
    <div 
      className={`
        group cursor-pointer border border-gray-200 rounded-lg overflow-hidden transition-all
        ${featured ? 'shadow-md hover:shadow-lg' : 'hover:shadow-sm'}
        ${className}
      `}
      onClick={handleClick}
    >
      {service.imageUrl && featured && (
        <div className="relative h-36 w-full overflow-hidden">
          <Image 
            src={service.imageUrl} 
            alt={service.title} 
            fill 
            className="object-cover transition-transform group-hover:scale-105"
          />
          {service.popular && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Populaire
            </div>
          )}
        </div>
      )}
      
      <div className={`p-4 ${featured ? 'pt-5' : ''}`}>
        <div className="flex items-start gap-3">
          {!featured && renderIcon()}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {service.title}
              </h3>
              {service.popular && !featured && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                  Populaire
                </span>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {service.description}
            </p>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="flex items-baseline">
              <span className="text-sm font-medium text-gray-900">
                {service.startingPrice.toFixed(2)} €
              </span>
              <span className="text-xs text-gray-500 ml-1">
                /{service.priceUnit}
              </span>
            </div>
            
            {service.estimatedTime && (
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{service.estimatedTime}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {service.availableSlots !== undefined && (
              <div className="text-xs mr-2 text-gray-500">
                <Calendar className="h-3 w-3 inline-block mr-1" />
                {service.availableSlots} créneaux
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
        
        {featured && service.features && service.features.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-2">
              {service.features.slice(0, 4).map((feature, index) => (
                <li key={index} className="flex items-center text-xs text-gray-600">
                  <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Sample services data for demonstration purposes
export const sampleServices: ServiceProps[] = [
  {
    id: "service-1",
    title: "Montage de meubles",
    description: "Montage professionnel de meubles en kit avec garantie de satisfaction",
    icon: <Hammer className="h-5 w-5" />,
    imageUrl: "/images/services/furniture-assembly.jpg",
    startingPrice: 39.90,
    priceUnit: "heure",
    estimatedTime: "1-2 heures/meuble",
    availableSlots: 12,
    features: [
      "Montage professionnel",
      "Garantie satisfaction",
      "Outillage inclus",
      "Déchets emportés"
    ],
    category: "assembly",
    popular: true,
    url: "/client/services/book?type=assembly"
  },
  {
    id: "service-2",
    title: "Transport d'objets volumineux",
    description: "Transport sécurisé d'objets lourds ou encombrants par véhicule adapté",
    icon: <Truck className="h-5 w-5" />,
    imageUrl: "/images/services/transport.jpg",
    startingPrice: 49.90,
    priceUnit: "trajet",
    estimatedTime: "Selon distance",
    availableSlots: 8,
    features: [
      "Véhicules adaptés",
      "Chargement inclus",
      "Assurance transport",
      "Disponible 7j/7"
    ],
    category: "transportation",
    url: "/client/services/book?type=transport"
  },
  {
    id: "service-3",
    title: "Aide au déménagement",
    description: "Une équipe pour vous aider à déplacer vos affaires efficacement",
    icon: <Users className="h-5 w-5" />,
    imageUrl: "/images/services/moving.jpg",
    startingPrice: 29.90,
    priceUnit: "heure/personne",
    availableSlots: 5,
    features: [
      "Personnel formé",
      "Déplacement meublé",
      "Protection objets fragiles",
      "Service rapide"
    ],
    category: "moving",
    url: "/client/services/book?type=moving"
  },
  {
    id: "service-4",
    title: "Installation électroménager",
    description: "Installation et mise en service de vos appareils électroménagers",
    icon: <Wrench className="h-5 w-5" />,
    startingPrice: 45.00,
    priceUnit: "appareil",
    estimatedTime: "30-60 min/appareil",
    availableSlots: 10,
    category: "installation",
    url: "/client/services/book?type=installation"
  },
  {
    id: "service-5",
    title: "Stockage temporaire",
    description: "Solution de stockage sécurisée et flexible pour vos biens",
    icon: <Box className="h-5 w-5" />,
    startingPrice: 9.90,
    priceUnit: "jour",
    category: "storage",
    url: "/client/storage/rent"
  }
]; 