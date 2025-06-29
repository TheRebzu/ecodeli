'use client'

import { useState, useEffect } from 'react'
import { LeafletMap, MapMarker } from './leaflet-map'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Address {
  formatted: string
  lat: number
  lon: number
  street?: string
  city?: string
  postcode?: string
  country?: string
}

interface AddressPickerProps {
  onAddressSelect: (address: Address) => void
  initialAddress?: Address
  placeholder?: string
  height?: string
  className?: string
}

export function AddressPicker({
  onAddressSelect,
  initialAddress,
  placeholder = 'Rechercher une adresse...',
  height = '400px',
  className
}: AddressPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(initialAddress || null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522])

  useEffect(() => {
    if (initialAddress) {
      setMapCenter([initialAddress.lat, initialAddress.lon])
      setSearchQuery(initialAddress.formatted)
    }
  }, [initialAddress])

  const searchAddress = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: 'json',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'fr'
        })
      )

      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      const addresses: Address[] = data.map((item: any) => ({
        formatted: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        street: item.address?.road,
        city: item.address?.city || item.address?.town || item.address?.village,
        postcode: item.address?.postcode,
        country: item.address?.country
      }))

      setSuggestions(addresses)
    } catch (error) {
      console.error('Address search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleAddressClick = (address: Address) => {
    setSelectedAddress(address)
    setMapCenter([address.lat, address.lon])
    setSearchQuery(address.formatted)
    setSuggestions([])
    onAddressSelect(address)
  }

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: lat.toString(),
          lon: lng.toString(),
          format: 'json',
          addressdetails: '1'
        })
      )

      if (!response.ok) throw new Error('Reverse geocoding failed')

      const data = await response.json()
      const address: Address = {
        formatted: data.display_name,
        lat: lat,
        lon: lng,
        street: data.address?.road,
        city: data.address?.city || data.address?.town || data.address?.village,
        postcode: data.address?.postcode,
        country: data.address?.country
      }

      handleAddressClick(address)
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    }
  }

  const markers: MapMarker[] = selectedAddress
    ? [{
        id: 'selected',
        position: [selectedAddress.lat, selectedAddress.lon],
        type: 'custom',
        popup: selectedAddress.formatted
      }]
    : []

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          onClick={searchAddress}
          disabled={searching}
          variant="secondary"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <Card className="p-2 max-h-48 overflow-y-auto">
          {suggestions.map((address, index) => (
            <div
              key={index}
              className="p-2 hover:bg-secondary rounded cursor-pointer flex items-center gap-2"
              onClick={() => handleAddressClick(address)}
            >
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm">{address.formatted}</p>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Cliquez sur la carte pour sélectionner une adresse
        </p>
        <LeafletMap
          center={mapCenter}
          zoom={15}
          height={height}
          markers={markers}
          onMapClick={handleMapClick}
          enableGeolocation
          className="rounded-lg overflow-hidden shadow-md"
        />
      </div>

      {selectedAddress && (
        <Card className="p-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Adresse sélectionnée</p>
              <p className="text-sm text-muted-foreground">{selectedAddress.formatted}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}