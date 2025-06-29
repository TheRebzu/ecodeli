'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Clock, Euro, Package, Filter } from 'lucide-react'

interface Opportunity {
  id: string
  title: string
  description: string
  type: string
  basePrice: number
  distance: number
  pickupAddress: string
  deliveryAddress: string
  isUrgent: boolean
  estimatedDuration: number
  client: {
    name: string
    rating?: number
  }
}

export function OpportunitiesList() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    maxDistance: 50,
    minPrice: '',
    type: '',
    urgentOnly: false
  })

  useEffect(() => {
    fetchOpportunities()
  }, [filters])

  const fetchOpportunities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.maxDistance) params.append('maxDistance', filters.maxDistance.toString())
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.type) params.append('type', filters.type)
      if (filters.urgentOnly) params.append('urgentOnly', 'true')

      const response = await fetch(`/api/deliverer/opportunities?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.opportunities || [])
      }
    } catch (error) {
      console.error('Erreur chargement opportunités:', error)
    } finally {
      setLoading(false)
    }
  }

  const acceptOpportunity = async (opportunityId: string) => {
    try {
      const response = await fetch(`/api/deliverer/opportunities/${opportunityId}/accept`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Retirer l'opportunité de la liste après acceptation
        setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId))
      }
    } catch (error) {
      console.error('Erreur acceptation:', error)
    }
  }

  const getTypeLabel = (type: string) => {
    const types = {
      'PACKAGE_DELIVERY': 'Colis',
      'DOCUMENT_DELIVERY': 'Documents', 
      'SHOPPING_DELIVERY': 'Courses',
      'URGENT_DELIVERY': 'Express'
    }
    return types[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors = {
      'PACKAGE_DELIVERY': 'bg-blue-100 text-blue-800',
      'DOCUMENT_DELIVERY': 'bg-green-100 text-green-800',
      'SHOPPING_DELIVERY': 'bg-purple-100 text-purple-800', 
      'URGENT_DELIVERY': 'bg-red-100 text-red-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Opportunités de livraison
          </CardTitle>
          <CardDescription>
            Trajets disponibles correspondant à votre zone et vos préférences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Distance max (km)</label>
              <Input
                type="number"
                value={filters.maxDistance}
                onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) || 50 }))}
                placeholder="50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prix minimum (€)</label>
              <Input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type de livraison</label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous types</SelectItem>
                  <SelectItem value="PACKAGE_DELIVERY">Colis</SelectItem>
                  <SelectItem value="DOCUMENT_DELIVERY">Documents</SelectItem>
                  <SelectItem value="SHOPPING_DELIVERY">Courses</SelectItem>
                  <SelectItem value="URGENT_DELIVERY">Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchOpportunities} className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Filtrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des opportunités */}
      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucune opportunité disponible</h3>
            <p className="text-muted-foreground">
              Modifiez vos filtres ou réessayez plus tard
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{opportunity.title}</h3>
                      <Badge className={getTypeColor(opportunity.type)}>
                        {getTypeLabel(opportunity.type)}
                      </Badge>
                      {opportunity.isUrgent && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-3">{opportunity.description}</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {opportunity.basePrice}€
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ~{(opportunity.basePrice * 0.85).toFixed(2)}€ net
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Récupération:</span>
                      <span>{opportunity.pickupAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-medium">Livraison:</span>
                      <span>{opportunity.deliveryAddress}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Distance: {opportunity.distance}km</span>
                      <span>•</span>
                      <span>~{opportunity.estimatedDuration}min</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Client:</span>
                      <span>{opportunity.client.name}</span>
                      {opportunity.client.rating && (
                        <span className="text-yellow-500">★ {opportunity.client.rating}/5</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Revenus: {(opportunity.basePrice * 0.85).toFixed(2)}€ • Commission EcoDeli: {(opportunity.basePrice * 0.15).toFixed(2)}€
                  </div>
                  <Button 
                    onClick={() => acceptOpportunity(opportunity.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accepter cette livraison
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}