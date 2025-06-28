"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface FilterOption {
  key: string
  label: string
  count?: number
}

interface AnnouncementFiltersProps {
  statusFilters?: FilterOption[]
  typeFilters?: FilterOption[]
  urgencyFilters?: FilterOption[]
  onFiltersChange?: (filters: Record<string, any>) => void
  showSearch?: boolean
}

export function AnnouncementFilters({
  statusFilters = [
    { key: 'all', label: 'Toutes' },
    { key: 'ACTIVE', label: 'Actives' },
    { key: 'MATCHED', label: 'Matchées' },
    { key: 'IN_PROGRESS', label: 'En cours' },
    { key: 'COMPLETED', label: 'Terminées' },
    { key: 'CANCELLED', label: 'Annulées' }
  ],
  typeFilters = [
    { key: 'all', label: 'Tous types' },
    { key: 'PACKAGE', label: '📦 Colis' },
    { key: 'SERVICE', label: '🛠️ Service' },
    { key: 'CART_DROP', label: '🛒 Chariot' }
  ],
  urgencyFilters = [
    { key: 'all', label: 'Toutes' },
    { key: 'LOW', label: 'Faible' },
    { key: 'MEDIUM', label: 'Moyenne' },
    { key: 'HIGH', label: 'Élevée' },
    { key: 'URGENT', label: '🚨 Urgente' }
  ],
  onFiltersChange,
  showSearch = true
}: AnnouncementFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    type: searchParams.get('type') || 'all',
    urgency: searchParams.get('urgency') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || ''
  })

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    
    // Update URL
    const params = new URLSearchParams()
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value)
      }
    })
    
    const queryString = params.toString()
    router.push(`?${queryString}`)
    
    // Notify parent component
    if (onFiltersChange) {
      const cleanFilters = Object.fromEntries(
        Object.entries(updatedFilters).filter(([_, value]) => value && value !== 'all' && value !== '')
      )
      onFiltersChange(cleanFilters)
    }
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      status: 'all',
      type: 'all',
      urgency: 'all',
      minPrice: '',
      maxPrice: '',
      dateFrom: '',
      dateTo: ''
    }
    setFilters(clearedFilters)
    router.push('?')
    if (onFiltersChange) {
      onFiltersChange({})
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Search */}
      {showSearch && (
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Rechercher
          </label>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Titre, description, adresse..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Statut
        </label>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((option) => (
            <button
              key={option.key}
              onClick={() => updateFilters({ status: option.key })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.status === option.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
              {option.count !== undefined && (
                <span className="ml-1 text-xs opacity-75">({option.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type d'annonce
        </label>
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((option) => (
            <button
              key={option.key}
              onClick={() => updateFilters({ type: option.key })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.type === option.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
              {option.count !== undefined && (
                <span className="ml-1 text-xs opacity-75">({option.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Urgency Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Urgence
        </label>
        <div className="flex flex-wrap gap-2">
          {urgencyFilters.map((option) => (
            <button
              key={option.key}
              onClick={() => updateFilters({ urgency: option.key })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.urgency === option.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
              {option.count !== undefined && (
                <span className="ml-1 text-xs opacity-75">({option.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fourchette de prix (€)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => updateFilters({ minPrice: e.target.value })}
            placeholder="Min"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => updateFilters({ maxPrice: e.target.value })}
            placeholder="Max"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Période de collecte
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Clear Filters */}
      <div className="pt-4 border-t">
        <button
          onClick={clearFilters}
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Effacer les filtres
        </button>
      </div>
    </div>
  )
}