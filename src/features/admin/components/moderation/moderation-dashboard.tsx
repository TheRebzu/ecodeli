'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Flag,
  Shield,
  Users,
  FileText,
  MessageSquare,
  Search,
  Filter,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

interface ModerationItem {
  id: string
  type: 'user' | 'announcement' | 'document' | 'review' | 'report'
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  reportedBy?: {
    id: string
    name: string
    email: string
  }
  reportedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

interface ModerationStats {
  pending: number
  approved: number
  rejected: number
  underReview: number
  totalReports: number
  avgResolutionTime: number
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  under_review: 'bg-blue-100 text-blue-800'
}

const typeIcons = {
  user: Users,
  announcement: FileText,
  document: FileText,
  review: MessageSquare,
  report: Flag
}

export function ModerationDashboard() {
  const { toast } = useToast()
  const [items, setItems] = useState<ModerationItem[]>([])
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  // Données simulées pour la démonstration
  useEffect(() => {
    const fetchModerationData = async () => {
      setIsLoading(true)
      
      // Simulation de données
      const mockItems: ModerationItem[] = [
        {
          id: '1',
          type: 'user',
          status: 'pending',
          priority: 'high',
          title: 'Compte utilisateur suspect',
          description: 'Utilisateur avec activité inhabituelle, création de multiples annonces similaires',
          reportedBy: {
            id: 'reporter1',
            name: 'Marie Dupont',
            email: 'marie.dupont@email.com'
          },
          reportedUser: {
            id: 'user1',
            name: 'Jean Martin',
            email: 'jean.martin@email.com',
            role: 'CLIENT'
          },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          metadata: {
            reportReason: 'Activité suspecte',
            evidenceCount: 3
          }
        },
        {
          id: '2',
          type: 'announcement',
          status: 'under_review',
          priority: 'medium',
          title: 'Annonce de contenu inapproprié',
          description: 'Annonce contenant des termes inappropriés et prix anormalement élevé',
          reportedBy: {
            id: 'reporter2',
            name: 'Paul Durand',
            email: 'paul.durand@email.com'
          },
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          metadata: {
            announcementId: 'ann_123',
            price: 500,
            reportReason: 'Contenu inapproprié'
          }
        },
        {
          id: '3',
          type: 'document',
          status: 'pending',
          priority: 'urgent',
          title: 'Document d\'identité falsifié',
          description: 'Document téléchargé par un livreur semble être modifié numériquement',
          reportedUser: {
            id: 'deliverer1',
            name: 'Sophie Leroy',
            email: 'sophie.leroy@email.com',
            role: 'DELIVERER'
          },
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          metadata: {
            documentType: 'IDENTITY',
            confidenceScore: 0.3
          }
        },
        {
          id: '4',
          type: 'review',
          status: 'approved',
          priority: 'low',
          title: 'Avis client validé',
          description: 'Avis positif vérifié pour une livraison réussie',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          metadata: {
            rating: 5,
            reviewId: 'rev_456'
          }
        }
      ]

      const mockStats: ModerationStats = {
        pending: 12,
        approved: 85,
        rejected: 8,
        underReview: 5,
        totalReports: 110,
        avgResolutionTime: 4.2
      }

      // Simulation d'un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setItems(mockItems)
      setStats(mockStats)
      setIsLoading(false)
    }

    fetchModerationData()
  }, [])

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus
    const matchesType = filterType === 'all' || item.type === filterType
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority

    return matchesSearch && matchesStatus && matchesType && matchesPriority
  })

  const handleItemAction = async (itemId: string, action: 'approve' | 'reject' | 'review', reason?: string) => {
    try {
      // Simulation API call
      await new Promise(resolve => setTimeout(resolve, 500))

      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'under_review',
                updatedAt: new Date().toISOString()
              }
            : item
        )
      )

      toast({
        title: "Action effectuée",
        description: `L'élément a été ${action === 'approve' ? 'approuvé' : action === 'reject' ? 'rejeté' : 'mis en révision'}`
      })

      setIsDialogOpen(false)
      setSelectedItem(null)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer cette action",
        variant: "destructive"
      })
    }
  }

  const openItemDetails = (item: ModerationItem) => {
    setSelectedItem(item)
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Chargement des éléments de modération...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête et statistiques */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centre de Modération</h1>
          <p className="text-muted-foreground">Gérez les signalements et validations de contenu</p>
        </div>
        <Button variant="outline">
          <Shield className="mr-2 h-4 w-4" />
          Règles de modération
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Approuvés</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Rejetés</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">En révision</p>
                  <p className="text-2xl font-bold">{stats.underReview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Signalements</p>
                  <p className="text-2xl font-bold">{stats.totalReports}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Temps moyen</p>
                  <p className="text-2xl font-bold">{stats.avgResolutionTime}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher par titre ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="under_review">En révision</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="user">Utilisateurs</SelectItem>
                <SelectItem value="announcement">Annonces</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="review">Avis</SelectItem>
                <SelectItem value="report">Signalements</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des éléments */}
      <Card>
        <CardHeader>
          <CardTitle>Éléments de modération ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = typeIcons[item.type]
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                  onClick={() => openItemDetails(item)}
                >
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <Badge variant="outline" className={priorityColors[item.priority]}>
                        {item.priority}
                      </Badge>
                      <Badge variant="outline" className={statusColors[item.status]}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Créé: {new Date(item.createdAt).toLocaleString('fr-FR')}</span>
                      {item.reportedBy && (
                        <span>Signalé par: {item.reportedBy.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleItemAction(item.id, 'approve')
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleItemAction(item.id, 'reject')
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de détails */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && (
                <>
                  {React.createElement(typeIcons[selectedItem.type], { className: "h-5 w-5" })}
                  {selectedItem.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Détails et actions de modération
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="text-sm">{selectedItem.type}</p>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Badge className={statusColors[selectedItem.status]}>
                    {selectedItem.status}
                  </Badge>
                </div>
                <div>
                  <Label>Priorité</Label>
                  <Badge className={priorityColors[selectedItem.priority]}>
                    {selectedItem.priority}
                  </Badge>
                </div>
                <div>
                  <Label>Créé le</Label>
                  <p className="text-sm">{new Date(selectedItem.createdAt).toLocaleString('fr-FR')}</p>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-sm mt-1">{selectedItem.description}</p>
              </div>

              {selectedItem.reportedBy && (
                <div>
                  <Label>Signalé par</Label>
                  <div className="text-sm mt-1">
                    <p>{selectedItem.reportedBy.name}</p>
                    <p className="text-muted-foreground">{selectedItem.reportedBy.email}</p>
                  </div>
                </div>
              )}

              {selectedItem.reportedUser && (
                <div>
                  <Label>Utilisateur concerné</Label>
                  <div className="text-sm mt-1">
                    <p>{selectedItem.reportedUser.name} ({selectedItem.reportedUser.role})</p>
                    <p className="text-muted-foreground">{selectedItem.reportedUser.email}</p>
                  </div>
                </div>
              )}

              {selectedItem.metadata && (
                <div>
                  <Label>Métadonnées</Label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedItem.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedItem?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => selectedItem && handleItemAction(selectedItem.id, 'review')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Mettre en révision
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedItem && handleItemAction(selectedItem.id, 'reject')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => selectedItem && handleItemAction(selectedItem.id, 'approve')}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approuver
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}