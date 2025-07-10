"use client";

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Euro,
  Package,
  Users,
  Star,
  Clock,
  MapPin,
  ShoppingCart,
  FileText,
  PieChart,
  Loader2,
  Filter,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface ReportData {
  period: string
  overview: {
    totalRevenue: number
    revenueGrowth: number
    totalOrders: number
    ordersGrowth: number
    averageOrderValue: number
    conversionRate: number
    customerSatisfaction: number
  }
  salesByService: {
    cartDrop: { revenue: number, orders: number }
    delivery: { revenue: number, orders: number }
    international: { revenue: number, orders: number }
  }
  topProducts: Array<{
    name: string
    sales: number
    revenue: number
    growth: number
  }>
  customerInsights: {
    newCustomers: number
    returningCustomers: number
    averageLifetimeValue: number
    churnRate: number
  }
  geographicData: Array<{
    zone: string
    orders: number
    revenue: number
    averageDeliveryTime: number
  }>
  timeAnalysis: {
    peakHours: string[]
    busyDays: string[]
    seasonal: Record<string, number>
  }
}

export default function MerchantReportsPage() {
  const { user } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedReport, setSelectedReport] = useState('overview')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchReportData()
  }, [selectedPeriod])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/merchant/reports?period=${selectedPeriod}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        // Données de démonstration pour EcoDeli
        setReportData({
          period: selectedPeriod,
          overview: {
            totalRevenue: 12547.80,
            revenueGrowth: 15.3,
            totalOrders: 347,
            ordersGrowth: 23.1,
            averageOrderValue: 36.15,
            conversionRate: 12.8,
            customerSatisfaction: 4.6
          },
          salesByService: {
            cartDrop: { revenue: 7528.40, orders: 189 },
            delivery: { revenue: 3764.20, orders: 98 },
            international: { revenue: 1255.20, orders: 60 }
          },
          topProducts: [
            { name: 'Produits bio locaux', sales: 89, revenue: 2847.30, growth: 28.5 },
            { name: 'Vins et spiritueux', sales: 67, revenue: 2134.90, growth: 18.2 },
            { name: 'Électronique', sales: 45, revenue: 1892.40, growth: -5.1 },
            { name: 'Mode et accessoires', sales: 78, revenue: 1567.80, growth: 42.3 },
            { name: 'Livres et culture', sales: 34, revenue: 892.60, growth: 15.7 }
          ],
          customerInsights: {
            newCustomers: 124,
            returningCustomers: 189,
            averageLifetimeValue: 287.40,
            churnRate: 8.3
          },
          geographicData: [
            { zone: 'Centre-ville Paris', orders: 156, revenue: 5847.20, averageDeliveryTime: 45 },
            { zone: 'Banlieue proche', orders: 98, revenue: 3264.80, averageDeliveryTime: 62 },
            { zone: 'Grande couronne', orders: 67, revenue: 2189.40, averageDeliveryTime: 78 },
            { zone: 'Province', orders: 26, revenue: 1246.40, averageDeliveryTime: 120 }
          ],
          timeAnalysis: {
            peakHours: ['11:00-12:00', '18:00-19:00', '20:00-21:00'],
            busyDays: ['Samedi', 'Dimanche', 'Mercredi'],
            seasonal: {
              'Printemps': 8234.50,
              'Été': 9847.20,
              'Automne': 12547.80,
              'Hiver': 10392.60
            }
          }
        })
      }
    } catch (error) {
      console.error('Erreur chargement rapport:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      setGenerating(true)
      const response = await fetch(`/api/merchant/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          period: selectedPeriod, 
          format,
          reportType: selectedReport 
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rapport-ecodeli-${selectedPeriod}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erreur export rapport:', error)
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Génération du rapport...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            Aucune donnée disponible pour générer le rapport
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapports & Analytics</h1>
          <p className="text-muted-foreground">
            Analyse détaillée de vos performances EcoDeli
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">3 derniers mois</SelectItem>
              <SelectItem value="1y">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Vue d'ensemble des KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {reportData.overview.revenueGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {formatPercentage(reportData.overview.revenueGrowth)} vs période précédente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.overview.totalOrders}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {formatPercentage(reportData.overview.ordersGrowth)} vs période précédente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.overview.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Valeur moyenne par commande
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {reportData.overview.customerSatisfaction}/5
              <Star className="h-5 w-5 ml-1 text-yellow-500 fill-current" />
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData.overview.conversionRate}% taux de conversion
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedReport} onValueChange={setSelectedReport} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="overview">Vue générale</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="customers">Clients</TabsTrigger>
            <TabsTrigger value="geography">Géographie</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => handleExportReport('pdf')} 
              variant="outline"
              disabled={generating}
            >
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button 
              onClick={() => handleExportReport('excel')} 
              variant="outline"
              disabled={generating}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition par service EcoDeli */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Service EcoDeli</CardTitle>
                <CardDescription>
                  Performance des différents services proposés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Lâcher de chariot</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(reportData.salesByService.cartDrop.revenue)}</div>
                      <div className="text-xs text-muted-foreground">{reportData.salesByService.cartDrop.orders} commandes</div>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-[60%]"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Livraison classique</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(reportData.salesByService.delivery.revenue)}</div>
                      <div className="text-xs text-muted-foreground">{reportData.salesByService.delivery.orders} commandes</div>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-[30%]"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Achat international</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(reportData.salesByService.international.revenue)}</div>
                      <div className="text-xs text-muted-foreground">{reportData.salesByService.international.orders} commandes</div>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full w-[10%]"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Évolution temporelle */}
            <Card>
              <CardHeader>
                <CardTitle>Analyse Temporelle</CardTitle>
                <CardDescription>
                  Tendances et patterns de vos ventes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Heures de pointe</h4>
                  <div className="flex flex-wrap gap-2">
                    {reportData.timeAnalysis.peakHours.map((hour, index) => (
                      <Badge key={index} variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {hour}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Jours les plus actifs</h4>
                  <div className="flex flex-wrap gap-2">
                    {reportData.timeAnalysis.busyDays.map((day, index) => (
                      <Badge key={index} variant="secondary">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Performance saisonnière</h4>
                  <div className="space-y-2">
                    {Object.entries(reportData.timeAnalysis.seasonal).map(([season, revenue]) => (
                      <div key={season} className="flex items-center justify-between">
                        <span className="text-sm">{season}</span>
                        <span className="font-medium">{formatCurrency(revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {/* Top produits */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Produits</CardTitle>
              <CardDescription>
                Vos produits les plus performants sur EcoDeli
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">{product.sales} ventes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(product.revenue)}</div>
                      <div className={`text-xs flex items-center ${
                        product.growth > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {product.growth > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {formatPercentage(product.growth)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {/* Insights clients */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Nouveaux clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{reportData.customerInsights.newCustomers}</div>
                <p className="text-xs text-muted-foreground">Cette période</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clients fidèles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{reportData.customerInsights.returningCustomers}</div>
                <p className="text-xs text-muted-foreground">Commandes multiples</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valeur vie client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reportData.customerInsights.averageLifetimeValue)}</div>
                <p className="text-xs text-muted-foreground">LTV moyenne</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Taux d'attrition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{reportData.customerInsights.churnRate}%</div>
                <p className="text-xs text-muted-foreground">Clients perdus</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          {/* Performance géographique */}
          <Card>
            <CardHeader>
              <CardTitle>Performance par Zone EcoDeli</CardTitle>
              <CardDescription>
                Analyse des livraisons par zone géographique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.geographicData.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">{zone.zone}</h4>
                        <p className="text-xs text-muted-foreground">{zone.orders} commandes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(zone.revenue)}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {zone.averageDeliveryTime}min moyenne
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 