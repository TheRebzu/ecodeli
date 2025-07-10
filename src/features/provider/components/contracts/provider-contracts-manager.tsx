'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, FileText, CheckCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useApi } from '@/hooks/use-api'
import { providerContractSchema, type ProviderContractData } from '@/features/provider/schemas/contract.schema'
import { toast } from 'sonner'

interface ProviderContract {
  id: string
  contractType: 'STANDARD' | 'PREMIUM' | 'CUSTOM'
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  commissionRate: number
  startDate: string
  endDate?: string
  signedAt?: string
  signedByProvider: boolean
  signedByEcoDeli: boolean
  contractUrl?: string
  notes?: string
  createdAt: string
}

interface ProviderContractsManagerProps {
  providerId: string
}

export function ProviderContractsManager({ providerId }: ProviderContractsManagerProps) {
  const { user } = useAuth()
  const { execute } = useApi()
  const [contracts, setContracts] = useState<ProviderContract[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ProviderContract | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm<ProviderContractData>({
    resolver: zodResolver(providerContractSchema),
    defaultValues: {
      contractType: 'STANDARD',
      commissionRate: 0.15,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      terms: {},
      notes: ''
    }
  })

  const fetchContracts = async () => {
    if (!user?.id) return

    try {
      const response = await execute('/api/provider/contracts')
      if (response) {
        setContracts(response.contracts || [])
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
      toast.error('Erreur lors du chargement des contrats')
    }
  }

  const createContract = async (formData: ProviderContractData) => {
    if (!user?.id) return

    try {
      setLoading(true)
      const response = await execute('/api/provider/contracts', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      })

      if (response) {
        toast.success('Contrat créé avec succès')
        setShowCreateDialog(false)
        reset()
        fetchContracts()
      }
    } catch (error) {
      console.error('Error creating contract:', error)
      toast.error('Erreur lors de la création du contrat')
    } finally {
      setLoading(false)
    }
  }

  const signContract = async (contractId: string, signatureType: 'PROVIDER' | 'ECODELI') => {
    try {
      const response = await execute(`/api/provider/contracts/${contractId}/sign`, {
        method: 'POST',
        body: JSON.stringify({
          contractId,
          signatureType,
          signatureData: `signed_by_${signatureType.toLowerCase()}_${Date.now()}`
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      if (response) {
        toast.success('Contrat signé avec succès')
        fetchContracts()
      }
    } catch (error) {
      console.error('Error signing contract:', error)
      toast.error('Erreur lors de la signature')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: FileText, label: 'Brouillon' },
      PENDING_SIGNATURE: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente de signature' },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Actif' },
      EXPIRED: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Expiré' },
      TERMINATED: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Terminé' }
    }

    const statusConfig = config[status as keyof typeof config] || config.DRAFT
    const Icon = statusConfig.icon

    return (
      <Badge className={statusConfig.color}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    )
  }

  const getContractTypeLabel = (type: string) => {
    const types = {
      STANDARD: 'Standard',
      PREMIUM: 'Premium',
      CUSTOM: 'Sur mesure'
    }
    return types[type as keyof typeof types] || type
  }

  useEffect(() => {
    if (user?.id) {
      fetchContracts()
    }
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Contrats EcoDeli
          </h3>
          <p className="text-gray-600">
            Gestion de vos contrats avec EcoDeli
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau contrat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouveau contrat</DialogTitle>
              <DialogDescription>
                Créez un nouveau contrat avec EcoDeli
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(createContract)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractType">Type de contrat</Label>
                  <Select
                    defaultValue="STANDARD"
                    onValueChange={(value) => {
                      // Update form value
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard (15%)</SelectItem>
                      <SelectItem value="PREMIUM">Premium (12%)</SelectItem>
                      <SelectItem value="CUSTOM">Sur mesure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.01"
                    min="5"
                    max="30"
                    defaultValue="15"
                    {...register('commissionRate', { valueAsNumber: true })}
                  />
                  {errors.commissionRate && (
                    <p className="text-sm text-red-600">{errors.commissionRate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600">{errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Date de fin (optionnel)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-600">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Notes additionnelles..."
                  {...register('notes')}
                />
              </div>
            </form>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit(createContract)}
                disabled={loading || !isValid}
              >
                {loading ? 'Création...' : 'Créer le contrat'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes contrats</CardTitle>
          <CardDescription>
            Liste de vos contrats avec EcoDeli
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun contrat trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Signatures</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <span className="font-medium">
                        {getContractTypeLabel(contract.contractType)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(contract.status)}
                    </TableCell>
                    <TableCell>
                      {(contract.commissionRate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {new Date(contract.startDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {contract.signedByProvider && (
                          <Badge variant="outline" className="text-xs">
                            Provider ✓
                          </Badge>
                        )}
                        {contract.signedByEcoDeli && (
                          <Badge variant="outline" className="text-xs">
                            EcoDeli ✓
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {contract.contractUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={contract.contractUrl} target="_blank">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        
                        {contract.status === 'PENDING_SIGNATURE' && !contract.signedByProvider && (
                          <Button 
                            size="sm" 
                            onClick={() => signContract(contract.id) || 'PROVIDER'}
                          >
                            Signer
                          </Button>
                        )}
                        
                        {contract.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/provider/contracts/${contract.id}`}>
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 