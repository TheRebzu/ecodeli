"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  price: number;
  status: "ACTIVE" | "PAUSED" | "MATCHED" | "COMPLETED" | "CANCELLED";
  serviceType: string;
  createdAt: string;
  pickupDate: string;
  deliveryDeadline: string;
  _count: {
    applications: number;
  };
}

export default function ClientAnnouncementsList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const t = useTranslations();

  useEffect(() => {
    fetchAnnouncements();
  }, [filter]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter.toUpperCase());

      const response = await fetch(
        `/api/client/announcements?${params.toString()}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement");
      }

      setAnnouncements(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      ACTIVE: "bg-green-100 text-green-800",
      PAUSED: "bg-yellow-100 text-yellow-800",
      MATCHED: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-gray-100 text-gray-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      ACTIVE: "Active",
      PAUSED: "En pause",
      MATCHED: "Matchée",
      COMPLETED: "Terminée",
      CANCELLED: "Annulée",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getServiceTypeIcon = (serviceType: string) => {
    const icons = {
      PACKAGE_DELIVERY: "📦",
      PERSON_TRANSPORT: "🚗",
      SHOPPING: "🛒",
      PET_CARE: "🐕",
      HOME_SERVICE: "🏠",
      CART_DROP: "🛒",
    };
    return icons[serviceType as keyof typeof icons] || "📦";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnnouncements}
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
      {/* Filtres */}
      <div className="p-6 border-b">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Toutes" },
            { key: "active", label: "Actives" },
            { key: "matched", label: "Matchées" },
            { key: "completed", label: "Terminées" },
          ].map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterOption.key
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des annonces */}
      <div className="divide-y">
        {announcements.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune annonce
            </h3>
            <p className="text-gray-600 mb-4">
              Vous n'avez pas encore créé d'annonce
            </p>
            <Link
              href="/client/announcements/create"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 inline-block"
            >
              Créer ma première annonce
            </Link>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">
                      {getServiceTypeIcon(announcement.serviceType)}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(announcement.status)}`}
                    >
                      {getStatusLabel(announcement.status)}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {announcement.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">De:</span>{" "}
                      {announcement.pickupAddress}
                    </div>
                    <div>
                      <span className="font-medium">Vers:</span>{" "}
                      {announcement.deliveryAddress}
                    </div>
                    <div>
                      <span className="font-medium">Poids:</span>{" "}
                      {announcement.weight}kg
                    </div>
                    <div>
                      <span className="font-medium">Prix:</span>{" "}
                      {announcement.price || 0}€
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span>
                      📅 Collecte:{" "}
                      {new Date(announcement.pickupDate).toLocaleDateString()}
                    </span>
                    <span>
                      ⏰ Échéance:{" "}
                      {new Date(
                        announcement.deliveryDeadline,
                      ).toLocaleDateString()}
                    </span>
                    <span>
                      👥 {announcement._count.applications} candidature(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    href={`/client/announcements/${announcement.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Voir détails
                  </Link>

                  {announcement.status === "ACTIVE" && (
                    <Link
                      href={`/client/announcements/${announcement.id}/edit`}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Modifier
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
