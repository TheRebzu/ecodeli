"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Package, 
  MapPin, 
  Clock, 
  Euro, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Shield,
  Play,
  Pause
} from "lucide-react"
import { Announcement } from "@/features/announcements/types/announcement.types"
import { format, formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import Link from "next/link"

interface AnnouncementStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalValue: number;
  averagePrice: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

export default function AdminAnnouncementsPage() {
  const { user } = useAuth()
  const t = useTranslations('admin.announcements')
  const { toast } = useToast()
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState<AnnouncementStats | null>(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAnnouncements()
      fetchStats()
    }
  }, [user, searchTerm, statusFilter, typeFilter, userRoleFilter, sortBy, sortOrder, page])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(userRoleFilter && { userRole: userRoleFilter }),
        sortBy,
        sortOrder,
        includeUser: 'true'
      })

      const response = await fetch(`/api/admin/announcements?${params}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des annonces')
      }

      const data = await response.json()
      setAnnouncements(data.announcements || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger les annonces",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/announcements/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    }
  }

  const handleStatusChange = async (announcementId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/announcements/${announcementId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la modification du statut')
      }

      toast({
        title: "✅ Succès",
        description: "Statut modifié avec succès",
      })

      fetchAnnouncements()
      fetchStats()
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le statut",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (announcementId: string) => {
    try {
      setDeletingId(announcementId)
      const response = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      toast({
        title: "✅ Succès",
        description: "Annonce supprimée avec succès",
      })

      fetchAnnouncements()
      fetchStats()
      setShowDeleteDialog(false)
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'annonce",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      'PACKAGE_DELIVERY': 'Transport de colis',
      'PERSON_TRANSPORT': 'Transport de personnes',
      'AIRPORT_TRANSFER': 'Transfert aéroport',
      'SHOPPING': 'Courses',
      'INTERNATIONAL_PURCHASE': 'Achats internationaux',
      'HOME_SERVICE': 'Services à domicile',
      'PET_SITTING': 'Garde d\'animaux',
      'CART_DROP': 'Lâcher de chariot'
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-gray-600" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'MATCHED':
        return <Users className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'MATCHED':
        return 'bg-yellow-100 text-yellow-800'
      case 'DRAFT':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CLIENT':
        return 'bg-blue-100 text-blue-800'
      case 'MERCHANT':
        return 'bg-green-100 text-green-800'
      case 'PROVIDER':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Accès refusé
          </h2>
          <p className="text-gray-600">
            Vous devez être administrateur pour accéder à cette page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration des annonces"
        description="Gérez toutes les annonces de la plateforme"
        action={
          <Button onClick={() => window.location.reload()}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        }
      />

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Actives</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.byStatus?.ACTIVE || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Terminées</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.byStatus?.COMPLETED || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Euro className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valeur totale</p>
                <p className="text-2xl font-bold text-gray-900">{(stats?.totalValue || 0).toFixed(0)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.todayCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <span className="text-sm">{status}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.byType || {}).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm">{getTypeLabel(type)}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres avancés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="MATCHED">Matchée</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                <SelectItem value="PACKAGE_DELIVERY">Transport de colis</SelectItem>
                <SelectItem value="PERSON_TRANSPORT">Transport de personnes</SelectItem>
                <SelectItem value="AIRPORT_TRANSFER">Transfert aéroport</SelectItem>
                <SelectItem value="SHOPPING">Courses</SelectItem>
                <SelectItem value="CART_DROP">Lâcher de chariot</SelectItem>
                <SelectItem value="HOME_SERVICE">Services à domicile</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Utilisateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les rôles</SelectItem>
                <SelectItem value="CLIENT">Clients</SelectItem>
                <SelectItem value="MERCHANT">Commerçants</SelectItem>
                <SelectItem value="PROVIDER">Prestataires</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-')
              setSortBy(newSortBy)
              setSortOrder(newSortOrder)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Plus récent</SelectItem>
                <SelectItem value="createdAt-asc">Plus ancien</SelectItem>
                <SelectItem value="price-desc">Prix décroissant</SelectItem>
                <SelectItem value="price-asc">Prix croissant</SelectItem>
                <SelectItem value="viewCount-desc">Plus vues</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
                setUserRoleFilter('')
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des annonces */}
      <Card>
        <CardHeader>
          <CardTitle>Toutes les annonces ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune annonce trouvée
              </h3>
              <p className="text-gray-600">
                Aucune annonce ne correspond aux critères de recherche.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Annonce</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Vues</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold line-clamp-1">{announcement.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {announcement.description}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {announcement.urgent && (
                            <Badge variant="destructive" className="text-xs">
                              🚨 Urgent
                            </Badge>
                          )}
                          {announcement.flexibleDates && (
                            <Badge variant="secondary" className="text-xs">
                              📅 Flexible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {announcement.client?.profile?.firstName || announcement.merchant?.profile?.firstName || 'Utilisateur'} {announcement.client?.profile?.lastName || announcement.merchant?.profile?.lastName || ''}
                        </p>
                        <Badge className={getRoleColor(announcement.client ? 'CLIENT' : announcement.merchant ? 'MERCHANT' : 'CLIENT')}>
                          {announcement.client ? 'CLIENT' : announcement.merchant ? 'MERCHANT' : 'CLIENT'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(announcement.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={announcement.status}
                        onValueChange={(newStatus) => handleStatusChange(announcement.id, newStatus)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge className={getStatusColor(announcement.status)}>
                              {getStatusIcon(announcement.status)}
                              <span className="ml-1">{announcement.status}</span>
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Brouillon</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="MATCHED">Matchée</SelectItem>
                          <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                          <SelectItem value="COMPLETED">Terminée</SelectItem>
                          <SelectItem value="CANCELLED">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {announcement.price.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-gray-500" />
                        {announcement.viewCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div>
                        <p>{format(new Date(announcement.createdAt), 'dd/MM/yyyy', { locale: fr })}</p>
                        <p className="text-xs">
                          {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{announcement.title}</DialogTitle>
                              <DialogDescription>
                                Détails complets de l'annonce
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p className="font-medium">Description:</p>
                                <p className="text-sm text-gray-600">{announcement.description}</p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="font-medium">Départ:</p>
                                  <p className="text-sm">{announcement.startLocation.address}</p>
                                  <p className="text-sm text-gray-600">
                                    {announcement.startLocation.city}, {announcement.startLocation.postalCode}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">Arrivée:</p>
                                  <p className="text-sm">{announcement.endLocation.address}</p>
                                  <p className="text-sm text-gray-600">
                                    {announcement.endLocation.city}, {announcement.endLocation.postalCode}
                                  </p>
                                </div>
                              </div>

                              {announcement.specialInstructions && (
                                <div>
                                  <p className="font-medium">Instructions spéciales:</p>
                                  <p className="text-sm text-gray-600">{announcement.specialInstructions}</p>
                                </div>
                              )}

                              {announcement.packageDetails && (
                                <div>
                                  <p className="font-medium">Détails du colis:</p>
                                  <p className="text-sm">
                                    Poids: {announcement.packageDetails.weight}kg - 
                                    Dimensions: {announcement.packageDetails.length}x{announcement.packageDetails.width}x{announcement.packageDetails.height}cm
                                  </p>
                                  <p className="text-sm">Contenu: {announcement.packageDetails.content}</p>
                                  {announcement.packageDetails.fragile && (
                                    <p className="text-sm text-yellow-600">⚠️ Fragile</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible et supprimera toutes les données associées.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  setSelectedAnnouncement(announcement)
                                  setShowDeleteDialog(true)
                                }}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={!!deletingId}
                              >
                                {deletingId ? 'Suppression...' : 'Supprimer définitivement'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 6, page - 3)) + i
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Dialog détails annonce */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'annonce</DialogTitle>
            <DialogDescription>
              Informations complètes sur l'annonce sélectionnée
            </DialogDescription>
          </DialogHeader>
          
          {selectedAnnouncement && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Titre</h4>
                <p>{selectedAnnouncement.title}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-gray-600">{selectedAnnouncement.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Type</h4>
                  <Badge variant="outline">
                    {getTypeLabel(selectedAnnouncement.type)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Statut</h4>
                  <Badge className={getStatusColor(selectedAnnouncement.status)}>
                    {selectedAnnouncement.status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Prix</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedAnnouncement.price}€
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Date souhaitée</h4>
                  <p>{format(new Date(selectedAnnouncement.desiredDate), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Itinéraire</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>{selectedAnnouncement.startLocation.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>{selectedAnnouncement.endLocation.address}</span>
                  </div>
                </div>
              </div>
              
              {selectedAnnouncement.specialInstructions && (
                <div>
                  <h4 className="font-medium mb-2">Instructions spéciales</h4>
                  <p className="text-gray-600">{selectedAnnouncement.specialInstructions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAnnouncement && handleDelete(selectedAnnouncement.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={!!deletingId}
            >
              {deletingId ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 