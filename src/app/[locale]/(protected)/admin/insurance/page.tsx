import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gestion des Assurances - EcoDeli',
  description: 'Gestion des polices d\'assurance, sinistres et garanties'
}

// Données fictives pour la démonstration
const insuranceStats = {
  totalPolicies: 8,
  activeClaims: 12,
  pendingClaims: 5,
  resolvedClaims: 127,
  totalCoverage: 2500000,
  claimsThisMonth: 8,
  avgClaimAmount: 1250,
  claimRatio: 0.03
}

const recentClaims = [
  {
    id: '1',
    claimNumber: 'SIN202412001',
    claimantName: 'Marie Dubois',
    type: 'DAMAGE',
    amount: 850,
    status: 'UNDER_INVESTIGATION',
    createdAt: '2024-12-20',
    policyName: 'Transport de marchandises'
  },
  {
    id: '2',
    claimNumber: 'SIN202412002',
    claimantName: 'Pierre Martin',
    type: 'THEFT',
    amount: 1200,
    status: 'APPROVED',
    createdAt: '2024-12-18',
    policyName: 'Responsabilité civile'
  },
  {
    id: '3',
    claimNumber: 'SIN202412003',
    claimantName: 'Sophie Laurent',
    type: 'LOSS',
    amount: 650,
    status: 'BEING_ASSESSED',
    createdAt: '2024-12-15',
    policyName: 'Couverture stockage'
  }
]

const activePolicies = [
  {
    id: '1',
    name: 'Responsabilité civile professionnelle',
    provider: 'Assurances Générales SA',
    coverageAmount: 1000000,
    premiumAmount: 12000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    claimsCount: 15,
    category: 'PROFESSIONAL_LIABILITY'
  },
  {
    id: '2',
    name: 'Transport de marchandises',
    provider: 'Transport Assurance',
    coverageAmount: 500000,
    premiumAmount: 8500,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    claimsCount: 8,
    category: 'GOODS_TRANSPORT'
  },
  {
    id: '3',
    name: 'Couverture stockage',
    provider: 'Stock & Secure',
    coverageAmount: 250000,
    premiumAmount: 4200,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    claimsCount: 3,
    category: 'STORAGE_COVERAGE'
  }
]

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    REPORTED: 'outline',
    UNDER_INVESTIGATION: 'secondary',
    BEING_ASSESSED: 'default',
    APPROVED: 'default',
    REJECTED: 'destructive',
    SETTLED: 'default'
  }

  const labels: Record<string, string> = {
    REPORTED: 'Déclaré',
    UNDER_INVESTIGATION: 'Enquête',
    BEING_ASSESSED: 'Évaluation',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
    SETTLED: 'Réglé'
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  )
}

const getClaimTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    DAMAGE: 'Dommage',
    THEFT: 'Vol',
    LOSS: 'Perte',
    DELAY: 'Retard',
    PERSONAL_INJURY: 'Dommage corporel',
    LIABILITY: 'Responsabilité'
  }
  return labels[type] || type
}

export default function AdminInsurancePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Assurances</h1>
          <p className="text-muted-foreground">
            Gérez les polices d'assurance, sinistres et garanties
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Rapport
          </Button>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            Nouvelle Police
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Polices Actives</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insuranceStats.totalPolicies}</div>
            <p className="text-xs text-muted-foreground">
              Couverture totale: {(insuranceStats.totalCoverage / 1000000).toFixed(1)}M€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sinistres Actifs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insuranceStats.activeClaims}</div>
            <p className="text-xs text-muted-foreground">
              {insuranceStats.pendingClaims} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant Moyen</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insuranceStats.avgClaimAmount}€</div>
            <p className="text-xs text-muted-foreground">
              Par sinistre ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Sinistralité</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(insuranceStats.claimRatio * 100).toFixed(1)}%</div>
            <p className="text-xs text-green-600">
              -0.5% vs mois dernier
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="claims" className="space-y-6">
        <TabsList>
          <TabsTrigger value="claims">Sinistres</TabsTrigger>
          <TabsTrigger value="policies">Polices</TabsTrigger>
          <TabsTrigger value="warranties">Garanties</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sinistres Récents</CardTitle>
              <CardDescription>
                Liste des derniers sinistres déclarés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{claim.claimNumber}</span>
                        {getStatusBadge(claim.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {claim.claimantName} • {getClaimTypeLabel(claim.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {claim.policyName} • {new Date(claim.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{claim.amount}€</p>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        {claim.status === 'UNDER_INVESTIGATION' && (
                          <>
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Polices d'Assurance</CardTitle>
              <CardDescription>
                Gestion des polices d'assurance actives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePolicies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">{policy.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {policy.provider}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Couverture: {(policy.coverageAmount / 1000).toFixed(0)}k€</span>
                        <span>Prime: {policy.premiumAmount}€/an</span>
                        <span>{policy.claimsCount} sinistres</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2">
                        {policy.endDate > new Date().toISOString().split('T')[0] ? 'Active' : 'Expirée'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Expire le {new Date(policy.endDate).toLocaleDateString('fr-FR')}
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Eye className="h-3 w-3 mr-1" />
                        Détails
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warranties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Garanties Actives</CardTitle>
              <CardDescription>
                Suivi des garanties proposées aux clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Garantie Livraison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Garanties actives</span>
                        <span className="font-medium">156</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Réclamations</span>
                        <span className="font-medium">8</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Taux de réclamation</span>
                        <span className="font-medium">5.1%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Garantie Service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Garanties actives</span>
                        <span className="font-medium">89</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Réclamations</span>
                        <span className="font-medium">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Taux de réclamation</span>
                        <span className="font-medium">3.4%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Garantie Satisfaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Garanties actives</span>
                        <span className="font-medium">234</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Réclamations</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Taux de réclamation</span>
                        <span className="font-medium">5.1%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des Sinistres</CardTitle>
                <CardDescription>
                  Nombre de sinistres par mois
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique d'évolution des sinistres
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par Type</CardTitle>
                <CardDescription>
                  Distribution des types de sinistres
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Graphique en secteurs
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}