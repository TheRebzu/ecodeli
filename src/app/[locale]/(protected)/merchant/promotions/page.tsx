'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  PercentIcon, 
  PlusIcon, 
  EditIcon,
  TrashIcon,
  GiftIcon,
  TagIcon,
  CalendarIcon,
  UsersIcon,
  EuroIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  StarIcon,
  TargetIcon
} from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format, addDays, isAfter, isBefore } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Promotion {
  id: string
  title: string
  description: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y'
  value: number
  minOrderAmount?: number
  maxDiscount?: number
  usageLimit?: number
  usageCount: number
  isActive: boolean
  startDate: Date
  endDate: Date
  targetAudience: 'ALL' | 'NEW_CUSTOMERS' | 'RETURNING_CUSTOMERS' | 'VIP'
  applicableProducts: string[]
  excludedProducts: string[]
  createdAt: Date
  
  // Statistiques
  stats?: {
    totalUsage: number
    totalRevenue: number
    conversionRate: number
    averageOrderValue: number
  }
}

interface PromotionForm {
  title: string
  description: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y'
  value: number
  minOrderAmount: number
  maxDiscount: number
  usageLimit: number
  dateRange: DateRange | undefined
  targetAudience: 'ALL' | 'NEW_CUSTOMERS' | 'RETURNING_CUSTOMERS' | 'VIP'
  applicableProducts: string[]
  excludedProducts: string[]
  isActive: boolean
}

