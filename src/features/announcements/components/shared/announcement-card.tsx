"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AnnouncementStatus } from "./announcement-status";
import type { Announcement } from "@/features/announcements/types/announcement.types";

interface AnnouncementCardProps {
  announcement: Announcement;
  viewerRole: "CLIENT" | "DELIVERER" | "MERCHANT" | "ADMIN";
  showActions?: boolean;
  onStatusChange?: (id: string, status: string) => void;
}

export function AnnouncementCard({
  announcement,
  viewerRole,
  showActions = true,
  onStatusChange,
}: AnnouncementCardProps) {
  const getTypeIcon = (type: string) => {
    const icons = {
      PACKAGE: "📦",
      SERVICE: "🛠️",
      CART_DROP: "🛒",
    };
    return icons[type as keyof typeof icons] || "📦";
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      LOW: "text-green-600",
      MEDIUM: "text-yellow-600",
      HIGH: "text-orange-600",
      URGENT: "text-red-600",
    };
    return colors[urgency as keyof typeof colors] || "text-gray-600";
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const getActionButtons = () => {
    switch (viewerRole) {
      case "CLIENT":
      case "MERCHANT":
        return (
          <div className="flex items-center space-x-2">
            <Link
              href={`/${viewerRole.toLowerCase()}/announcements/${announcement.id}`}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm"
            >
              Détails
            </Link>
            {announcement.status === "ACTIVE" && (
              <Link
                href={`/${viewerRole.toLowerCase()}/announcements/${announcement.id}/edit`}
                className="bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 text-sm"
              >
                Modifier
              </Link>
            )}
          </div>
        );
      case "DELIVERER":
        return announcement.status === "ACTIVE" ? (
          <Link
            href={`/deliverer/opportunities/${announcement.id}`}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm"
          >
            Voir opportunité
          </Link>
        ) : null;
      case "ADMIN":
        return (
          <div className="flex items-center space-x-2">
            <Link
              href={`/admin/announcements/${announcement.id}`}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm"
            >
              Modérer
            </Link>
            {announcement.flagged && (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                🚩 Signalée
              </span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getTypeIcon(announcement.type)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {announcement.title}
            </h3>
            <div className="flex items-center space-x-3">
              <AnnouncementStatus status={announcement.status} />
              <span
                className={`text-sm font-medium ${getUrgencyColor(announcement.urgency)}`}
              >
                {announcement.urgency === "URGENT" && "🚨 "}
                {announcement.urgency}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {formatPrice(announcement.price)}
          </div>
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(announcement.createdAt), {
              addSuffix: true,
              locale: fr,
            })}
          </div>
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-2">
        {announcement.description}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-2">
          <span>Départ :</span>
          <span className="truncate">{announcement.pickupAddress}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Arrivée :</span>
          <span className="truncate">{announcement.deliveryAddress}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Date :</span>
          <span>
            {new Date(announcement.pickupDate).toLocaleDateString("fr-FR")}
          </span>
        </div>
        {announcement.type === "PACKAGE" && announcement.packageDetails && (
          <div className="flex items-center space-x-2">
            <span>Poids :</span>
            <span>{announcement.packageDetails.weight}kg</span>
            {announcement.packageDetails.fragile && (
              <span className="text-orange-600">Fragile</span>
            )}
          </div>
        )}
      </div>

      {announcement.tags && announcement.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {announcement.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {announcement._count?.applications !== undefined && (
              <span>{announcement._count.applications} candidature(s)</span>
            )}
            {announcement._count?.routeMatches !== undefined && (
              <span>{announcement._count.routeMatches} match(es)</span>
            )}
          </div>
          {getActionButtons()}
        </div>
      )}
    </div>
  );
}
