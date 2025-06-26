"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Filter, Package, Users, Plane, ShoppingCart, Globe, Home, Heart, ShoppingCartIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/use-toast'

/**
 * Page de gestion des annonces client - Mission 1 EcoDeli
 * Tous les types d'annonces selon cahier des charges
 */

interface Announcement {
  id: string
  title: string
  description: string
  type: string
  status: 'DRAFT' | 'ACTIVE' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  price: number
  currency: string
  startLocation: {
    city: string
    address: string
  }
  endLocation: {
    city: string
    address: string
  }
  createdAt: string
  desiredDate?: string
  urgent: boolean
  matchCount?: number
  deliveries?: Array<{
    id: string
    status: string
    deliverer: {
      name: string
      rating: number
    }
  }>
}

const announcementTypes = [
  { value: 'PACKAGE_DELIVERY', label: 'Transport de colis', icon: Package, color: 'bg-blue-500' },
  { value: 'PERSON_TRANSPORT', label: 'Transport de personnes', icon: Users, color: 'bg-green-500' },
  { value: 'AIRPORT_TRANSFER', label: 'Transfert aéroport', icon: Plane, color: 'bg-purple-500' },
  { value: 'SHOPPING', label: 'Courses', icon: ShoppingCart, color: 'bg-orange-500' },
  { value: 'INTERNATIONAL_PURCHASE', label: 'Achats internationaux', icon: Globe, color: 'bg-red-500' },
  { value: 'HOME_SERVICE', label: 'Services à domicile', icon: Home, color: 'bg-yellow-500' },
  { value: 'PET_SITTING', label: 'Garde d\'animaux', icon: Heart, color: 'bg-pink-500' },
  { value: 'CART_DROP', label: 'Lâcher de chariot', icon: ShoppingCartIcon, color: 'bg-indigo-500' }
]

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-500', textColor: 'text-gray-600' },
  ACTIVE: { label: 'Active', color: 'bg-green-500', textColor: 'text-green-600' },
  MATCHED: { label: 'Matchée', color: 'bg-blue-500', textColor: 'text-blue-600' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  COMPLETED: { label: 'Terminée', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-500', textColor: 'text-red-600' }
}

export default function ClientAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('all')
  
  const router = useRouter()
  const t = useTranslations('announcements')
  const { toast } = useToast()

  // Charger les annonces
  useEffect(() => {
    fetchAnnouncements()
  }, [])

  // Filtrer les annonces
  useEffect(() => {
    let filtered = announcements

    // Filtre par onglet
    if (activeTab !== 'all') {
      filtered = filtered.filter(a => {
        switch (activeTab) {
          case 'active': return ['ACTIVE', 'MATCHED'].includes(a.status)
          case 'progress': return a.status === 'IN_PROGRESS'
          case 'completed': return a.status === 'COMPLETED'
          case 'drafts': return a.status === 'DRAFT'
          default: return true
        }
      })
    }

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.startLocation.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.endLocation.city.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtre par type
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType)
    }

    // Filtre par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.status === selectedStatus)
    }

    setFilteredAnnouncements(filtered)
  }, [announcements, searchTerm, selectedType, selectedStatus, activeTab])

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/client/announcements')
      if (!response.ok) throw new Error('Erreur de chargement')
      
      const data = await response.json()
      setAnnouncements(data.announcements || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger vos annonces",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getAnnouncementTypeInfo = (type: string) => {
    return announcementTypes.find(t => t.value === type) || announcementTypes[0]
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return

    try {
      const response = await fetch(`/api/client/announcements/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur de suppression')

      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast({
        title: "✅ Annonce supprimée",
        description: "L'annonce a été supprimée avec succès",
      })
    } catch (error) {
      console.error('Error deleting announcement:', error)
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer l'annonce",
        variant: "destructive",
      })
    }
  }

  const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
    const typeInfo = getAnnouncementTypeInfo(announcement.type)
    const statusInfo = statusConfig[announcement.status]
    const Icon = typeInfo.icon

    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg leading-6">{announcement.title}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {announcement.startLocation.city} → {announcement.endLocation.city}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
              {announcement.urgent && (
                <Badge variant="destructive" className="ml-2">🚨 Urgent</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <p className="text-gray-700 mb-4 line-clamp-2">{announcement.description}</p>
          
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>Prix: <strong>{announcement.price}€</strong></span>
            {announcement.desiredDate && (
              <span>Souhaité: {new Date(announcement.desiredDate).toLocaleDateString()}</span>
            )}
          </div>

          {announcement.matchCount !== undefined && announcement.matchCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 text-sm font-medium">
                🎯 {announcement.matchCount} livreur{announcement.matchCount > 1 ? 's' : ''} intéressé{announcement.matchCount > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {announcement.deliveries && announcement.deliveries.length > 0 && (
            <div className="border-t pt-3 mb-3">
              <h4 className="font-medium text-sm mb-2">Livraisons assignées:</h4>
              {announcement.deliveries.map(delivery => (
                <div key={delivery.id} className="flex items-center justify-between text-sm">
                  <span>{delivery.deliverer.name}</span>
                  <div className="flex items-center gap-2">
                    <span>⭐ {delivery.deliverer.rating}</span>
                    <Badge variant="outline" className="text-xs">
                      {delivery.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/client/announcements/${announcement.id}`)}
              className="flex-1"
            >
              👁️ Voir détails
            </Button>
            
            {announcement.status === 'DRAFT' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/client/announcements/${announcement.id}/edit`)}
              >
                ✏️ Modifier
              </Button>
            )}
            
            {['DRAFT', 'ACTIVE'].includes(announcement.status) && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDeleteAnnouncement(announcement.id)}
              >
                🗑️
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement de vos annonces...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📢 Mes Annonces</h1>
          <p className="text-gray-600">Gérez vos demandes de livraisons et services</p>
        </div>
        <Button onClick={() => router.push('/client/announcements/create')} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle annonce
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = announcements.filter(a => a.status === status).length
          return (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className={`text-sm ${config.textColor}`}>{config.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par titre, description ou ville..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {announcementTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Toutes ({announcements.length})</TabsTrigger>
          <TabsTrigger value="active">Actives ({announcements.filter(a => ['ACTIVE', 'MATCHED'].includes(a.status)).length})</TabsTrigger>
          <TabsTrigger value="progress">En cours ({announcements.filter(a => a.status === 'IN_PROGRESS').length})</TabsTrigger>
          <TabsTrigger value="completed">Terminées ({announcements.filter(a => a.status === 'COMPLETED').length})</TabsTrigger>
          <TabsTrigger value="drafts">Brouillons ({announcements.filter(a => a.status === 'DRAFT').length})</TabsTrigger>
        </TabsList>

        {/* Contenu des onglets */}
        <TabsContent value={activeTab} className="mt-6">
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aucune annonce trouvée</h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'all' && !searchTerm && !selectedType && !selectedStatus
                    ? "Vous n'avez pas encore créé d'annonce."
                    : "Aucune annonce ne correspond à vos critères de recherche."
                  }
                </p>
                <Button onClick={() => router.push('/client/announcements/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer votre première annonce
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAnnouncements.map(announcement => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}