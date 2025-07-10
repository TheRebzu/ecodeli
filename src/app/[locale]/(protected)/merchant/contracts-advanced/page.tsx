"use client";

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  FileText,
  Download,
  Upload,
  Signature,
  Calculator,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Send,
  MessageCircle,
  Euro,
  Percent,
  Calendar,
  User,
  Building,
  Mail,
  Phone,
  FileCheck,
  PenTool,
  Loader2,
  ExternalLink,
  History,
  Star,
  ShieldCheck
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

interface Contract {
  id: string
  contractNumber: string
  type: 'STANDARD' | 'PREMIUM' | 'CUSTOM'
  status: 'draft' | 'pending_review' | 'under_negotiation' | 'ready_to_sign' | 'signed' | 'active' | 'expired' | 'terminated'
  title: string
  description: string
  commissionRate: number
  paymentTerms: number // jours
  minimumVolume?: number
  bonusThresholds?: Array<{
    volume: number
    bonusRate: number
  }>
  startDate: string
  endDate?: string
  autoRenewal: boolean
  signedAt?: string
  createdAt: string
  updatedAt: string
  assignedAgent?: {
    name: string
    email: string
    phone: string
    avatar?: string
  }
  negotiations: Array<{
    id: string
    proposedRate: number
    reason: string
    status: 'pending' | 'accepted' | 'rejected' | 'counter_offered'
    createdAt: string
    response?: string
    counterOffer?: number
  }>
  documents: Array<{
    id: string
    name: string
    type: 'contract' | 'annexe' | 'amendment'
    url: string
    signatureRequired: boolean
    signed: boolean
    signedAt?: string
  }>
}

interface ContractTemplate {
  id: string
  name: string
  type: 'STANDARD' | 'PREMIUM' | 'CUSTOM'
  description: string
  baseCommissionRate: number
  features: string[]
  recommended: boolean
}

export default function MerchantContractsAdvancedPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [negotiationOpen, setNegotiationOpen] = useState(false)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    fetchContractsData()
  }, [])

  const fetchContractsData = async () => {
    try {
      setLoading(true)
      const [contractsRes, templatesRes] = await Promise.all([
        fetch('/api/merchant/contracts-advanced', { credentials: 'include' }),
        fetch('/api/merchant/contracts-advanced/templates', { credentials: 'include' })
      ])
      
      if (contractsRes.ok) {
        const contractsData = await contractsRes.json()
        setContracts(contractsData.contracts || getDemoContracts())
      } else {
        setContracts(getDemoContracts())
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json()
        setTemplates(templatesData.templates || getDemoTemplates())
      } else {
        setTemplates(getDemoTemplates())
      }
    } catch (error) {
      console.error('Erreur chargement contrats:', error)
      setContracts(getDemoContracts())
      setTemplates(getDemoTemplates())
    } finally {
      setLoading(false)
    }
  }

  const getDemoContracts = (): Contract[] => [
    {
      id: '1',
      contractNumber: 'CT-2024-001',
      type: 'STANDARD',
      status: 'active',
      title: 'Contrat Standard EcoDeli',
      description: 'Contrat standard pour commerçants avec commission base',
      commissionRate: 8.5,
      paymentTerms: 30,
      minimumVolume: 1000,
      startDate: '2024-01-15',
      endDate: '2025-01-14',
      autoRenewal: true,
      signedAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      assignedAgent: {
        name: 'Marie Dubois',
        email: 'marie.dubois@ecodeli.fr',
        phone: '01 42 56 78 91',
        avatar: undefined
      },
      negotiations: [],
      documents: [
        {
          id: '1',
          name: 'Contrat principal',
          type: 'contract',
          url: '/api/documents/contract-1.pdf',
          signatureRequired: true,
          signed: true,
          signedAt: '2024-01-15T10:30:00Z'
        }
      ]
    },
    {
      id: '2',
      contractNumber: 'CT-2024-002',
      type: 'PREMIUM',
      status: 'under_negotiation',
      title: 'Contrat Premium en négociation',
      description: 'Upgrade vers contrat premium avec conditions spéciales',
      commissionRate: 6.5,
      paymentTerms: 15,
      minimumVolume: 5000,
      bonusThresholds: [
        { volume: 10000, bonusRate: 1.0 },
        { volume: 25000, bonusRate: 1.5 }
      ],
      startDate: '2024-07-01',
      autoRenewal: true,
      createdAt: '2024-06-15T14:00:00Z',
      updatedAt: '2024-06-20T16:30:00Z',
      assignedAgent: {
        name: 'Pierre Moreau',
        email: 'pierre.moreau@ecodeli.fr',
        phone: '01 42 56 78 92'
      },
      negotiations: [
        {
          id: '1',
          proposedRate: 5.5,
          reason: 'Volume important prévu pour 2024',
          status: 'counter_offered',
          createdAt: '2024-06-15T14:00:00Z',
          response: 'Nous pouvons proposer 6.0% avec garantie de volume',
          counterOffer: 6.0
        }
      ],
      documents: [
        {
          id: '2',
          name: 'Proposition contrat premium',
          type: 'contract',
          url: '/api/documents/contract-2-draft.pdf',
          signatureRequired: false,
          signed: false
        }
      ]
    }
  ]

  const getDemoTemplates = (): ContractTemplate[] => [
    {
      id: '1',
      name: 'Standard',
      type: 'STANDARD',
      description: 'Contrat de base pour débuter avec EcoDeli',
      baseCommissionRate: 8.5,
      features: [
        'Commission 8.5%',
        'Paiement sous 30 jours',
        'Support standard',
        'Interface de base',
        'Rapports mensuels'
      ],
      recommended: false
    },
    {
      id: '2',
      name: 'Premium',
      type: 'PREMIUM',
      description: 'Contrat optimisé pour commerçants établis',
      baseCommissionRate: 6.5,
      features: [
        'Commission 6.5%',
        'Paiement sous 15 jours',
        'Support prioritaire',
        'Interface avancée',
        'Rapports en temps réel',
        'Account Manager dédié',
        'Bonus de volume'
      ],
      recommended: true
    },
    {
      id: '3',
      name: 'Entreprise',
      type: 'CUSTOM',
      description: 'Contrat sur mesure pour grandes chaînes',
      baseCommissionRate: 4.5,
      features: [
        'Commission négociée',
        'Paiement immédiat',
        'Support 24/7',
        'API dédiée',
        'Intégrations personnalisées',
        'SLA garantis',
        'Conditions spéciales'
      ],
      recommended: false
    }
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'outline' as const, text: 'Brouillon', color: 'text-gray-500' },
      pending_review: { variant: 'secondary' as const, text: 'En révision', color: 'text-blue-500' },
      under_negotiation: { variant: 'default' as const, text: 'En négociation', color: 'text-orange-500' },
      ready_to_sign: { variant: 'default' as const, text: 'Prêt à signer', color: 'text-green-500' },
      signed: { variant: 'default' as const, text: 'Signé', color: 'text-green-600' },
      active: { variant: 'default' as const, text: 'Actif', color: 'text-green-600' },
      expired: { variant: 'outline' as const, text: 'Expiré', color: 'text-red-500' },
      terminated: { variant: 'destructive' as const, text: 'Résilié', color: 'text-red-600' }
    }
    return variants[status as keyof typeof variants] || variants.draft
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'STANDARD': return 'text-blue-600 bg-blue-50'
      case 'PREMIUM': return 'text-purple-600 bg-purple-50'
      case 'CUSTOM': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const handleStartNegotiation = async (contractId: string, data: any) => {
    try {
      const response = await fetch(`/api/merchant/contracts-advanced/${contractId}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      if (response.ok) {
        toast({
          title: "Négociation initiée",
          description: "Votre demande de négociation a été envoyée à votre account manager"
        })
        setNegotiationOpen(false)
        fetchContractsData()
      }
    } catch (error) {
      console.error('Erreur négociation:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'initier la négociation",
        variant: "destructive"
      })
    }
  }

  const handleSignContract = async (contractId: string) => {
    try {
      setSigning(true)
      const response = await fetch(`/api/merchant/contracts-advanced/${contractId}/sign`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        toast({
          title: "Contrat signé",
          description: "Le contrat a été signé électroniquement avec succès"
        })
        fetchContractsData()
      }
    } catch (error) {
      console.error('Erreur signature:', error)
      toast({
        title: "Erreur",
        description: "Impossible de signer le contrat",
        variant: "destructive"
      })
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des contrats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des contrats</h1>
          <p className="text-muted-foreground">
            Gérez vos contrats EcoDeli, négociez vos conditions et signez électroniquement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Télécharger tous
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {contracts.filter(c => c.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Contrats actifs</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {contracts.filter(c => c.status === 'under_negotiation').length}
            </div>
            <div className="text-sm text-muted-foreground">En négociation</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {contracts.filter(c => c.status === 'ready_to_sign').length}
            </div>
            <div className="text-sm text-muted-foreground">Prêts à signer</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {contracts.find(c => c.status === 'active')?.commissionRate || 0}%
            </div>
            <div className="text-sm text-muted-foreground">Taux actuel</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="current">Contrat actuel</TabsTrigger>
          <TabsTrigger value="negotiations">Négociations</TabsTrigger>
          <TabsTrigger value="templates">Nouveau contrat</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {contracts.map((contract) => {
              const statusBadge = getStatusBadge(contract.status)
              
              return (
                <Card 
                  key={contract.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedContract?.id === contract.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedContract(contract)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{contract.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          #{contract.contractNumber}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <Badge variant={statusBadge.variant} className="text-xs">
                          {statusBadge.text}
                        </Badge>
                        <Badge className={`text-xs ${getTypeColor(contract.type)}`}>
                          {contract.type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Commission</span>
                        <span className="font-medium">{contract.commissionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Paiement</span>
                        <span className="font-medium">{contract.paymentTerms}j</span>
                      </div>
                      {contract.assignedAgent && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {contract.assignedAgent.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {contract.assignedAgent.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="current" className="space-y-6">
          <CurrentContractSection 
            contracts={contracts}
            onNegotiate={() => setNegotiationOpen(true)}
            onSign={handleSignContract}
            signing={signing}
          />
        </TabsContent>

        <TabsContent value="negotiations" className="space-y-6">
          <NegotiationsSection contracts={contracts} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ContractTemplatesSection templates={templates} />
        </TabsContent>
      </Tabs>

      {/* Dialog de négociation */}
      <Dialog open={negotiationOpen} onOpenChange={setNegotiationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demande de négociation</DialogTitle>
            <DialogDescription>
              Proposez de nouvelles conditions pour votre contrat
            </DialogDescription>
          </DialogHeader>
          <NegotiationForm 
            contract={selectedContract}
            onSubmit={handleStartNegotiation}
            onCancel={() => setNegotiationOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Section contrat actuel
interface CurrentContractSectionProps {
  contracts: Contract[]
  onNegotiate: () => void
  onSign: (contractId: string) => void
  signing: boolean
}

function CurrentContractSection({ contracts, onNegotiate, onSign, signing }: CurrentContractSectionProps) {
  const activeContract = contracts.find(c => c.status === 'active')
  
  if (!activeContract) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun contrat actif</h3>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas de contrat actif actuellement
          </p>
          <Button>Demander un contrat</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Contrat actuel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Numéro</Label>
              <p className="font-mono">{activeContract.contractNumber}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Badge className={getTypeColor(activeContract.type)}>
                {activeContract.type}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Commission actuelle</span>
              <span className="font-semibold text-lg">{activeContract.commissionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Délai de paiement</span>
              <span className="font-medium">{activeContract.paymentTerms} jours</span>
            </div>
            {activeContract.minimumVolume && (
              <div className="flex justify-between">
                <span className="text-sm">Volume minimum</span>
                <span className="font-medium">{activeContract.minimumVolume.toLocaleString()}€</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Date de début</span>
              <span>{new Date(activeContract.startDate).toLocaleDateString()}</span>
            </div>
            {activeContract.endDate && (
              <div className="flex justify-between text-sm">
                <span>Date de fin</span>
                <span>{new Date(activeContract.endDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Renouvellement auto</span>
              <span>{activeContract.autoRenewal ? 'Oui' : 'Non'}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onNegotiate} className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              Négocier
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance contrat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Volume traité ce mois</span>
              <span className="font-medium">€24,650</span>
            </div>
            <Progress value={82} className="h-2" />
            <p className="text-xs text-muted-foreground">
              82% de l'objectif mensuel (€30,000)
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">156</div>
              <div className="text-xs text-muted-foreground">Livraisons</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">€2,094</div>
              <div className="text-xs text-muted-foreground">Commissions</div>
            </div>
          </div>

          {activeContract.bonusThresholds && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Bonus de volume</h4>
                <div className="space-y-2">
                  {activeContract.bonusThresholds.map((threshold, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>+{threshold.bonusRate}% si {threshold.volume.toLocaleString()}€</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Section négociations
function NegotiationsSection({ contracts }: { contracts: Contract[] }) {
  const negotiationContracts = contracts.filter(c => 
    c.status === 'under_negotiation' || c.negotiations.length > 0
  )

  return (
    <div className="space-y-6">
      {negotiationContracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{contract.title}</CardTitle>
                <p className="text-muted-foreground">#{contract.contractNumber}</p>
              </div>
              <Badge variant={getStatusBadge(contract.status).variant}>
                {getStatusBadge(contract.status).text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contract.negotiations.map((negotiation) => (
                <div key={negotiation.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      Proposition: {negotiation.proposedRate}% de commission
                    </span>
                    <Badge variant={
                      negotiation.status === 'accepted' ? 'default' :
                      negotiation.status === 'rejected' ? 'destructive' :
                      negotiation.status === 'counter_offered' ? 'secondary' : 'outline'
                    }>
                      {negotiation.status === 'accepted' ? 'Acceptée' :
                       negotiation.status === 'rejected' ? 'Refusée' :
                       negotiation.status === 'counter_offered' ? 'Contre-proposition' : 'En attente'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Justification:</strong> {negotiation.reason}
                  </p>
                  
                  {negotiation.response && (
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Réponse EcoDeli:</strong> {negotiation.response}
                      {negotiation.counterOffer && (
                        <div className="mt-2">
                          <span className="font-medium">Contre-proposition: {negotiation.counterOffer}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(negotiation.createdAt).toLocaleDateString()}
                    </span>
                    {negotiation.status === 'counter_offered' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Refuser
                        </Button>
                        <Button size="sm">
                          Accepter {negotiation.counterOffer}%
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {negotiationContracts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune négociation en cours</h3>
            <p className="text-muted-foreground">
              Vous pouvez négocier vos conditions contractuelles à tout moment
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Section templates de contrats
function ContractTemplatesSection({ templates }: { templates: ContractTemplate[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Choisissez votre type de contrat</h2>
        <p className="text-muted-foreground">
          Sélectionnez le contrat qui correspond le mieux à votre activité
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className={`relative ${template.recommended ? 'ring-2 ring-primary' : ''}`}>
            {template.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Recommandé
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
              <div className="text-3xl font-bold text-primary mt-2">
                {template.baseCommissionRate}%
              </div>
              <p className="text-sm text-muted-foreground">de commission</p>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2 mb-6">
                {template.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={template.recommended ? "default" : "outline"}
              >
                {template.type === 'CUSTOM' ? 'Demander un devis' : 'Choisir ce contrat'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Formulaire de négociation
interface NegotiationFormProps {
  contract: Contract | null
  onSubmit: (contractId: string, data: any) => void
  onCancel: () => void
}

function NegotiationForm({ contract, onSubmit, onCancel }: NegotiationFormProps) {
  const [formData, setFormData] = useState({
    proposedRate: contract?.commissionRate || 0,
    reason: '',
    requestedChanges: [] as string[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (contract) {
      onSubmit(contract.id, formData)
    }
  }

  const changeOptions = [
    'Réduction du taux de commission',
    'Amélioration des délais de paiement', 
    'Modification du volume minimum',
    'Ajout de bonus de performance',
    'Conditions de renouvellement',
    'Support prioritaire'
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="proposedRate">Taux de commission proposé (%)</Label>
        <Input
          id="proposedRate"
          type="number"
          step="0.1"
          min="0"
          max="20"
          value={formData.proposedRate}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            proposedRate: parseFloat(e.target.value) 
          }))}
          required
        />
        <p className="text-xs text-muted-foreground">
          Taux actuel: {contract?.commissionRate}%
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Justification de votre demande *</Label>
        <Textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="Expliquez pourquoi vous souhaitez modifier ce contrat..."
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Modifications demandées</Label>
        <div className="grid grid-cols-1 gap-2">
          {changeOptions.map((option) => (
            <label key={option} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={formData.requestedChanges.includes(option)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      requestedChanges: [...prev.requestedChanges, option]
                    }))
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      requestedChanges: prev.requestedChanges.filter(c => c !== option)
                    }))
                  }
                }}
                className="rounded"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          <Send className="h-4 w-4 mr-2" />
          Envoyer la demande
        </Button>
      </DialogFooter>
    </form>
  )
} 