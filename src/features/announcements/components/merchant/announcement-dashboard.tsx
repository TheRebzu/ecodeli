"use client";

import { useState, useEffect } from "react";
import { useAnnouncements } from "@/features/announcements/hooks/useAnnouncements";
import { AnnouncementCard } from "../shared/announcement-card";
import { AnnouncementFilters } from "../shared/announcement-filters";
import Link from "next/link";

interface DashboardStats {
  totalAnnouncements: number;
  activeAnnouncements: number;
  completedAnnouncements: number;
  pendingPayments: number;
  totalRevenue: number;
  averagePrice: number;
  successRate: number;
  recurringTemplates: number;
}

export function AnnouncementDashboard() {
  const [filters, setFilters] = useState({});
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  const { announcements, loading, error, pagination, refresh } =
    useAnnouncements({
      filters,
      role: "MERCHANT",
      pagination: { page: 1, limit: 10 },
    });

  useEffect(() => {
    loadDashboardStats();
  }, [timeRange]);

  const loadDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(
        `/api/merchant/analytics/announcements?period=${timeRange}`,
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const quickActions = [
    {
      title: "Nouvelle annonce",
      description: "Créer une annonce de livraison",
      icon: "📦",
      href: "/merchant/announcements/create",
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      title: "Import en masse",
      description: "Importer plusieurs annonces",
      icon: "📊",
      href: "/merchant/announcements/bulk-import",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Annonces récurrentes",
      description: "Gérer les modèles récurrents",
      icon: "🔄",
      href: "/merchant/announcements/recurring",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      title: "Configuration chariot",
      description: "Paramétrer le lâcher de chariot",
      icon: "🛒",
      href: "/merchant/cart-drop/settings",
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusColor = (
    value: number,
    goodThreshold: number,
    excellentThreshold: number,
  ) => {
    if (value >= excellentThreshold) return "text-green-600";
    if (value >= goodThreshold) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tableau de bord - Annonces
          </h1>
          <p className="text-gray-600">
            Gérez vos annonces et suivez vos performances
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">1 an</option>
          </select>
          <button
            onClick={() => {
              refresh();
              loadDashboardStats();
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className={`${action.color} text-white p-6 rounded-lg transition-colors group`}
          >
            <div className="flex items-center">
              <span className="text-3xl mr-4">{action.icon}</span>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-white">
                  {action.title}
                </h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Statistics */}
      {loadingStats ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : stats ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Statistiques
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total annonces</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalAnnouncements}
              </div>
              <div className="text-xs text-gray-400">
                {stats.activeAnnouncements} actives
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">
                Chiffre d'affaires
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="text-xs text-gray-400">
                Moyenne: {formatCurrency(stats.averagePrice)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Taux de succès</div>
              <div
                className={`text-2xl font-bold ${getStatusColor(stats.successRate, 70, 85)}`}
              >
                {stats.successRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">
                {stats.completedAnnouncements} complétées
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">
                Paiements en attente
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.pendingPayments}
              </div>
              <div className="text-xs text-gray-400">
                {stats.recurringTemplates} récurrentes
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <AnnouncementFilters
            onFiltersChange={setFilters}
            statusFilters={[
              { key: "all", label: "Toutes" },
              { key: "ACTIVE", label: "Actives" },
              { key: "MATCHED", label: "Matchées" },
              { key: "IN_PROGRESS", label: "En cours" },
              { key: "COMPLETED", label: "Terminées" },
              { key: "CANCELLED", label: "Annulées" },
            ]}
          />
        </div>

        {/* Announcements List */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Mes annonces récentes
                </h2>
                <Link
                  href="/merchant/announcements"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Voir toutes →
                </Link>
              </div>
            </div>

            <div className="divide-y">
              {loading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <div className="text-red-600 text-4xl mb-2">⚠️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Erreur de chargement
                  </h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={refresh}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Réessayer
                  </button>
                </div>
              ) : announcements.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune annonce
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Vous n'avez pas encore créé d'annonce
                  </p>
                  <Link
                    href="/merchant/announcements/create"
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 inline-block"
                  >
                    Créer ma première annonce
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-6">
                      <AnnouncementCard
                        announcement={announcement}
                        viewerRole="MERCHANT"
                        showActions={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Page {pagination.page} sur {pagination.totalPages}(
                    {pagination.total} annonces au total)
                  </span>
                  <Link
                    href="/merchant/announcements"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Voir toutes les annonces
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Activité récente
        </h2>
        <div className="space-y-3">
          {announcements.slice(0, 5).map((announcement) => (
            <div
              key={announcement.id}
              className="flex items-center space-x-3 text-sm"
            >
              <span className="text-lg">
                {announcement.type === "PACKAGE"
                  ? "📦"
                  : announcement.type === "SERVICE"
                    ? "🛠️"
                    : "🛒"}
              </span>
              <span className="flex-1 truncate">
                <span className="font-medium">{announcement.title}</span>
                <span className="text-gray-500 ml-2">
                                          • {formatCurrency(announcement.basePrice || 0)}
                </span>
              </span>
              <span className="text-gray-400">
                {new Date(announcement.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
