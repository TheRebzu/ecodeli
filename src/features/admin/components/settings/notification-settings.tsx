'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { 
  Bell, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Globe,
  Loader2
} from 'lucide-react'

interface NotificationSettingsProps {
  onSettingsChange: () => void
}

export function NotificationSettings({ onSettingsChange }: NotificationSettingsProps) {
  const { toast } = useToast()
  const [isTestingSMTP, setIsTestingSMTP] = useState(false)

  const [settings, setSettings] = useState({
    // Configuration OneSignal
    onesignalEnabled: true,
    onesignalAppId: 'your-app-id',
    onesignalApiKey: 'your-api-key',
    onesignalRestApiKey: 'your-rest-api-key',
    
    // Types de notifications
    notificationTypes: {
      deliveryOpportunity: { enabled: true, email: true, push: true, sms: false },
      deliveryUpdate: { enabled: true, email: true, push: true, sms: false },
      paymentReceived: { enabled: true, email: true, push: true, sms: false },
      documentValidation: { enabled: true, email: true, push: true, sms: false },
      bookingConfirmed: { enabled: true, email: true, push: true, sms: false },
      systemMaintenance: { enabled: true, email: true, push: true, sms: false }
    },
    
    // Configuration email
    emailProvider: 'resend',
    emailFromAddress: 'noreply@ecodeli.fr',
    emailFromName: 'EcoDeli',
    emailReplyTo: 'support@ecodeli.fr',
    
    // Configuration SMTP (nouveaux champs)
    smtpHost: 'mail.celian-vf.fr',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: false,
    
    // Configuration SMS
    smsEnabled: false,
    smsProvider: 'twilio',
    smsFromNumber: '+33123456789',
    
    // Templates
    templates: {
      welcome: {
        subject: 'Bienvenue sur EcoDeli !',
        body: 'Bonjour {{firstName}}, bienvenue sur EcoDeli !'
      },
      deliveryOpportunity: {
        subject: 'Nouvelle opportunité de livraison',
        body: 'Une nouvelle livraison correspond à votre trajet !'
      },
      paymentSuccess: {
        subject: 'Paiement confirmé',
        body: 'Votre paiement de {{amount}}€ a été confirmé.'
      }
    },
    
    // Paramètres généraux
    enableNotifications: true,
    quietHours: { start: '22:00', end: '08:00' },
    maxNotificationsPerDay: 10,
    enableRichNotifications: true,
    
    // Localisation
    defaultLanguage: 'fr',
    supportedLanguages: ['fr', 'en', 'es'],
    
    // Analytics
    enableNotificationAnalytics: true,
    trackOpenRates: true,
    trackClickRates: true
  })

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    onSettingsChange()
  }

  const handleNestedChange = (parentKey: string, childKey: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey as keyof typeof prev] as Record<string, any>),
        [childKey]: value
      }
    }))
    onSettingsChange()
  }

  const handleNotificationTypeChange = (type: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      notificationTypes: {
        ...prev.notificationTypes,
        [type]: {
          ...prev.notificationTypes[type as keyof typeof prev.notificationTypes],
          [field]: value
        }
      }
    }))
    onSettingsChange()
  }

  const testSMTPConfiguration = async () => {
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword || !settings.emailFromAddress) {
      toast({
        title: "Configuration incomplète",
        description: "Veuillez remplir tous les champs SMTP avant de tester.",
        variant: "destructive"
      })
      return
    }

    setIsTestingSMTP(true)
    
    try {
      const response = await fetch('/api/admin/settings/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: settings.smtpHost,
          port: settings.smtpPort,
          user: settings.smtpUser,
          password: settings.smtpPassword,
          secure: settings.smtpSecure,
          fromAddress: settings.emailFromAddress
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Test SMTP réussi",
          description: "La configuration SMTP fonctionne correctement. Un email de test a été envoyé.",
          variant: "default"
        })
      } else {
        toast({
          title: "Test SMTP échoué",
          description: result.error || "Erreur lors du test de la configuration SMTP.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erreur lors du test SMTP:', error)
      toast({
        title: "Erreur de connexion",
        description: "Impossible de contacter le serveur pour tester la configuration SMTP.",
        variant: "destructive"
      })
    } finally {
      setIsTestingSMTP(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuration OneSignal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Configuration OneSignal</span>
            {settings.onesignalEnabled && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configuration des notifications push via OneSignal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer OneSignal</Label>
              <p className="text-sm text-muted-foreground">
                Activer les notifications push
              </p>
            </div>
            <Switch
              checked={settings.onesignalEnabled}
              onCheckedChange={(checked) => handleChange('onesignalEnabled', checked)}
            />
          </div>
          
          {settings.onesignalEnabled && (
            <>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="onesignalAppId">App ID</Label>
                  <Input
                    id="onesignalAppId"
                    value={settings.onesignalAppId}
                    onChange={(e) => handleChange('onesignalAppId', e.target.value)}
                    placeholder="your-app-id"
                    type="password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="onesignalApiKey">API Key</Label>
                  <Input
                    id="onesignalApiKey"
                    value={settings.onesignalApiKey}
                    onChange={(e) => handleChange('onesignalApiKey', e.target.value)}
                    placeholder="your-api-key"
                    type="password"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="onesignalRestApiKey">REST API Key</Label>
                <Input
                  id="onesignalRestApiKey"
                  value={settings.onesignalRestApiKey}
                  onChange={(e) => handleChange('onesignalRestApiKey', e.target.value)}
                  placeholder="your-rest-api-key"
                  type="password"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Types de notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Types de Notifications</span>
          </CardTitle>
          <CardDescription>
            Configuration des différents types de notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(settings.notificationTypes).map(([type, config]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications pour {type.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleNotificationTypeChange(type, 'enabled', checked)}
                />
              </div>
              
              {config.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.email}
                      onCheckedChange={(checked) => handleNotificationTypeChange(type, 'email', checked)}
                    />
                    <Label className="text-sm">Email</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.push}
                      onCheckedChange={(checked) => handleNotificationTypeChange(type, 'push', checked)}
                    />
                    <Label className="text-sm">Push</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.sms}
                      onCheckedChange={(checked) => handleNotificationTypeChange(type, 'sms', checked)}
                    />
                    <Label className="text-sm">SMS</Label>
                  </div>
                </div>
              )}
              
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Configuration email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Configuration Email</span>
          </CardTitle>
          <CardDescription>
            Paramètres pour l'envoi d'emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="emailProvider">Fournisseur email</Label>
            <Select
              value={settings.emailProvider}
              onValueChange={(value) => handleChange('emailProvider', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emailFromAddress">Adresse d'expédition</Label>
              <Input
                id="emailFromAddress"
                value={settings.emailFromAddress}
                onChange={(e) => handleChange('emailFromAddress', e.target.value)}
                placeholder="noreply@ecodeli.fr"
                type="email"
              />
            </div>
            
            <div>
              <Label htmlFor="emailFromName">Nom d'expédition</Label>
              <Input
                id="emailFromName"
                value={settings.emailFromName}
                onChange={(e) => handleChange('emailFromName', e.target.value)}
                placeholder="EcoDeli"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="emailReplyTo">Adresse de réponse</Label>
            <Input
              id="emailReplyTo"
              value={settings.emailReplyTo}
              onChange={(e) => handleChange('emailReplyTo', e.target.value)}
              placeholder="support@ecodeli.fr"
              type="email"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration SMTP */}
      {settings.emailProvider === 'smtp' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Configuration SMTP</span>
                <Badge variant="outline">SMTP</Badge>
              </CardTitle>
              <CardDescription>
                Paramètres pour l'envoi d'emails via SMTP. Configurez votre serveur SMTP personnalisé.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">Serveur SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={settings.smtpHost}
                    onChange={(e) => handleChange('smtpHost', e.target.value)}
                    placeholder="mail.celian-vf.fr"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Adresse du serveur SMTP (ex: smtp.gmail.com, mail.votre-domaine.com)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="smtpPort">Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
                    min="1"
                    max="65535"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Port SMTP (587 pour STARTTLS, 465 pour SSL, 25 pour non sécurisé)
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpUser">Utilisateur</Label>
                  <Input
                    id="smtpUser"
                    value={settings.smtpUser}
                    onChange={(e) => handleChange('smtpUser', e.target.value)}
                    placeholder="nom_utilisateur"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Nom d'utilisateur pour l'authentification SMTP
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="smtpPassword">Mot de passe</Label>
                  <Input
                    id="smtpPassword"
                    value={settings.smtpPassword}
                    onChange={(e) => handleChange('smtpPassword', e.target.value)}
                    placeholder="mot_de_passe"
                    type="password"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Mot de passe pour l'authentification SMTP
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sécurité SMTP</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer la connexion sécurisée (SSL/TLS)
                  </p>
                </div>
                <Switch
                  checked={settings.smtpSecure}
                  onCheckedChange={(checked) => handleChange('smtpSecure', checked)}
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Conseils de configuration</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Gmail:</strong> smtp.gmail.com, port 587, STARTTLS activé</li>
                  <li>• <strong>Outlook:</strong> smtp-mail.outlook.com, port 587, STARTTLS activé</li>
                  <li>• <strong>OVH:</strong> ssl0.ovh.net, port 465, SSL activé</li>
                  <li>• <strong>Serveur local:</strong> Vérifiez avec votre administrateur</li>
                </ul>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={testSMTPConfiguration}
                  disabled={isTestingSMTP}
                >
                  {isTestingSMTP ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {isTestingSMTP ? 'Test en cours...' : 'Tester la configuration SMTP'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Configuration SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Configuration SMS</span>
          </CardTitle>
          <CardDescription>
            Paramètres pour l'envoi de SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer les SMS</Label>
              <p className="text-sm text-muted-foreground">
                Activer l'envoi de notifications SMS
              </p>
            </div>
            <Switch
              checked={settings.smsEnabled}
              onCheckedChange={(checked) => handleChange('smsEnabled', checked)}
            />
          </div>
          
          {settings.smsEnabled && (
            <>
              <Separator />
              
              <div>
                <Label htmlFor="smsProvider">Fournisseur SMS</Label>
                <Select
                  value={settings.smsProvider}
                  onValueChange={(value) => handleChange('smsProvider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="messagebird">MessageBird</SelectItem>
                    <SelectItem value="nexmo">Nexmo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="smsFromNumber">Numéro d'expédition</Label>
                <Input
                  id="smsFromNumber"
                  value={settings.smsFromNumber}
                  onChange={(e) => handleChange('smsFromNumber', e.target.value)}
                  placeholder="+33123456789"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Templates de notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Templates de Notifications</span>
          </CardTitle>
          <CardDescription>
            Modèles de messages pour les notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(settings.templates).map(([template, content]) => (
            <div key={template} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="capitalize">{template.replace(/([A-Z])/g, ' $1').trim()}</Label>
                <Badge variant="outline">Template</Badge>
              </div>
              
              <div>
                <Label htmlFor={`${template}Subject`}>Sujet</Label>
                <Input
                  id={`${template}Subject`}
                  value={content.subject}
                  onChange={(e) => handleNestedChange('templates', template, {
                    ...content,
                    subject: e.target.value
                  })}
                  placeholder="Sujet du message"
                />
              </div>
              
              <div>
                <Label htmlFor={`${template}Body`}>Contenu</Label>
                <Textarea
                  id={`${template}Body`}
                  value={content.body}
                  onChange={(e) => handleNestedChange('templates', template, {
                    ...content,
                    body: e.target.value
                  })}
                  placeholder="Contenu du message"
                  rows={3}
                />
              </div>
              
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Paramètres généraux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Paramètres Généraux</span>
          </CardTitle>
          <CardDescription>
            Configuration générale des notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer les notifications</Label>
              <p className="text-sm text-muted-foreground">
                Activer le système de notifications
              </p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => handleChange('enableNotifications', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quietHoursStart">Heures silencieuses - Début</Label>
              <Input
                id="quietHoursStart"
                type="time"
                value={settings.quietHours.start}
                onChange={(e) => handleNestedChange('quietHours', 'start', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="quietHoursEnd">Heures silencieuses - Fin</Label>
              <Input
                id="quietHoursEnd"
                type="time"
                value={settings.quietHours.end}
                onChange={(e) => handleNestedChange('quietHours', 'end', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="maxNotificationsPerDay">Notifications max par jour</Label>
            <Input
              id="maxNotificationsPerDay"
              type="number"
              value={settings.maxNotificationsPerDay}
              onChange={(e) => handleChange('maxNotificationsPerDay', parseInt(e.target.value))}
              min="1"
              max="50"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications enrichies</Label>
              <p className="text-sm text-muted-foreground">
                Activer les notifications avec images et actions
              </p>
            </div>
            <Switch
              checked={settings.enableRichNotifications}
              onCheckedChange={(checked) => handleChange('enableRichNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Localisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Localisation</span>
          </CardTitle>
          <CardDescription>
            Configuration multilingue des notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultLanguage">Langue par défaut</Label>
            <Select
              value={settings.defaultLanguage}
              onValueChange={(value) => handleChange('defaultLanguage', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Langues supportées</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {settings.supportedLanguages.map((lang) => (
                <Badge key={lang} variant="secondary">
                  {lang === 'fr' ? 'Français' : lang === 'en' ? 'English' : 'Español'}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Analytics des Notifications</span>
          </CardTitle>
          <CardDescription>
            Suivi et analyse des performances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics des notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Activer le suivi des performances
                </p>
              </div>
              <Switch
                checked={settings.enableNotificationAnalytics}
                onCheckedChange={(checked) => handleChange('enableNotificationAnalytics', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Taux d'ouverture</Label>
                <p className="text-sm text-muted-foreground">
                  Suivre les taux d'ouverture des emails
                </p>
              </div>
              <Switch
                checked={settings.trackOpenRates}
                onCheckedChange={(checked) => handleChange('trackOpenRates', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Taux de clic</Label>
                <p className="text-sm text-muted-foreground">
                  Suivre les taux de clic sur les liens
                </p>
              </div>
              <Switch
                checked={settings.trackClickRates}
                onCheckedChange={(checked) => handleChange('trackClickRates', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 