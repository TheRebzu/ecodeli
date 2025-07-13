"use client";

import { useState } from "react";
import { useAnnouncementTracking } from "@/features/announcements/hooks/useAnnouncementTracking";
import { AnnouncementStatus } from "../shared/announcement-status";

interface AnnouncementTrackingProps {
  announcementId: string;
  showMap?: boolean;
}

export function AnnouncementTracking({
  announcementId,
  showMap = false,
}: AnnouncementTrackingProps) {
  const {
    tracking,
    currentStatus,
    currentLocation,
    estimatedArrival,
    loading,
    error,
    refresh,
    isRealTimeActive,
    toggleRealTime,
  } = useAnnouncementTracking({ announcementId });

  const [showDetails, setShowDetails] = useState(false);

  const getStatusSteps = () => {
    return [
      { key: "ACTIVE", label: "Annonce publiée", icon: "📝", completed: true },
      {
        key: "MATCHED",
        label: "Livreur trouvé",
        icon: "🤝",
        completed: tracking.some((t) => t.status === "MATCHED"),
      },
      {
        key: "PICKUP_PENDING",
        label: "En route vers collecte",
        icon: "🚚",
        completed: tracking.some((t) => t.status === "PICKUP_PENDING"),
      },
      {
        key: "PICKED_UP",
        label: "Colis récupéré",
        icon: "📦",
        completed: tracking.some((t) => t.status === "PICKED_UP"),
      },
      {
        key: "IN_TRANSIT",
        label: "En livraison",
        icon: "🛣️",
        completed: tracking.some((t) => t.status === "IN_TRANSIT"),
      },
      {
        key: "DELIVERED",
        label: "Livré",
        icon: "✅",
        completed: tracking.some((t) => t.status === "DELIVERED"),
      },
    ];
  };

  const formatLocation = (location: any) => {
    if (!location) return "Position inconnue";
    if (location.address) return location.address;
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  const getTimelineIcon = (status: string) => {
    const icons = {
      ACTIVE: "📝",
      MATCHED: "🤝",
      PICKUP_PENDING: "🚚",
      PICKED_UP: "📦",
      IN_TRANSIT: "🛣️",
      DELIVERED: "✅",
      ISSUE: "⚠️",
      DELAYED: "⏰",
    };
    return icons[status as keyof typeof icons] || "📍";
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erreur de suivi
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Suivi de livraison
            </h2>
            {currentStatus && (
              <AnnouncementStatus status={currentStatus} size="md" />
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleRealTime}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                isRealTimeActive
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              <span>{isRealTimeActive ? "🟢" : "🔴"}</span>
              <span>
                {isRealTimeActive ? "Temps réel actif" : "Temps réel inactif"}
              </span>
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "🔄" : "🔄 Actualiser"}
            </button>
          </div>
        </div>
      </div>

      {/* Current Status */}
      {currentLocation && (
        <div className="p-6 bg-blue-50 border-b">
          <div className="flex items-start space-x-4">
            <div className="text-2xl">📍</div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">
                Position actuelle
              </h3>
              <p className="text-blue-700">{formatLocation(currentLocation)}</p>
              {estimatedArrival && (
                <p className="text-sm text-blue-600 mt-2">
                  ⏰ Arrivée estimée:{" "}
                  {new Date(estimatedArrival).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="p-6 border-b">
        <h3 className="font-medium text-gray-900 mb-4">Étapes de livraison</h3>
        <div className="space-y-4">
          {getStatusSteps().map((step, index) => (
            <div key={step.key} className="flex items-center space-x-4">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed
                    ? "bg-green-100 text-green-600 border-2 border-green-300"
                    : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                }`}
              >
                <span className="text-sm">{step.icon}</span>
              </div>
              <div className="flex-1">
                <span
                  className={`text-sm font-medium ${
                    step.completed ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {step.completed && (
                <div className="text-green-600 text-sm">✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Historique détaillé</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {showDetails ? "Masquer" : "Afficher"} les détails
          </button>
        </div>

        {showDetails && (
          <div className="space-y-4">
            {tracking.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Aucun événement de suivi disponible
              </p>
            ) : (
              tracking.map((update, index) => (
                <div
                  key={update.id}
                  className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm">
                      {getTimelineIcon(update.status)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <AnnouncementStatus status={update.status} size="sm" />
                      <span className="text-sm text-gray-500">
                        {new Date(update.timestamp).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    {update.message && (
                      <p className="text-gray-700 text-sm mb-2">
                        {update.message}
                      </p>
                    )}
                    {update.location && (
                      <p className="text-gray-500 text-xs">
                        📍 {formatLocation(update.location)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Map Integration Placeholder */}
      {showMap && currentLocation && (
        <div className="p-6 border-t">
          <h3 className="font-medium text-gray-900 mb-4">Carte de suivi</h3>
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🗺️</div>
              <p>Intégration carte à venir</p>
              <p className="text-sm">
                Position: {formatLocation(currentLocation)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
