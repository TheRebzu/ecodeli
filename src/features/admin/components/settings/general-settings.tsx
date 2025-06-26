'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Users,
  Package,
  DollarSign
} from 'lucide-react'

interface GeneralSettingsProps {
  onSettingsChange: () => void
}

export function GeneralSettings({ onSettingsChange }: GeneralSettingsProps) {
  const [settings, setSettings] = useState({
    // Informations de base
    appName: 'EcoDeli',
    appDescription: 'Plateforme de crowdshipping écologique',
    companyName: 'EcoDeli SAS',
    companyAddress: '110 rue de Flandre, 75019 Paris',
    companyPhone: '+33 1 42 00 00 00',
    companyEmail: 'contact@ecodeli.fr',
    
    // Configuration géographique
    defaultCountry: 'France',
    supportedCountries: ['France', 'Belgique', 'Suisse'],
    defaultCurrency: 'EUR',
    timezone: 'Europe/Paris',
    
    // Limites et quotas
    maxAnnouncementsPerUser: 10,
    maxDeliveriesPerDay: 5,
    maxFileSize: 10, // MB
    maxUsersPerWarehouse: 100,
    
    // Fonctionnalités
    enableTutorial: true,
    enableNotifications: true,
    enableReferralProgram: true,
    enableInsurance: true,
    maintenanceMode: false
  })

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    onSettingsChange()
  }

  return (
    <div className="space-y-6">
      {/* Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Informations de Base</span>
          </CardTitle>
          <CardDescription>
            Configuration générale de l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="appName">Nom de l'application</Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) => handleChange('appName', e.target.value)}
                placeholder="EcoDeli"
              />
            </div>
            
            <div>
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="EcoDeli SAS"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="appDescription">Description</Label>
            <Textarea
              id="appDescription"
              value={settings.appDescription}
              onChange={(e) => handleChange('appDescription', e.target.value)}
              placeholder="Description de l'application"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="companyEmail">Email de contact</Label>
              <Input
                id="companyEmail"
                type="email"
                value={settings.companyEmail}
                onChange={(e) => handleChange('companyEmail', e.target.value)}
                placeholder="contact@ecodeli.fr"
              />
            </div>
            
            <div>
              <Label htmlFor="companyPhone">Téléphone</Label>
              <Input
                id="companyPhone"
                value={settings.companyPhone}
                onChange={(e) => handleChange('companyPhone', e.target.value)}
                placeholder="+33 1 42 00 00 00"
              />
            </div>
            
            <div>
              <Label htmlFor="companyAddress">Adresse</Label>
              <Input
                id="companyAddress"
                value={settings.companyAddress}
                onChange={(e) => handleChange('companyAddress', e.target.value)}
                placeholder="110 rue de Flandre, 75019 Paris"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration géographique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Configuration Géographique</span>
          </CardTitle>
          <CardDescription>
            Paramètres régionaux et monétaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="defaultCountry">Pays par défaut</Label>
              <Select
                value={settings.defaultCountry}
                onValueChange={(value) => handleChange('defaultCountry', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Belgique">Belgique</SelectItem>
                  <SelectItem value="Suisse">Suisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="defaultCurrency">Devise par défaut</Label>
              <Select
                value={settings.defaultCurrency}
                onValueChange={(value) => handleChange('defaultCurrency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="CHF">CHF (CHF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                  <SelectItem value="Europe/Brussels">Europe/Brussels</SelectItem>
                  <SelectItem value="Europe/Zurich">Europe/Zurich</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Pays supportés</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {settings.supportedCountries.map((country, index) => (
                <Badge key={index} variant="secondary">
                  {country}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limites et quotas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Limites et Quotas</span>
          </CardTitle>
          <CardDescription>
            Configuration des limites d'utilisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxAnnouncements">Annonces max par utilisateur</Label>
              <Input
                id="maxAnnouncements"
                type="number"
                value={settings.maxAnnouncementsPerUser}
                onChange={(e) => handleChange('maxAnnouncementsPerUser', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            
            <div>
              <Label htmlFor="maxDeliveries">Livraisons max par jour</Label>
              <Input
                id="maxDeliveries"
                type="number"
                value={settings.maxDeliveriesPerDay}
                onChange={(e) => handleChange('maxDeliveriesPerDay', parseInt(e.target.value))}
                min="1"
                max="20"
              />
            </div>
            
            <div>
              <Label htmlFor="maxFileSize">Taille max des fichiers (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => handleChange('maxFileSize', parseInt(e.target.value))}
                min="1"
                max="50"
              />
            </div>
            
            <div>
              <Label htmlFor="maxUsersPerWarehouse">Utilisateurs max par entrepôt</Label>
              <Input
                id="maxUsersPerWarehouse"
                type="number"
                value={settings.maxUsersPerWarehouse}
                onChange={(e) => handleChange('maxUsersPerWarehouse', parseInt(e.target.value))}
                min="10"
                max="1000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fonctionnalités */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Fonctionnalités</span>
          </CardTitle>
          <CardDescription>
            Activation/désactivation des fonctionnalités
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tutoriel obligatoire</Label>
                <p className="text-sm text-muted-foreground">
                  Afficher le tutoriel à la première connexion
                </p>
              </div>
              <Switch
                checked={settings.enableTutorial}
                onCheckedChange={(checked) => handleChange('enableTutorial', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications push</Label>
                <p className="text-sm text-muted-foreground">
                  Activer les notifications OneSignal
                </p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => handleChange('enableNotifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Programme de parrainage</Label>
                <p className="text-sm text-muted-foreground">
                  Activer le système de parrainage
                </p>
              </div>
              <Switch
                checked={settings.enableReferralProgram}
                onCheckedChange={(checked) => handleChange('enableReferralProgram', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Assurance livraison</Label>
                <p className="text-sm text-muted-foreground">
                  Activer les assurances sur les livraisons
                </p>
              </div>
              <Switch
                checked={settings.enableInsurance}
                onCheckedChange={(checked) => handleChange('enableInsurance', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mode maintenance</Label>
                <p className="text-sm text-muted-foreground">
                  Mettre l'application en maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleChange('maintenanceMode', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 