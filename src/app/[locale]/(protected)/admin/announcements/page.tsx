"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MoreHorizontal,
  Calendar,
  MapPin,
  Euro,
  User,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  BarChart3
} from "lucide-react"
import { AnnouncementForm } from "./components/announcement-form"
import { AnnouncementDetails } from "./components/announcement-details"
import { AnnouncementAnalytics } from "./components/announcement-analytics"

interface Announcement {
  id: string
  title: string
  description: string
  type: string
  status: string
  basePrice: number
  currency: string
  pickupAddress: string
  deliveryAddress: string
  pickupDate?: string
  deliveryDate?: string
  isUrgent: boolean
  viewCount: number
  matchCount: number
  createdAt: string
  updatedAt: string
  author: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  deliverer?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
}

interface AnnouncementFilters {
  status?: string
  type?: string
  authorId?: string
  flagged?: boolean
  search?: string
}

export default function AdminAnnouncementsPage() {
  const t = useTranslations('admin')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AnnouncementFilters>({})
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Charger les annonces
  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await fetch(`/api/admin/announcements?${params}`)
      if (!response.ok) throw new Error('Erreur lors du chargement')

      const data = await response.json()
      setAnnouncements(data.announcements || data)
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || data.length,
        totalPages: data.pagination?.totalPages || Math.ceil((data.pagination?.total || data.length) / pagination.limit)
      }))
    } catch (error) {
      console.error('Erreur chargement annonces:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [pagination.page, filters])

  // Modérer une annonce
  const moderateAnnouncement = async (announcementId: string, action: string, reason?: string) => {
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementId,
          action,
          reason
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la modération')

      await loadAnnouncements()
    } catch (error) {
      console.error('Erreur modération:', error)
    }
  }

  // Supprimer une annonce
  const deleteAnnouncement = async (announcementId: string) => {
    try {
      const response = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      await loadAnnouncements()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { variant: 'secondary', icon: Clock, label: 'Brouillon' },
      ACTIVE: { variant: 'default', icon: CheckCircle, label: 'Active' },
      IN_PROGRESS: { variant: 'default', icon: Package, label: 'En cours' },
      COMPLETED: { variant: 'default', icon: CheckCircle, label: 'Terminée' },
      CANCELLED: { variant: 'destructive', icon: XCircle, label: 'Annulée' },
      SUSPENDED: { variant: 'destructive', icon: Pause, label: 'Suspendue' },
      FLAGGED: { variant: 'destructive', icon: AlertTriangle, label: 'Signalée' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  // Obtenir le badge de type
  const getTypeBadge = (type: string) => {
    const typeConfig = {
      PACKAGE_DELIVERY: { label: 'Colis', color: 'bg-blue-100 text-blue-800' },
      PERSON_TRANSPORT: { label: 'Personne', color: 'bg-green-100 text-green-800' },
      AIRPORT_TRANSFER: { label: 'Aéroport', color: 'bg-purple-100 text-purple-800' },
      SHOPPING: { label: 'Courses', color: 'bg-orange-100 text-orange-800' },
      INTERNATIONAL_PURCHASE: { label: 'Achat Int.', color: 'bg-red-100 text-red-800' },
      PET_SITTING: { label: 'Garde Animaux', color: 'bg-pink-100 text-pink-800' },
      HOME_SERVICE: { label: 'Service Domicile', color: 'bg-indigo-100 text-indigo-800' },
      CART_DROP: { label: 'Lâcher Chariot', color: 'bg-yellow-100 text-yellow-800' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || { label: type, color: 'bg-gray-100 text-gray-800' }

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Annonces</h1>
          <p className="text-muted-foreground">
            Administrez toutes les annonces de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAnalyticsOpen(true)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Annonce
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status || "ALL"} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "ALL" ? undefined : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
                <SelectItem value="SUSPENDED">Suspendue</SelectItem>
                <SelectItem value="FLAGGED">Signalée</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type || "ALL"} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value === "ALL" ? undefined : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                <SelectItem value="PACKAGE_DELIVERY">Colis</SelectItem>
                <SelectItem value="PERSON_TRANSPORT">Personne</SelectItem>
                <SelectItem value="AIRPORT_TRANSFER">Aéroport</SelectItem>
                <SelectItem value="SHOPPING">Courses</SelectItem>
                <SelectItem value="INTERNATIONAL_PURCHASE">Achat International</SelectItem>
                <SelectItem value="PET_SITTING">Garde Animaux</SelectItem>
                <SelectItem value="HOME_SERVICE">Service Domicile</SelectItem>
                <SelectItem value="CART_DROP">Lâcher Chariot</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({})}
              className="w-full"
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des annonces */}
      <Card>
        <CardHeader>
          <CardTitle>Annonces ({pagination.total})</CardTitle>
          <CardDescription>
            Liste de toutes les annonces avec possibilité de modération
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Annonce</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Vues/Matchs</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{announcement.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {announcement.description}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{announcement.pickupAddress}</span>
                            <span>→</span>
                            <span>{announcement.deliveryAddress}</span>
                          </div>
                          {announcement.isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {announcement.author.firstName} {announcement.author.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {announcement.author.email}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getTypeBadge(announcement.type)}
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(announcement.status)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          <span className="font-medium">
                            {announcement.basePrice.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {announcement.currency}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div>{announcement.viewCount} vues</div>
                          <div>{announcement.matchCount} matchs</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(announcement.createdAt).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            {new Date(announcement.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAnnouncement(announcement)
                              setIsDetailsOpen(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Actions sur l'annonce</DialogTitle>
                                <DialogDescription>
                                  Choisissez une action à effectuer sur cette annonce
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-2">
                                {announcement.status === 'DRAFT' && (
                                  <Button 
                                    className="w-full justify-start" 
                                    onClick={() => moderateAnnouncement(announcement.id, 'APPROVE')}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approuver
                                  </Button>
                                )}
                                
                                {announcement.status === 'ACTIVE' && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      className="w-full justify-start"
                                      onClick={() => moderateAnnouncement(announcement.id, 'SUSPEND')}
                                    >
                                      <Pause className="w-4 h-4 mr-2" />
                                      Suspendre
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      className="w-full justify-start"
                                      onClick={() => moderateAnnouncement(announcement.id, 'FLAG')}
                                    >
                                      <AlertTriangle className="w-4 h-4 mr-2" />
                                      Signaler
                                    </Button>
                                  </>
                                )}
                                
                                {announcement.status === 'FLAGGED' && (
                                  <Button 
                                    className="w-full justify-start"
                                    onClick={() => moderateAnnouncement(announcement.id, 'APPROVE')}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Désactiver le signalement
                                  </Button>
                                )}
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full justify-start">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Supprimer
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Cette action ne peut pas être annulée. L'annonce sera définitivement supprimée.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAnnouncement(announcement.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Formulaire */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Annonce</DialogTitle>
            <DialogDescription>
              Créez une nouvelle annonce pour la plateforme
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm 
            onSuccess={() => {
              setIsFormOpen(false)
              loadAnnouncements()
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Détails */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'Annonce</DialogTitle>
            <DialogDescription>
              Informations complètes sur cette annonce
            </DialogDescription>
          </DialogHeader>
          {selectedAnnouncement && (
            <AnnouncementDetails 
              announcement={selectedAnnouncement}
              onModerate={moderateAnnouncement}
              onDelete={deleteAnnouncement}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Analytics */}
      <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analytics des Annonces</DialogTitle>
            <DialogDescription>
              Statistiques et analyses des annonces
            </DialogDescription>
          </DialogHeader>
          <AnnouncementAnalytics />
        </DialogContent>
      </Dialog>
    </div>
  )
} 