export default function MerchantPromotionsPage() {
  const { user } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTab, setSelectedTab] = useState('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  
  const [formData, setFormData] = useState<PromotionForm>({
    title: '',
    description: '',
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: 0,
    maxDiscount: 0,
    usageLimit: 100,
    dateRange: {
      from: new Date(),
      to: addDays(new Date(), 30)
    },
    targetAudience: 'ALL',
    applicableProducts: [],
    excludedProducts: [],
    isActive: true
  })

  useEffect(() => {
    loadPromotions()
  }, [])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/merchant/promotions')
      if (response.ok) {
        const data = await response.json()
        setPromotions(data.promotions || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePromotion = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/merchant/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          startDate: formData.dateRange?.from,
          endDate: formData.dateRange?.to
        }),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        resetForm()
        loadPromotions()
      }
    } catch (error) {
      console.error('Erreur lors de la création de la promotion:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePromotion = async () => {
    if (!editingPromotion) return
    
    try {
      setSaving(true)
      const response = await fetch(`/api/merchant/promotions/${editingPromotion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          startDate: formData.dateRange?.from,
          endDate: formData.dateRange?.to
        }),
      })

      if (response.ok) {
        setEditingPromotion(null)
        resetForm()
        loadPromotions()
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la promotion:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePromotion = async (promotionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) return
    
    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadPromotions()
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la promotion:', error)
    }
  }

  const handleTogglePromotion = async (promotionId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      if (response.ok) {
        loadPromotions()
      }
    } catch (error) {
      console.error('Erreur lors du toggle de la promotion:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'PERCENTAGE',
      value: 10,
      minOrderAmount: 0,
      maxDiscount: 0,
      usageLimit: 100,
      dateRange: {
        from: new Date(),
        to: addDays(new Date(), 30)
      },
      targetAudience: 'ALL',
      applicableProducts: [],
      excludedProducts: [],
      isActive: true
    })
  }

  const openEditDialog = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      title: promotion.title,
      description: promotion.description,
      type: promotion.type,
      value: promotion.value,
      minOrderAmount: promotion.minOrderAmount || 0,
      maxDiscount: promotion.maxDiscount || 0,
      usageLimit: promotion.usageLimit || 0,
      dateRange: {
        from: promotion.startDate,
        to: promotion.endDate
      },
      targetAudience: promotion.targetAudience,
      applicableProducts: promotion.applicableProducts,
      excludedProducts: promotion.excludedProducts,
      isActive: promotion.isActive
    })
  }

  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date()
    if (!promotion.isActive) return 'inactive'
    if (isBefore(now, promotion.startDate)) return 'upcoming'
    if (isAfter(now, promotion.endDate)) return 'expired'
    return 'active'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-800">À venir</Badge>
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Expiré</Badge>
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800">Inactif</Badge>
      default:
        return <Badge>Inconnu</Badge>
    }
  }

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
        return 'Pourcentage'
      case 'FIXED_AMOUNT':
        return 'Montant fixe'
      case 'FREE_SHIPPING':
        return 'Livraison gratuite'
      case 'BUY_X_GET_Y':
        return 'Achetez X, obtenez Y'
      default:
        return type
    }
  }

  const formatPromotionValue = (promotion: Promotion) => {
    switch (promotion.type) {
      case 'PERCENTAGE':
        return `${promotion.value}%`
      case 'FIXED_AMOUNT':
        return `${promotion.value}€`
      case 'FREE_SHIPPING':
        return 'Gratuit'
      default:
        return promotion.value.toString()
    }
  }

  const filteredPromotions = promotions.filter(promotion => {
    const status = getPromotionStatus(promotion)
    switch (selectedTab) {
      case 'active':
        return status === 'active'
      case 'upcoming':
        return status === 'upcoming'
      case 'expired':
        return status === 'expired' || status === 'inactive'
      default:
        return true
    }
  })

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Promotions et Réductions</h1>
          <p className="text-gray-600">Gérez vos offres promotionnelles pour attirer plus de clients</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              Nouvelle Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? 'Modifier la Promotion' : 'Créer une Promotion'}
              </DialogTitle>
              <DialogDescription>
                Configurez votre promotion pour attirer plus de clients
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Titre de la Promotion</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Réduction de printemps"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type de Promotion</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Pourcentage de réduction</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">Montant fixe de réduction</SelectItem>
                      <SelectItem value="FREE_SHIPPING">Livraison gratuite</SelectItem>
                      <SelectItem value="BUY_X_GET_Y">Achetez X, obtenez Y</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez votre promotion..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="value">
                    {formData.type === 'PERCENTAGE' ? 'Pourcentage (%)' : 
                     formData.type === 'FIXED_AMOUNT' ? 'Montant (€)' : 'Valeur'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step={formData.type === 'PERCENTAGE' ? '1' : '0.01'}
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="minOrderAmount">Commande Minimum (€)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrderAmount: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="usageLimit">Limite d'Utilisation</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Période de Validité</Label>
                  <DatePickerWithRange
                    date={formData.dateRange}
                    onDateChange={(date) => setFormData(prev => ({ ...prev, dateRange: date }))}
                  />
                </div>
                <div>
                  <Label htmlFor="targetAudience">Audience Cible</Label>
                  <Select 
                    value={formData.targetAudience} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous les clients</SelectItem>
                      <SelectItem value="NEW_CUSTOMERS">Nouveaux clients</SelectItem>
                      <SelectItem value="RETURNING_CUSTOMERS">Clients fidèles</SelectItem>
                      <SelectItem value="VIP">Clients VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Promotion Active</Label>
                  <p className="text-sm text-gray-600">
                    La promotion sera immédiatement disponible
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateDialog(false)
                  setEditingPromotion(null)
                  resetForm()
                }}
              >
                Annuler
              </Button>
              <Button 
                onClick={editingPromotion ? handleUpdatePromotion : handleCreatePromotion}
                disabled={saving}
              >
                {saving ? 'Sauvegarde...' : (editingPromotion ? 'Modifier' : 'Créer')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            Actives ({promotions.filter(p => getPromotionStatus(p) === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            À venir ({promotions.filter(p => getPromotionStatus(p) === 'upcoming').length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4" />
            Expirées ({promotions.filter(p => getPromotionStatus(p) === 'expired' || getPromotionStatus(p) === 'inactive').length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <TargetIcon className="w-4 h-4" />
            Toutes ({promotions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GiftIcon className="w-5 h-5" />
                Liste des Promotions
              </CardTitle>
              <CardDescription>
                Gérez vos promotions et suivez leurs performances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPromotions.length === 0 ? (
                <div className="text-center py-8">
                  <GiftIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune promotion trouvée
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Créez votre première promotion pour attirer plus de clients
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Créer une Promotion
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promotion</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPromotions.map((promotion) => (
                      <TableRow key={promotion.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{promotion.title}</div>
                            <div className="text-sm text-gray-600">{promotion.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPromotionTypeLabel(promotion.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPromotionValue(promotion)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(promotion.startDate, 'dd/MM/yyyy', { locale: fr })}</div>
                            <div className="text-gray-600">
                              au {format(promotion.endDate, 'dd/MM/yyyy', { locale: fr })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{promotion.usageCount}</div>
                            <div className="text-gray-600">
                              / {promotion.usageLimit || '∞'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(getPromotionStatus(promotion))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={promotion.isActive}
                              onCheckedChange={(checked) => handleTogglePromotion(promotion.id, checked)}
                              size="sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                openEditDialog(promotion)
                                setShowCreateDialog(true)
                              }}
                            >
                              <EditIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePromotion(promotion.id)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <GiftIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Promotions</p>
                <p className="text-2xl font-bold text-gray-900">{promotions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Actives</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotions.filter(p => getPromotionStatus(p) === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Utilisations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotions.reduce((sum, p) => sum + p.usageCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUpIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Taux Moyen</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(promotions.filter(p => p.type === 'PERCENTAGE').reduce((sum, p) => sum + p.value, 0) / promotions.filter(p => p.type === 'PERCENTAGE').length || 0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 