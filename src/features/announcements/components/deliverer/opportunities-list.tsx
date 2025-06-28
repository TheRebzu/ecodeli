"use client"

import { useState } from "react"
import { useOpportunities } from "@/features/announcements/hooks/useOpportunities"
import { AnnouncementCard } from "../shared/announcement-card"
import { AnnouncementFilters } from "../shared/announcement-filters"

interface OpportunitiesListProps {
  showFilters?: boolean
}

export function OpportunitiesList({ showFilters = true }: OpportunitiesListProps) {
  const [filters, setFilters] = useState({})
  
  const {
    opportunities,
    loading,
    error,
    pagination,
    refresh,
    acceptOpportunity,
    accepting
  } = useOpportunities({ filters })

  const handleAcceptOpportunity = async (opportunityId: string) => {
    try {
      await acceptOpportunity(opportunityId)
      // Show success message
    } catch (err) {
      // Error is handled by the hook
    }
  }

  const calculateDistance = (opportunity: any) => {
    // This would typically use the deliverer's current location
    // For now, we'll use the match score as a proxy
    return opportunity.matchScore ? `${(opportunity.matchScore * 50).toFixed(1)} km` : 'N/A'
  }

  const formatEarnings = (price: number, matchScore: number) => {
    // Calculate estimated earnings (platform takes a percentage)
    const platformFee = 0.15 // 15% platform fee
    const estimatedEarnings = price * (1 - platformFee) * matchScore
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(estimatedEarnings)
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <AnnouncementFilters
          statusFilters={[
            { key: 'all', label: 'Toutes' },
            { key: 'ACTIVE', label: 'Disponibles' }
          ]}
          urgencyFilters={[
            { key: 'all', label: 'Toutes' },
            { key: 'URGENT', label: '🚨 Urgentes' },
            { key: 'HIGH', label: 'Élevée' },
            { key: 'MEDIUM', label: 'Moyenne' },
            { key: 'LOW', label: 'Faible' }
          ]}
          onFiltersChange={setFilters}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Opportunités disponibles
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {pagination.total} opportunité(s)
              </span>
              <button
                onClick={refresh}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '🔄 Actualisation...' : '🔄 Actualiser'}
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y">
          {loading && opportunities.length === 0 ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune opportunité disponible
              </h3>
              <p className="text-gray-600 mb-4">
                Aucune livraison ne correspond à vos trajets actuels.
              </p>
              <button
                onClick={refresh}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
              >
                Vérifier à nouveau
              </button>
            </div>
          ) : (
            opportunities.map((opportunity) => (
              <div key={opportunity.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <AnnouncementCard
                      announcement={opportunity.announcement}
                      viewerRole="DELIVERER"
                      showActions={false}
                    />
                  </div>
                </div>

                {/* Match Details */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    🎯 Détails du matching
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-green-700 font-medium">Score de compatibilité:</span>
                      <div className="text-green-900">
                        {Math.round(opportunity.matchScore * 100)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Distance estimée:</span>
                      <div className="text-green-900">
                        {calculateDistance(opportunity)}
                      </div>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Gains estimés:</span>
                      <div className="text-green-900 font-semibold">
                        {formatEarnings(opportunity.announcement.price, opportunity.matchScore)}
                      </div>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Votre trajet:</span>
                      <div className="text-green-900 text-xs truncate">
                        {opportunity.delivererRoute?.startAddress} → {opportunity.delivererRoute?.endAddress}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Correspondance trouvée {new Date(opportunity.createdAt).toLocaleString('fr-FR')}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Plus d'infos
                    </button>
                    <button
                      onClick={() => handleAcceptOpportunity(opportunity.id)}
                      disabled={accepting === opportunity.id}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {accepting === opportunity.id ? (
                        <>🔄 Acceptation...</>
                      ) : (
                        <>✅ Accepter cette livraison</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-6 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {/* Handle previous page */}}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => {/* Handle next page */}}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Suivant →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}