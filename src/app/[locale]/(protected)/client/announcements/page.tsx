"use client"

import { useTranslations } from "next-intl"
import { ClientAnnouncementsList } from "@/features/announcements/components/client-announcements-list"
import { useAnnouncementStats } from "@/features/announcements/hooks/useAnnouncementStats"
import Link from "next/link"

export default function ClientAnnouncementsPage() {
  const t = useTranslations()
  const stats = useAnnouncementStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('announcements.title', 'Mes annonces')}
            </h1>
            <p className="text-gray-600">
              {t('announcements.subtitle', 'Gérez vos demandes de livraison et suivez leur progression')}
            </p>
          </div>
          <Link
            href="/client/announcements/create"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            + {t('announcements.new', 'Nouvelle annonce')}
          </Link>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="text-blue-600">📢</div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  {t('announcements.stats.active', 'Actives')}
                </h3>
                {stats.isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <div className="text-orange-600">🤝</div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  {t('announcements.stats.matched', 'Matchées')}
                </h3>
                {stats.isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{stats.matched}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="text-green-600">✅</div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  {t('announcements.stats.completed', 'Complétées')}
                </h3>
                {stats.isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <div className="text-purple-600">💰</div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  {t('announcements.stats.saved', 'Économisé')}
                </h3>
                {stats.isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSaved}€</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Liste des annonces */}
        <ClientAnnouncementsList />
      </div>
    </div>
  )
}