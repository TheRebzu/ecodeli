"use client";

import { useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  User,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Phone,
  ExternalLink
} from "lucide-react";
import { OrderStatusBadge } from "./order-status-badge";

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

interface OrderCardProps {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
    deliveryAddress: string;
    pickupAddress: string;
    expectedDeliveryTime: Date | null;
    totalPrice: number;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    deliveryPerson?: {
      id: string;
      name: string;
      phone: string;
      rating: number;
    };
    paymentMethod: string;
    tracking?: {
      trackingNumber: string;
      link: string;
    };
  };
  className?: string;
  compact?: boolean;
}

export function OrderCard({ order, className = "", compact = false }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Format dates
  const formattedCreatedAt = format(new Date(order.createdAt), "dd MMM yyyy", { locale: fr });
  const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: fr });
  
  const formattedExpectedDelivery = order.expectedDeliveryTime 
    ? format(new Date(order.expectedDeliveryTime), "dd MMM yyyy à HH:mm", { locale: fr }) 
    : "Non spécifié";
  
  // Total items
  const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Commande #{order.orderNumber}</h3>
              <span className="ml-3">
                <OrderStatusBadge status={order.status} />
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              <time dateTime={order.createdAt.toString()} title={formattedCreatedAt}>
                {timeAgo}
              </time>
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">{order.totalPrice.toFixed(2)} €</p>
            <p className="text-xs text-gray-500 mt-1">{totalItems} article{totalItems > 1 ? "s" : ""}</p>
          </div>
        </div>
        
        {/* Locations */}
        <div className="mt-4 space-y-2">
          <div className="flex items-start">
            <MapPin size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Adresse de récupération:</p>
              <p className="text-sm text-gray-700">{order.pickupAddress}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <MapPin size={16} className="mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Adresse de livraison:</p>
              <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
            </div>
          </div>
          
          {order.expectedDeliveryTime && (
            <div className="flex items-center">
              <Clock size={16} className="mr-2 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Livraison prévue:</p>
                <p className="text-sm text-gray-700">{formattedExpectedDelivery}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Items */}
        {!compact && isExpanded && (
          <div className="mt-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Articles</h4>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <Package size={14} className="mr-1 text-gray-400" />
                    <span className="text-gray-800">{item.name}</span>
                    <span className="ml-1 text-gray-500">x{item.quantity}</span>
                  </div>
                  <span className="font-medium text-gray-800">{(item.price * item.quantity).toFixed(2)} €</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Delivery person */}
        {order.deliveryPerson && !compact && isExpanded && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Livreur</h4>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full mr-2">
                  <User size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{order.deliveryPerson.name}</p>
                  <div className="flex items-center text-xs text-yellow-500 mt-0.5">
                    {"★".repeat(Math.round(order.deliveryPerson.rating))}
                    <span className="text-gray-500 ml-1">{order.deliveryPerson.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              
              <a 
                href={`tel:${order.deliveryPerson.phone}`} 
                className="inline-flex items-center p-1.5 bg-blue-100 rounded-full text-blue-700 hover:bg-blue-200"
              >
                <Phone size={16} />
              </a>
            </div>
          </div>
        )}
        
        {/* Payment method and tracking */}
        {!compact && isExpanded && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center">
              <CreditCard size={16} className="mr-1.5 text-gray-400" />
              <span className="text-sm text-gray-700">{order.paymentMethod}</span>
            </div>
            
            {order.tracking && (
              <a 
                href={order.tracking.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center text-blue-600 hover:underline text-sm"
              >
                <ExternalLink size={14} className="mr-1" />
                Suivi {order.tracking.trackingNumber}
              </a>
            )}
          </div>
        )}
        
        {/* Footer with toggle and details link */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          {!compact && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={16} className="mr-1" />
                  Moins de détails
                </>
              ) : (
                <>
                  <ChevronDown size={16} className="mr-1" />
                  Plus de détails
                </>
              )}
            </button>
          )}
          
          <Link
            href={`/client/orders/${order.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {compact ? "Détails" : "Voir la commande"}
            <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
} 