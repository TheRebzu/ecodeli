"use client";

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings,
  Zap,
  Database,
  Calculator,
  CreditCard,
  Package,
  BarChart3,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  Upload,
  Loader2,
  Key,
  Link as LinkIcon,
  Smartphone,
  Globe,
  Shield
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'

interface Integration {
  id: string
  name: string
  description: string
  category: 'pos' | 'inventory' | 'accounting' | 'payment' | 'analytics' | 'communication'
  status: 'connected' | 'disconnected' | 'error'
  icon: any
  features: string[]
  lastSync?: string
  enabled: boolean
  config?: any
}

interface IntegrationConfig {
  pos: {
    provider: string
    apiKey: string
    endpoint: string
    syncFrequency: string
    autoSync: boolean
  }
  inventory: {
    provider: string
    warehouseId: string
    apiKey: string
    stockThreshold: number
    autoReorder: boolean
  }
  accounting: {
    provider: string
    companyId: string
    apiKey: string
    autoInvoice: boolean
    taxRate: number
  }
}

export default function MerchantIntegrationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [config, setConfig] = useState<IntegrationConfig>({
    pos: {
      provider: '',
      apiKey: '',
      endpoint: '',
      syncFrequency: 'hourly',
      autoSync: false
    },
    inventory: {
      provider: '',
      warehouseId: '',
      apiKey: '',
      stockThreshold: 10,
      autoReorder: false
    },
    accounting: {
      provider: '',
      companyId: '',
      apiKey: '',
      autoInvoice: false,
      taxRate: 20
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Intégrations disponibles selon les spécifications EcoDeli
  const availableIntegrations: Integration[] = [
    {
      id: 'pos-shopify',
      name: 'Shopify POS',
      description: 'Synchronisation avec votre caisse Shopify pour le lâcher de chariot',
      category: 'pos',
      status: 'disconnected',
      icon: Smartphone,
      features: ['Sync produits', 'Commandes temps réel', 'Inventaire', 'Clients'],
      enabled: false
    },
    {
      id: 'pos-woocommerce',
      name: 'WooCommerce',
      description: 'Intégration avec votre boutique WooCommerce',
      category: 'pos',
      status: 'disconnected',
      icon: Globe,
      features: ['Catalogue produits', 'Gestion commandes', 'Livraisons EcoDeli'],
      enabled: false
    },
    {
      id: 'inventory-odoo',
      name: 'Odoo Inventory',
      description: 'Gestion automatique des stocks et réapprovisionnement',
      category: 'inventory',
      status: 'disconnected',
      icon: Package,
      features: ['Stocks temps réel', 'Alertes rupture', 'Réassort auto', 'Traçabilité'],
      enabled: false
    },
    {
      id: 'accounting-sage',
      name: 'Sage Comptabilité',
      description: 'Synchronisation automatique avec votre logiciel comptable',
      category: 'accounting',
      status: 'disconnected',
      icon: Calculator,
      features: ['Factures auto', 'TVA', 'Grand livre', 'Déclarations'],
      enabled: false
    },
    {
      id: 'payment-stripe',
      name: 'Stripe Connect',
      description: 'Paiements et virements automatiques EcoDeli',
      category: 'payment',
      status: 'connected',
      icon: CreditCard,
      features: ['Paiements', 'Virements', 'Reporting', 'Sécurité'],
      enabled: true,
      lastSync: new Date().toISOString()
    },
    {
      id: 'analytics-google',
      name: 'Google Analytics',
      description: 'Suivi des performances de vos annonces EcoDeli',
      category: 'analytics',
      status: 'disconnected',
      icon: BarChart3,
      features: ['Trafic web', 'Conversions', 'ROI', 'Audiences'],
      enabled: false
    }
  ]

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/merchant/integrations', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations || availableIntegrations)
        setConfig(data.config || config)
      } else {
        setIntegrations(availableIntegrations)
      }
    } catch (error) {
      console.error('Erreur chargement intégrations:', error)
      setIntegrations(availableIntegrations)
    } finally {
      setLoading(false)
    }
  }

  const handleIntegrationToggle = async (integrationId: string, enabled: boolean) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/merchant/integrations/${integrationId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        setIntegrations(prev => prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, enabled, status: enabled ? 'connected' : 'disconnected' }
            : integration
        ))
        toast({
          title: "Intégration mise à jour",
          description: `${enabled ? 'Activée' : 'Désactivée'} avec succès`
        })
      } else {
        throw new Error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour l'intégration"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleConfigSave = async (category: keyof IntegrationConfig) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/merchant/integrations/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category, config: config[category] })
      })

      if (response.ok) {
        toast({
          title: "Configuration sauvegardée",
          description: "Les paramètres ont été mis à jour"
        })
      } else {
        throw new Error('Erreur sauvegarde')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration"
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: { variant: 'default' as const, text: 'Connecté', icon: CheckCircle },
      disconnected: { variant: 'secondary' as const, text: 'Déconnecté', icon: AlertCircle },
      error: { variant: 'destructive' as const, text: 'Erreur', icon: AlertCircle }
    }
    return variants[status as keyof typeof variants] || variants.disconnected
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      pos: Smartphone,
      inventory: Package,
      accounting: Calculator,
      payment: CreditCard,
      analytics: BarChart3,
      communication: LinkIcon
    }
    return icons[category as keyof typeof icons] || Settings
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des intégrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intégrations</h1>
          <p className="text-muted-foreground">
            Connectez vos systèmes existants avec la plateforme EcoDeli
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {integrations.filter(i => i.enabled).length} / {integrations.length} Actives
          </Badge>
        </div>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Toutes les intégrations utilisent des connexions sécurisées (SSL/TLS) et respectent les standards de sécurité EcoDeli.
          Vos données sont protégées et synchronisées en temps réel.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="pos">Points de vente</TabsTrigger>
          <TabsTrigger value="inventory">Inventaire</TabsTrigger>
          <TabsTrigger value="accounting">Comptabilité</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Vue d'ensemble des intégrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => {
              const CategoryIcon = getCategoryIcon(integration.category)
              const statusBadge = getStatusBadge(integration.status)
              const StatusIcon = statusBadge.icon

              return (
                <Card key={integration.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <Badge variant={statusBadge.variant} className="text-xs mt-1">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusBadge.text}
                          </Badge>
                        </div>
                      </div>
                      <Switch 
                        checked={integration.enabled}
                        onCheckedChange={(checked) => handleIntegrationToggle(integration.id, checked)}
                        disabled={saving}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      {integration.description}
                    </CardDescription>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Fonctionnalités:</h4>
                      <div className="flex flex-wrap gap-1">
                        {integration.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {integration.lastSync && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Dernière sync: {new Date(integration.lastSync).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="pos" className="space-y-6">
          {/* Configuration POS pour lâcher de chariot */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Point de Vente</CardTitle>
              <CardDescription>
                Configurez l'intégration avec votre système de caisse pour le service "lâcher de chariot" EcoDeli
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="pos-provider">Fournisseur POS</Label>
                  <Select 
                    value={config.pos.provider} 
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      pos: { ...prev.pos, provider: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre POS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shopify">Shopify POS</SelectItem>
                      <SelectItem value="woocommerce">WooCommerce</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="lightspeed">Lightspeed</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="pos-endpoint">URL d'API</Label>
                  <Input
                    id="pos-endpoint"
                    placeholder="https://api.exemple.com"
                    value={config.pos.endpoint}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pos: { ...prev.pos, endpoint: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="pos-api-key">Clé API</Label>
                  <Input
                    id="pos-api-key"
                    type="password"
                    placeholder="Votre clé API sécurisée"
                    value={config.pos.apiKey}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pos: { ...prev.pos, apiKey: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="sync-frequency">Fréquence de synchronisation</Label>
                  <Select 
                    value={config.pos.syncFrequency} 
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      pos: { ...prev.pos, syncFrequency: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Temps réel</SelectItem>
                      <SelectItem value="hourly">Toutes les heures</SelectItem>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="manual">Manuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-sync"
                  checked={config.pos.autoSync}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    pos: { ...prev.pos, autoSync: checked }
                  }))}
                />
                <Label htmlFor="auto-sync">Synchronisation automatique des commandes</Label>
              </div>

              <Button onClick={() => handleConfigSave('pos')} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sauvegarder la configuration POS
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          {/* Configuration Inventaire */}
          <Card>
            <CardHeader>
              <CardTitle>Gestion d'Inventaire</CardTitle>
              <CardDescription>
                Synchronisez vos stocks avec EcoDeli pour une gestion optimale des livraisons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="inventory-provider">Système d'inventaire</Label>
                  <Select 
                    value={config.inventory.provider} 
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      inventory: { ...prev.inventory, provider: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre système" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="odoo">Odoo Inventory</SelectItem>
                      <SelectItem value="sap">SAP Business One</SelectItem>
                      <SelectItem value="sage">Sage X3</SelectItem>
                      <SelectItem value="custom">Système personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="warehouse-id">ID Entrepôt</Label>
                  <Input
                    id="warehouse-id"
                    placeholder="Identifiant de votre entrepôt"
                    value={config.inventory.warehouseId}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      inventory: { ...prev.inventory, warehouseId: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="inventory-api-key">Clé API Inventaire</Label>
                  <Input
                    id="inventory-api-key"
                    type="password"
                    placeholder="Clé d'accès à votre inventaire"
                    value={config.inventory.apiKey}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      inventory: { ...prev.inventory, apiKey: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="stock-threshold">Seuil d'alerte stock</Label>
                  <Input
                    id="stock-threshold"
                    type="number"
                    placeholder="10"
                    value={config.inventory.stockThreshold}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      inventory: { ...prev.inventory, stockThreshold: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-reorder"
                  checked={config.inventory.autoReorder}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    inventory: { ...prev.inventory, autoReorder: checked }
                  }))}
                />
                <Label htmlFor="auto-reorder">Réapprovisionnement automatique</Label>
              </div>

              <Button onClick={() => handleConfigSave('inventory')} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sauvegarder la configuration Inventaire
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounting" className="space-y-6">
          {/* Configuration Comptabilité */}
          <Card>
            <CardHeader>
              <CardTitle>Intégration Comptable</CardTitle>
              <CardDescription>
                Synchronisez automatiquement vos factures et paiements EcoDeli avec votre logiciel comptable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="accounting-provider">Logiciel comptable</Label>
                  <Select 
                    value={config.accounting.provider} 
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      accounting: { ...prev.accounting, provider: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre logiciel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sage">Sage Comptabilité</SelectItem>
                      <SelectItem value="cegid">Cegid Business</SelectItem>
                      <SelectItem value="ebp">EBP Compta</SelectItem>
                      <SelectItem value="quickbooks">QuickBooks</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="company-id">ID Société</Label>
                  <Input
                    id="company-id"
                    placeholder="Identifiant de votre société"
                    value={config.accounting.companyId}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      accounting: { ...prev.accounting, companyId: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="accounting-api-key">Clé API Comptabilité</Label>
                  <Input
                    id="accounting-api-key"
                    type="password"
                    placeholder="Clé d'accès comptable"
                    value={config.accounting.apiKey}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      accounting: { ...prev.accounting, apiKey: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="tax-rate">Taux de TVA (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    placeholder="20"
                    value={config.accounting.taxRate}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      accounting: { ...prev.accounting, taxRate: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-invoice"
                  checked={config.accounting.autoInvoice}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    accounting: { ...prev.accounting, autoInvoice: checked }
                  }))}
                />
                <Label htmlFor="auto-invoice">Facturation automatique vers la comptabilité</Label>
              </div>

              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertDescription>
                  Les factures EcoDeli seront automatiquement exportées vers votre logiciel comptable 
                  avec la TVA calculée selon le taux configuré.
                </AlertDescription>
              </Alert>

              <Button onClick={() => handleConfigSave('accounting')} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sauvegarder la configuration Comptable
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 