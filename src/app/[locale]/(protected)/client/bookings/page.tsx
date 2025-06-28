"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useClientBookings } from '@/features/bookings/hooks/useClientBookings'
import Link from 'next/link'

export default function ClientBookingsPage() {
  const t = useTranslations()
  const { bookings, loading, error, filters, setFilters, cancelBooking, rateBooking } = useClientBookings()
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'PENDING': 'En attente',
      'CONFIRMED': 'Confirmée',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminée',
      'CANCELLED': 'Annulée'
    }
    return labels[status as keyof typeof labels] || status
  }

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt('Raison de l\'annulation:')
    if (reason && await cancelBooking(bookingId, reason)) {
      alert('Réservation annulée avec succès')
    }
  }

  const handleRateBooking = async (bookingId: string) => {
    const rating = parseInt(prompt('Note (1-5):') || '0')
    const review = prompt('Commentaire (optionnel):')
    
    if (rating >= 1 && rating <= 5 && await rateBooking(bookingId, rating, review || undefined)) {
      alert('Évaluation enregistrée avec succès')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="text-red-600 text-lg mb-2">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('bookings.title', 'Mes Réservations')}
            </h1>
            <p className="text-gray-600">
              {t('bookings.subtitle', 'Gérez vos réservations de services à domicile')}
            </p>
          </div>
          <Link
            href="/client/services"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            + {t('bookings.newBooking', 'Nouvelle réservation')}
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('bookings.filters', 'Filtres')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bookings.status', 'Statut')}
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">{t('bookings.allStatuses', 'Tous les statuts')}</option>
                <option value="PENDING">{t('bookings.statusPending', 'En attente')}</option>
                <option value="CONFIRMED">{t('bookings.statusConfirmed', 'Confirmée')}</option>
                <option value="IN_PROGRESS">{t('bookings.statusInProgress', 'En cours')}</option>
                <option value="COMPLETED">{t('bookings.statusCompleted', 'Terminée')}</option>
                <option value="CANCELLED">{t('bookings.statusCancelled', 'Annulée')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bookings.serviceType', 'Type de service')}
              </label>
              <select
                value={filters.serviceType || ''}
                onChange={(e) => setFilters({ ...filters, serviceType: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">{t('bookings.allServices', 'Tous les services')}</option>
                <option value="CLEANING">{t('bookings.cleaning', 'Ménage')}</option>
                <option value="GARDENING">{t('bookings.gardening', 'Jardinage')}</option>
                <option value="HANDYMAN">{t('bookings.handyman', 'Bricolage')}</option>
                <option value="PET_CARE">{t('bookings.petCare', 'Garde d\'animaux')}</option>
                <option value="TUTORING">{t('bookings.tutoring', 'Cours particuliers')}</option>
                <option value="BEAUTY">{t('bookings.beauty', 'Soins beauté')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bookings.dateFrom', 'Date de début')}
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bookings.dateTo', 'Date de fin')}
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Liste des réservations */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm border">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('bookings.empty', 'Aucune réservation')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('bookings.emptyDesc', 'Vous n\'avez pas encore de réservation de service.')}
            </p>
            <Link
              href="/client/services"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 inline-block"
            >
              {t('bookings.exploreServices', 'Explorer les services')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{booking.serviceType}</h3>
                    <p className="text-gray-600">{booking.providerName}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-sm text-gray-600 ml-1">{booking.providerRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <span className="font-medium w-20">📅 Date:</span>
                    <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">⏱️ Durée:</span>
                    <span>{booking.duration} min</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">📍 Lieu:</span>
                    <span className="truncate">{booking.location}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">💰 Prix:</span>
                    <span className="font-semibold">{booking.price}€</span>
                  </div>
                </div>

                {booking.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{booking.description}</p>
                )}

                <div className="flex space-x-2">
                  <Link
                    href={`/client/bookings/${booking.id}`}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center text-sm"
                  >
                    {t('bookings.viewDetails', 'Voir détails')}
                  </Link>
                  
                  {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                    >
                      {t('bookings.cancel', 'Annuler')}
                    </button>
                  ) : booking.status === 'COMPLETED' && !booking.rating ? (
                    <button
                      onClick={() => handleRateBooking(booking.id)}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm"
                    >
                      {t('bookings.rate', 'Noter')}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}