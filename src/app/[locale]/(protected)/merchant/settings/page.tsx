'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  SettingsIcon, 
  BellIcon, 
  ShieldIcon, 
  StoreIcon,
  CreditCardIcon,
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon,
  SaveIcon
} from 'lucide-react'

interface MerchantSettings {
  // Profil commerçant
  businessName: string
  businessType: string
  siret: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  website: string
  description: string
  
  // Paramètres de livraison
  deliveryEnabled: boolean
  deliveryZones: string[]
  deliveryHours: {
    start: string
    end: string
  }
  minOrderAmount: number
  deliveryFee: number
  
  // Notifications
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  orderNotifications: boolean
  deliveryNotifications: boolean
  marketingNotifications: boolean
  
  // Paramètres de paiement
  paymentMethods: string[]
  autoWithdraw: boolean
  withdrawalDay: number
  taxRate: number
  
  // Paramètres d'affichage
  displayMode: 'public' | 'private'
  showRatings: boolean
  showInventory: boolean
  showPrices: boolean
  
  // Intégrations
  posIntegration: boolean
  inventorySync: boolean
  accountingSync: boolean
}

export default function MerchantSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<MerchantSettings>({
    businessName: '',
    businessType: '',
    siret: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    phone: '',
    email: '',
    website: '',
    description: '',
    deliveryEnabled: true,
    deliveryZones: [],
    deliveryHours: {
      start: '09:00',
      end: '18:00'
    },
    minOrderAmount: 0,
    deliveryFee: 5.00,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderNotifications: true,
    deliveryNotifications: true,
    marketingNotifications: false,
    paymentMethods: ['stripe', 'paypal'],
    autoWithdraw: false,
    withdrawalDay: 15,
    taxRate: 20,
    displayMode: 'public',
    showRatings: true,
    showInventory: true,
    showPrices: true,
    posIntegration: false,
    inventorySync: false,
    accountingSync: false
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/merchant/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/merchant/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        // Afficher un message de succès
        console.log('Paramètres sauvegardés avec succès')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (key: keyof MerchantSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Paramètres du Commerce</h1>
        <p className="text-gray-600">Gérez les paramètres de votre commerce EcoDeli</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">
            <StoreIcon className="w-4 h-4 mr-2" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <TruckIcon className="w-4 h-4 mr-2" />
            Livraison
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellIcon className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCardIcon className="w-4 h-4 mr-2" />
            Paiement
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Intégrations
          </TabsTrigger>
        </TabsList>

        {/* Profil du Commerce */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="w-5 h-5" />
                Informations du Commerce
              </CardTitle>
              <CardDescription>
                Configurez les informations de base de votre commerce
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Nom du Commerce</Label>
                  <Input
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) => updateSettings('businessName', e.target.value)}
                    placeholder="Mon Super Commerce"
                  />
                </div>
                <div>
                  <Label htmlFor="businessType">Type de Commerce</Label>
                  <Select 
                    value={settings.businessType} 
                    onValueChange={(value) => updateSettings('businessType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="retail">Commerce de détail</SelectItem>
                      <SelectItem value="grocery">Épicerie</SelectItem>
                      <SelectItem value="pharmacy">Pharmacie</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={settings.siret}
                    onChange={(e) => updateSettings('siret', e.target.value)}
                    placeholder="12345678901234"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => updateSettings('phone', e.target.value)}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => updateSettings('address', e.target.value)}
                  placeholder="123 Rue de la Paix"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={settings.city}
                    onChange={(e) => updateSettings('city', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Code Postal</Label>
                  <Input
                    id="postalCode"
                    value={settings.postalCode}
                    onChange={(e) => updateSettings('postalCode', e.target.value)}
                    placeholder="75001"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={settings.country}
                    onChange={(e) => updateSettings('country', e.target.value)}
                    placeholder="France"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => updateSettings('description', e.target.value)}
                  placeholder="Décrivez votre commerce..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres de Livraison */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5" />
                Configuration de Livraison
              </CardTitle>
              <CardDescription>
                Configurez les paramètres de livraison et lâcher de chariot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deliveryEnabled">Livraison Activée</Label>
                  <p className="text-sm text-gray-600">
                    Autoriser les livraisons pour votre commerce
                  </p>
                </div>
                <Switch
                  id="deliveryEnabled"
                  checked={settings.deliveryEnabled}
                  onCheckedChange={(checked) => updateSettings('deliveryEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deliveryFee">Frais de Livraison (€)</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.deliveryFee}
                    onChange={(e) => updateSettings('deliveryFee', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="minOrderAmount">Montant Minimum (€)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.minOrderAmount}
                    onChange={(e) => updateSettings('minOrderAmount', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label>Horaires de Livraison</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="deliveryStart">Début</Label>
                    <Input
                      id="deliveryStart"
                      type="time"
                      value={settings.deliveryHours.start}
                      onChange={(e) => updateSettings('deliveryHours', {
                        ...settings.deliveryHours,
                        start: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryEnd">Fin</Label>
                    <Input
                      id="deliveryEnd"
                      type="time"
                      value={settings.deliveryHours.end}
                      onChange={(e) => updateSettings('deliveryHours', {
                        ...settings.deliveryHours,
                        end: e.target.value
                      })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellIcon className="w-5 h-5" />
                Préférences de Notifications
              </CardTitle>
              <CardDescription>
                Configurez vos préférences de notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email</Label>
                    <p className="text-sm text-gray-600">
                      Recevoir les notifications par email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSettings('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smsNotifications">SMS</Label>
                    <p className="text-sm text-gray-600">
                      Recevoir les notifications par SMS
                    </p>
                  </div>
                  <Switch
                    id="smsNotifications"
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) => updateSettings('smsNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushNotifications">Push</Label>
                    <p className="text-sm text-gray-600">
                      Recevoir les notifications push
                    </p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => updateSettings('pushNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="orderNotifications">Commandes</Label>
                    <p className="text-sm text-gray-600">
                      Notifications pour les nouvelles commandes
                    </p>
                  </div>
                  <Switch
                    id="orderNotifications"
                    checked={settings.orderNotifications}
                    onCheckedChange={(checked) => updateSettings('orderNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="deliveryNotifications">Livraisons</Label>
                    <p className="text-sm text-gray-600">
                      Notifications pour les mises à jour de livraison
                    </p>
                  </div>
                  <Switch
                    id="deliveryNotifications"
                    checked={settings.deliveryNotifications}
                    onCheckedChange={(checked) => updateSettings('deliveryNotifications', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paiement */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5" />
                Paramètres de Paiement
              </CardTitle>
              <CardDescription>
                Configurez vos méthodes de paiement et retraits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoWithdraw">Retrait Automatique</Label>
                  <p className="text-sm text-gray-600">
                    Effectuer les retraits automatiquement
                  </p>
                </div>
                <Switch
                  id="autoWithdraw"
                  checked={settings.autoWithdraw}
                  onCheckedChange={(checked) => updateSettings('autoWithdraw', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="withdrawalDay">Jour de Retrait</Label>
                  <Select 
                    value={settings.withdrawalDay.toString()} 
                    onValueChange={(value) => updateSettings('withdrawalDay', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un jour" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(28)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1} du mois
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => updateSettings('taxRate', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intégrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Intégrations
              </CardTitle>
              <CardDescription>
                Connectez vos systèmes existants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="posIntegration">Intégration POS</Label>
                  <p className="text-sm text-gray-600">
                    Connecter votre système de caisse
                  </p>
                </div>
                <Switch
                  id="posIntegration"
                  checked={settings.posIntegration}
                  onCheckedChange={(checked) => updateSettings('posIntegration', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="inventorySync">Sync Inventaire</Label>
                  <p className="text-sm text-gray-600">
                    Synchroniser l'inventaire automatiquement
                  </p>
                </div>
                <Switch
                  id="inventorySync"
                  checked={settings.inventorySync}
                  onCheckedChange={(checked) => updateSettings('inventorySync', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="accountingSync">Sync Comptabilité</Label>
                  <p className="text-sm text-gray-600">
                    Synchroniser avec votre logiciel comptable
                  </p>
                </div>
                <Switch
                  id="accountingSync"
                  checked={settings.accountingSync}
                  onCheckedChange={(checked) => updateSettings('accountingSync', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-8">
        <Button onClick={handleSave} disabled={saving}>
          <SaveIcon className="w-4 h-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </div>
  )
} 