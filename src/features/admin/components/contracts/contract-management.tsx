'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Download,
  AlertCircle,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Contract {
  id: string
  contractNumber: string
  type: string
  status: string
  merchantId: string
  commissionRate: number
  startDate: string
  endDate?: string
  signedAt?: string
  signedBy?: string
  pdfUrl?: string
  terms: any
  createdAt: string
  merchant: {
    companyName: string
    siret: string
    user: {
      email: string
      profile: {
        firstName: string
        lastName: string
      }
    }
  }
}

interface ContractStats {
  total: number
  active: number
  pending: number
  terminated: number
  recentContracts: Contract[]
}

export function ContractManagement() {
  const t = useTranslations('admin.contracts')
  const { toast } = useToast()
  
  const [contracts, setContracts] = useState<Contract[]>([])
  const [stats, setStats] = useState<ContractStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<'sign' | 'terminate' | 'renew' | null>(null)

  useEffect(() => {
    loadData()
  }, [filterStatus])

  const loadData = async () => {
    try {
      setLoading(true)

      // Charger les statistiques
      const statsResponse = await fetch('/api/admin/contracts?stats=true')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Charger les contrats avec filtre
      const contractsUrl = filterStatus === 'all' ? 
        '/api/admin/contracts' : 
        `/api/admin/contracts?status=${filterStatus.toUpperCase()}`
      
      const contractsResponse = await fetch(contractsUrl)
      if (contractsResponse.ok) {
        const contractsData = await contractsResponse.json()
        setContracts(contractsData)
      }

    } catch (error) {
      console.error('Erreur chargement contrats:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les contrats',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContract = async (formData: FormData) => {
    try {
      const response = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: formData.get('merchantId'),
          startDate: new Date(formData.get('startDate') as string).toISOString(),
          endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string).toISOString() : undefined,
          customTerms: {
            commissionRate: parseFloat(formData.get('commissionRate') as string) / 100,
            paymentTerms: parseInt(formData.get('paymentTerms') as string),
            deliveryZones: (formData.get('deliveryZones') as string).split(',').map(z => z.trim()),
            serviceLevel: formData.get('serviceLevel')
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: result.message
        })
        setShowCreateDialog(false)
        await loadData()
      } else {
        toast({
          title: 'Erreur',
          description: result.message,
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Erreur création contrat:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le contrat',
        variant: 'destructive'
      })
    }
  }

  const handleContractAction = async (formData: FormData) => {
    if (!selectedContract || !actionType) return

    try {
      const response = await fetch(`/api/admin/contracts/${selectedContract.id}?action=${actionType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData))
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès',
          description: result.message
        })
        setShowActionDialog(false)
        setSelectedContract(null)
        setActionType(null)
        await loadData()
      } else {
        toast({
          title: 'Erreur',
          description: result.message,
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Erreur action contrat:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible d\'effectuer cette action',
        variant: 'destructive'
      })
    }
  }

  const openActionDialog = (contract: Contract, action: 'sign' | 'terminate' | 'renew') => {
    setSelectedContract(contract)
    setActionType(action)
    setShowActionDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-800' },
      TERMINATED: { label: 'Résilié', className: 'bg-red-100 text-red-800' },
      EXPIRED: { label: 'Expiré', className: 'bg-orange-100 text-orange-800' }
    }
    const variant = variants[status as keyof typeof variants] || variants.DRAFT
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des contrats...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Contrats</h1>
          <p className="text-muted-foreground">Gérez les contrats avec les commerçants partenaires</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Contrat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouveau contrat</DialogTitle>
              <DialogDescription>
                Créez un contrat pour un commerçant partenaire
              </DialogDescription>
            </DialogHeader>
            
            <form action={handleCreateContract} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="merchantId">ID Commerçant</Label>
                  <Input 
                    id="merchantId" 
                    name="merchantId" 
                    placeholder="ID du commerçant"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="commissionRate">Taux de commission (%)</Label>
                  <Input 
                    id="commissionRate" 
                    name="commissionRate" 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue="15"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input 
                    id="startDate" 
                    name="startDate" 
                    type="date"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Date de fin (optionnel)</Label>
                  <Input 
                    id="endDate" 
                    name="endDate" 
                    type="date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentTerms">Délai de paiement (jours)</Label>
                <Input 
                  id="paymentTerms" 
                  name="paymentTerms" 
                  type="number"
                  min="1"
                  max="90"
                  defaultValue="30"
                  required 
                />
              </div>

              <div>
                <Label htmlFor="deliveryZones">Zones de livraison (séparées par des virgules)</Label>
                <Input 
                  id="deliveryZones" 
                  name="deliveryZones" 
                  placeholder="Paris, Lyon, Marseille"
                />
              </div>

              <div>
                <Label htmlFor="serviceLevel">Niveau de service</Label>
                <Select name="serviceLevel" defaultValue="STANDARD">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                    <SelectItem value="ENTERPRISE">Entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Créer le contrat
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contrats</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contrats Actifs</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Résiliés</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.terminated}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="terminated">Résilié</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des contrats */}
      <Card>
        <CardHeader>
          <CardTitle>Contrats ({contracts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{contract.contractNumber}</h3>
                        <p className="text-sm text-muted-foreground">
                          {contract.merchant.companyName} • {contract.merchant.siret}
                        </p>
                      </div>
                      {getStatusBadge(contract.status)}
                      <Badge variant="outline">
                        {(contract.commissionRate * 100).toFixed(1)}% commission
                      </Badge>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Début:</span>
                        <br />
                        {new Date(contract.startDate).toLocaleDateString('fr-FR')}
                      </div>
                      {contract.endDate && (
                        <div>
                          <span className="text-muted-foreground">Fin:</span>
                          <br />
                          {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      {contract.signedAt && (
                        <div>
                          <span className="text-muted-foreground">Signé le:</span>
                          <br />
                          {new Date(contract.signedAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Contact:</span>
                        <br />
                        {contract.merchant.user.profile.firstName} {contract.merchant.user.profile.lastName}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {contract.pdfUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contract.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    
                    {contract.status === 'DRAFT' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openActionDialog(contract, 'sign')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Signer
                      </Button>
                    )}
                    
                    {contract.status === 'ACTIVE' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openActionDialog(contract, 'renew')}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Renouveler
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openActionDialog(contract, 'terminate')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Résilier
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {contracts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun contrat trouvé pour les critères sélectionnés
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'actions */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'sign' && 'Signer le contrat'}
              {actionType === 'terminate' && 'Résilier le contrat'}
              {actionType === 'renew' && 'Renouveler le contrat'}
            </DialogTitle>
            <DialogDescription>
              Contrat: {selectedContract?.contractNumber}
            </DialogDescription>
          </DialogHeader>
          
          <form action={handleContractAction} className="space-y-4">
            {actionType === 'sign' && (
              <div>
                <Label htmlFor="signedBy">Signataire</Label>
                <Input 
                  id="signedBy" 
                  name="signedBy" 
                  placeholder="Nom du signataire"
                  required 
                />
              </div>
            )}

            {actionType === 'terminate' && (
              <>
                <div>
                  <Label htmlFor="reason">Raison de la résiliation</Label>
                  <Textarea 
                    id="reason" 
                    name="reason" 
                    placeholder="Expliquez la raison de la résiliation"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="terminatedBy">Responsable</Label>
                  <Input 
                    id="terminatedBy" 
                    name="terminatedBy" 
                    placeholder="Nom du responsable"
                    required 
                  />
                </div>
              </>
            )}

            {actionType === 'renew' && (
              <div>
                <Label htmlFor="newEndDate">Nouvelle date de fin</Label>
                <Input 
                  id="newEndDate" 
                  name="newEndDate" 
                  type="date"
                  required 
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowActionDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Confirmer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}