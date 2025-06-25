'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Play, 
  RefreshCw, 
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Download,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BillingStats {
  period: string
  totalInvoices: number
  totalAmount: number
  activeProviders: number
  pendingInvoices: number
  generatedInvoices: number
}

export function MonthlyBillingDashboard() {
  const t = useTranslations('admin.billing')
  const { toast } = useToast()
  
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    loadStats()
  }, [selectedMonth, selectedYear])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/billing/monthly-invoices?month=${selectedMonth}&year=${selectedYear}`)
      const result = await response.json()

      if (result.success) {
        setStats(result.stats)
      } else {
        throw new Error(result.message)
      }

    } catch (error) {
      console.error('Erreur chargement stats:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateInvoices = async () => {
    try {
      setGenerating(true)
      
      const response = await fetch('/api/admin/billing/monthly-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Succès !',
          description: result.message
        })
        
        // Afficher les détails si il y a des erreurs
        if (result.data.errors.length > 0) {
          console.warn('Erreurs lors de la génération:', result.data.errors)
          toast({
            title: 'Attention',
            description: `${result.data.errors.length} erreurs détectées. Vérifiez les logs.`,
            variant: 'destructive'
          })
        }

        await loadStats()
      } else {
        toast({
          title: 'Erreur',
          description: result.message,
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Erreur génération factures:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de générer les factures',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  const testCronJob = async () => {
    try {
      const response = await fetch('/api/cron/monthly-billing', {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Test réussi',
          description: `Cron job exécuté: ${result.results.generated} factures générées`
        })
        await loadStats()
      } else {
        toast({
          title: 'Erreur de test',
          description: result.error,
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Erreur test cron:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de tester le cron job',
        variant: 'destructive'
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ]

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des statistiques...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturation Mensuelle Automatique</h1>
          <p className="text-muted-foreground">
            Gestion des factures mensuelles des prestataires
          </p>
        </div>
        
        <div className="flex space-x-2">
          {process.env.NODE_ENV !== 'production' && (
            <Button variant="outline" onClick={testCronJob}>
              <Play className="h-4 w-4 mr-2" />
              Tester Cron
            </Button>
          )}
          
          <Button onClick={generateInvoices} disabled={generating}>
            {generating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Générer Factures
          </Button>
        </div>
      </div>

      {/* Sélecteur de période */}
      <Card>
        <CardHeader>
          <CardTitle>Période de facturation</CardTitle>
          <CardDescription>
            Sélectionnez la période pour laquelle vous souhaitez consulter ou générer les factures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 items-end">
            <div>
              <Label htmlFor="month">Mois</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Année</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={loadStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prestataires Actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProviders}</div>
              <p className="text-xs text-muted-foreground">
                prestataires éligibles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factures Générées</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.generatedInvoices}</div>
              <p className="text-xs text-muted-foreground">
                sur {stats.totalInvoices} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">
                factures à traiter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Montant Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                période {stats.period}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Informations sur le processus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Processus Automatique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Planification</h4>
              <p className="text-sm text-muted-foreground">
                Les factures sont générées automatiquement le 30 de chaque mois à 23h00 pour la période écoulée.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Traitement</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Récupération des interventions terminées</li>
                <li>• Calcul des commissions (15%)</li>
                <li>• Génération PDF automatique</li>
                <li>• Simulation virement bancaire</li>
                <li>• Notification aux prestataires</li>
              </ul>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configuration cron requise: <code>0 23 30 * *</code> sur l'URL <code>/api/cron/monthly-billing</code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Métriques Financières
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats && (
              <>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Taux de génération</span>
                  <Badge variant="outline">
                    {stats.totalInvoices > 0 ? 
                      Math.round((stats.generatedInvoices / stats.totalInvoices) * 100) : 0
                    }%
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Montant moyen</span>
                  <span className="font-semibold">
                    {stats.generatedInvoices > 0 ? 
                      formatCurrency(stats.totalAmount / stats.generatedInvoices) : 
                      formatCurrency(0)
                    }
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Commission EcoDeli (15%)</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(stats.totalAmount * 0.15)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm font-medium">Montant versé aux prestataires</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(stats.totalAmount * 0.85)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Gérez la facturation mensuelle et supervisez le processus automatique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={generateInvoices}
              disabled={generating}
            >
              <FileText className="h-6 w-6 mb-2" />
              <span>Générer Factures</span>
              <span className="text-xs text-muted-foreground">Période courante</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={loadStats}
            >
              <RefreshCw className="h-6 w-6 mb-2" />
              <span>Actualiser Stats</span>
              <span className="text-xs text-muted-foreground">Données temps réel</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              asChild
            >
              <a href="/admin/providers" target="_blank">
                <Users className="h-6 w-6 mb-2" />
                <span>Gérer Prestataires</span>
                <span className="text-xs text-muted-foreground">Validation & Contrats</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}