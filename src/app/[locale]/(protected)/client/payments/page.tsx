"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  CreditCard, 
  Download, 
  Search, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Filter
} from "lucide-react"

interface Payment {
  id: string
  type: 'DELIVERY_PAYMENT' | 'SUBSCRIPTION' | 'CANCELLATION_FEE' | 'INSURANCE_CLAIM'
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  description: string
  createdAt: string
  recipientName?: string
  deliveryId?: string
  stripePaymentId?: string
  refundAmount?: number
}

interface PaymentStats {
  totalSpent: number
  totalRefunds: number
  totalPending: number
  monthlySpending: Array<{
    month: string
    amount: number
  }>
}

const statusLabels = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Échoué', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'Remboursé', color: 'bg-blue-100 text-blue-800' }
}

const typeLabels = {
  DELIVERY_PAYMENT: { label: 'Paiement livraison', icon: '📦' },
  SUBSCRIPTION: { label: 'Abonnement', icon: '👑' },
  CANCELLATION_FEE: { label: 'Frais annulation', icon: '❌' },
  INSURANCE_CLAIM: { label: 'Assurance', icon: '🛡️' }
}

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const t = useTranslations()

  useEffect(() => {
    fetchPayments()
  }, [filters, currentPage])

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })

      const response = await fetch(`/api/client/payments?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
        setStats(data.stats || null)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Erreur récupération paiements:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportPayments = async (format: 'pdf' | 'csv') => {
    try {
      const params = new URLSearchParams({
        format,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })

      const response = await fetch(`/api/client/payments/export?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `paiements-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erreur export:', error)
      alert('Erreur lors de l\'export')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(amount)
  }

  if (isLoading && payments.length === 0) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💳 Mes Paiements
          </h1>
          <p className="text-gray-600">
            Consultez l'historique de vos paiements et téléchargez vos factures
          </p>
        </div>

        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            {/* Filtres */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Recherche</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Description, ID..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters({...filters, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tous les statuts</SelectItem>
                        <SelectItem value="PENDING">En attente</SelectItem>
                        <SelectItem value="COMPLETED">Terminé</SelectItem>
                        <SelectItem value="FAILED">Échoué</SelectItem>
                        <SelectItem value="REFUNDED">Remboursé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={filters.type}
                      onValueChange={(value) => setFilters({...filters, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tous les types</SelectItem>
                        <SelectItem value="DELIVERY_PAYMENT">Paiement livraison</SelectItem>
                        <SelectItem value="SUBSCRIPTION">Abonnement</SelectItem>
                        <SelectItem value="CANCELLATION_FEE">Frais annulation</SelectItem>
                        <SelectItem value="INSURANCE_CLAIM">Assurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end gap-2">
                    <Button onClick={() => setFilters({
                      status: '', type: '', dateFrom: '', dateTo: '', search: ''
                    })} variant="outline" size="sm">
                      Réinitialiser
                    </Button>
                    <Button onClick={() => exportPayments('pdf')} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button onClick={() => exportPayments('csv')} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des paiements */}
            {payments.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-gray-500 text-lg mb-4">
                    💳 Aucun paiement trouvé
                  </div>
                  <p className="text-gray-400">
                    Vos paiements apparaîtront ici une fois effectués
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">
                            {typeLabels[payment.type]?.icon || '💳'}
                          </div>
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {typeLabels[payment.type]?.label || payment.type}
                              <Badge className={statusLabels[payment.status].color}>
                                {statusLabels[payment.status].label}
                              </Badge>
                            </h4>
                            <p className="text-sm text-gray-600">{payment.description}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(payment.createdAt)}
                              {payment.recipientName && ` • Vers: ${payment.recipientName}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            payment.status === 'REFUNDED' ? 'text-blue-600' :
                            payment.status === 'FAILED' ? 'text-red-600' :
                            'text-green-600'
                          }`}>
                            {payment.status === 'REFUNDED' && '+'}
                            {formatAmount(payment.amount, payment.currency)}
                          </div>
                          {payment.refundAmount && (
                            <div className="text-sm text-blue-600">
                              Remboursé: {formatAmount(payment.refundAmount, payment.currency)}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {payment.deliveryId && (
                              <Button variant="outline" size="sm">
                                👁️ Voir livraison
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Facture
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <>
                {/* Résumé financier */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Total dépensé
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatAmount(stats.totalSpent)}
                      </div>
                      <p className="text-xs text-gray-500">Toutes périodes confondues</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Total remboursé
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatAmount(stats.totalRefunds)}
                      </div>
                      <p className="text-xs text-gray-500">Remboursements reçus</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        En attente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatAmount(stats.totalPending)}
                      </div>
                      <p className="text-xs text-gray-500">Paiements à traiter</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Graphique des dépenses mensuelles (placeholder) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Évolution des dépenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                        <p>Graphique des dépenses mensuelles</p>
                        <p className="text-sm mt-2">Intégration Chart.js en cours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Répartition par type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Répartition par type de paiement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(typeLabels).map(([type, info]) => {
                        const typePayments = payments.filter(p => p.type === type && p.status === 'COMPLETED')
                        const total = typePayments.reduce((sum, p) => sum + p.amount, 0)
                        const percentage = stats.totalSpent > 0 ? (total / stats.totalSpent) * 100 : 0
                        
                        return (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{info.icon}</span>
                              <span className="text-sm font-medium">{info.label}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{formatAmount(total)}</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}