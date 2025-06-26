"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Warehouse {
  id: string
  name: string
  address: string
  city: string
  availableBoxes: number
}

interface StorageBox {
  id: string
  number: string
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'
  dimensions: string
  pricePerDay: number
  startDate?: string
  endDate?: string
  warehouse?: {
    name: string
    address: string
    city: string
  }
  accessCode?: string
}

const sizeLabels = {
  SMALL: 'Petite',
  MEDIUM: 'Moyenne',
  LARGE: 'Grande',
  EXTRA_LARGE: 'Très grande'
}

const sizeColors = {
  SMALL: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-green-100 text-green-800',
  LARGE: 'bg-yellow-100 text-yellow-800',
  EXTRA_LARGE: 'bg-red-100 text-red-800'
}

export default function ClientStoragePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [clientBoxes, setClientBoxes] = useState<StorageBox[]>([])
  const [availableBoxes, setAvailableBoxes] = useState<StorageBox[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [reservationDialog, setReservationDialog] = useState(false)
  
  // Formulaire de recherche
  const [searchForm, setSearchForm] = useState({
    warehouseId: '',
    size: '',
    startDate: '',
    duration: '7'
  })

  // Formulaire de réservation
  const [reservationForm, setReservationForm] = useState({
    selectedBox: null as StorageBox | null,
    duration: 7,
    description: ''
  })

  const t = useTranslations()

  useEffect(() => {
    fetchStorageData()
  }, [])

  const fetchStorageData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/client/storage-boxes')
      
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data.warehouses || [])
        setClientBoxes(data.clientBoxes || [])
      }
    } catch (error) {
      console.error('Erreur récupération données stockage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const searchAvailableBoxes = async () => {
    if (!searchForm.warehouseId || !searchForm.size || !searchForm.startDate) {
      alert('Veuillez remplir tous les champs de recherche')
      return
    }

    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        warehouseId: searchForm.warehouseId,
        size: searchForm.size,
        startDate: new Date(searchForm.startDate).toISOString()
      })

      const response = await fetch(`/api/client/storage-boxes?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setAvailableBoxes(data.availableBoxes || [])
      }
    } catch (error) {
      console.error('Erreur recherche box:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const reserveBox = async () => {
    if (!reservationForm.selectedBox) return

    try {
      const response = await fetch('/api/client/storage-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: searchForm.warehouseId,
          size: searchForm.size,
          duration: reservationForm.duration,
          startDate: new Date(searchForm.startDate).toISOString(),
          description: reservationForm.description
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Box réservée ! Code d'accès: ${data.reservation.accessCode}`)
        setReservationDialog(false)
        fetchStorageData() // Recharger les données
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur réservation box:', error)
      alert('Erreur lors de la réservation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const calculateTotalPrice = (pricePerDay: number, duration: number) => {
    return (pricePerDay * duration).toFixed(2)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📦 Stockage Temporaire
          </h1>
          <p className="text-gray-600">
            Réservez des box de stockage dans nos {warehouses.length} entrepôts EcoDeli disponibles
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="search">Réserver</TabsTrigger>
            <TabsTrigger value="my-boxes">Mes Box ({clientBoxes.length})</TabsTrigger>
          </TabsList>

          {/* Onglet de recherche et réservation */}
          <TabsContent value="search" className="space-y-6">
            {/* Formulaire de recherche */}
            <Card>
              <CardHeader>
                <CardTitle>🔍 Rechercher une box disponible</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="warehouse">Entrepôt</Label>
                    <Select
                      value={searchForm.warehouseId}
                      onValueChange={(value) => setSearchForm({...searchForm, warehouseId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un entrepôt" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} - {warehouse.city} ({warehouse.availableBoxes} box)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="size">Taille</Label>
                    <Select
                      value={searchForm.size}
                      onValueChange={(value) => setSearchForm({...searchForm, size: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Taille de box" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMALL">Petite (50x50x50cm) - 2.50€/jour</SelectItem>
                        <SelectItem value="MEDIUM">Moyenne (100x60x60cm) - 4.00€/jour</SelectItem>
                        <SelectItem value="LARGE">Grande (120x80x80cm) - 6.50€/jour</SelectItem>
                        <SelectItem value="EXTRA_LARGE">Très grande (150x100x100cm) - 9.00€/jour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      type="date"
                      value={searchForm.startDate}
                      onChange={(e) => setSearchForm({...searchForm, startDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={searchAvailableBoxes}
                      disabled={isSearching}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isSearching ? '🔄 Recherche...' : '🔍 Rechercher'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Résultats de recherche */}
            {availableBoxes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>📋 Box disponibles ({availableBoxes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableBoxes.map((box) => (
                      <Card key={box.id} className="border-2 border-gray-200 hover:border-green-300">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">Box {box.number}</h4>
                              <Badge className={sizeColors[box.size]}>
                                {sizeLabels[box.size]}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              <p>📏 {box.dimensions}</p>
                              <p>💰 {box.pricePerDay}€/jour</p>
                              <p>📍 {box.warehouse?.name}</p>
                            </div>

                            <Dialog open={reservationDialog} onOpenChange={setReservationDialog}>
                              <DialogTrigger asChild>
                                <Button 
                                  className="w-full"
                                  onClick={() => {
                                    setReservationForm({
                                      ...reservationForm,
                                      selectedBox: box
                                    })
                                  }}
                                >
                                  Réserver
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>📦 Réserver la box {reservationForm.selectedBox?.number}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="duration">Durée (jours)</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="90"
                                      value={reservationForm.duration}
                                      onChange={(e) => setReservationForm({
                                        ...reservationForm,
                                        duration: parseInt(e.target.value)
                                      })}
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="description">Description (optionnel)</Label>
                                    <Textarea
                                      placeholder="Décrivez le contenu à stocker..."
                                      value={reservationForm.description}
                                      onChange={(e) => setReservationForm({
                                        ...reservationForm,
                                        description: e.target.value
                                      })}
                                    />
                                  </div>

                                  {reservationForm.selectedBox && (
                                    <div className="p-4 bg-green-50 rounded-lg">
                                      <h5 className="font-medium text-green-900 mb-2">Récapitulatif</h5>
                                      <div className="text-sm text-green-800 space-y-1">
                                        <p>Box: {reservationForm.selectedBox.number} ({reservationForm.selectedBox.dimensions})</p>
                                        <p>Durée: {reservationForm.duration} jour(s)</p>
                                        <p className="font-semibold">
                                          Total: {calculateTotalPrice(reservationForm.selectedBox.pricePerDay, reservationForm.duration)}€
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <Button onClick={reserveBox} className="w-full bg-green-600 hover:bg-green-700">
                                    💳 Confirmer la réservation
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet des box actuelles */}
          <TabsContent value="my-boxes">
            {clientBoxes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-gray-500 text-lg mb-4">
                    Aucune box réservée actuellement
                  </div>
                  <p className="text-gray-400 mb-6">
                    Réservez une box de stockage pour vos biens temporaires
                  </p>
                  <Button variant="outline">
                    🔍 Rechercher une box
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {clientBoxes.map((box) => (
                  <Card key={box.id} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            📦 Box {box.number}
                            <Badge className={sizeColors[box.size]}>
                              {sizeLabels[box.size]}
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            📍 {box.warehouse?.name} - {box.warehouse?.city}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {box.pricePerDay}€/jour
                          </div>
                          <div className="text-sm text-gray-500">
                            {box.dimensions}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Période</h5>
                          <p className="text-sm text-gray-600">
                            📅 Du {box.startDate && formatDate(box.startDate)}
                          </p>
                          <p className="text-sm text-gray-600">
                            📅 Au {box.endDate && formatDate(box.endDate)}
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Code d'accès</h5>
                          <div className="p-2 bg-gray-100 rounded font-mono text-lg text-center">
                            🔑 {box.accessCode}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Adresse</h5>
                          <p className="text-sm text-gray-600">
                            📍 {box.warehouse?.address}
                          </p>
                          <p className="text-sm text-gray-600">
                            {box.warehouse?.city}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t">
                        <Button variant="outline" size="sm">
                          📞 Contacter l'entrepôt
                        </Button>
                        <Button variant="outline" size="sm">
                          🕒 Prolonger
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          🗑️ Libérer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 