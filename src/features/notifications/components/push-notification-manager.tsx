'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Settings, 
  Check, 
  X, 
  AlertCircle,
  Shield,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface NotificationSettings {
  enabled: boolean
  deliveryUpdates: boolean
  newOpportunities: boolean
  paymentNotifications: boolean
  systemAlerts: boolean
  marketing: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
}

interface PushSubscription {
  endpoint: string
  expirationTime?: number
  keys: {
    p256dh: string
    auth: string
  }
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    deliveryUpdates: true,
    newOpportunities: true,
    paymentNotifications: true,
    systemAlerts: true,
    marketing: false,
    soundEnabled: true,
    vibrationEnabled: true
  })

  const { toast } = useToast()

  useEffect(() => {
    checkSupport()
    loadSettings()
  }, [])

  const checkSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      checkSubscription()
    } else {
      setIsSupported(false)
    }
  }

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/user/notification-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({ ...settings, ...data.settings })
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
    }
  }

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings })
      })

      if (response.ok) {
        setSettings(newSettings)
        toast({
          title: 'Paramètres sauvegardés',
          description: 'Vos préférences de notification ont été mises à jour'
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive'
      })
    }
  }

  const subscribeToPush = async () => {
    if (!isSupported) return

    try {
      setIsLoading(true)

      // Demander la permission
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission !== 'granted') {
        toast({
          title: 'Permission refusée',
          description: 'Les notifications push ne peuvent pas être activées sans votre autorisation',
          variant: 'destructive'
        })
        return
      }

      // Obtenir le service worker
      const registration = await navigator.serviceWorker.ready

      // S'abonner aux notifications push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })

      // Envoyer l'abonnement au serveur
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          settings
        })
      })

      if (response.ok) {
        setIsSubscribed(true)
        toast({
          title: 'Notifications activées',
          description: 'Vous recevrez maintenant des notifications push'
        })
      } else {
        throw new Error('Failed to register subscription')
      }

    } catch (error) {
      console.error('Error subscribing to push:', error)
      toast({
        title: 'Erreur d\'activation',
        description: 'Impossible d\'activer les notifications push',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    try {
      setIsLoading(true)

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        
        // Notifier le serveur
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        })
      }

      setIsSubscribed(false)
      toast({
        title: 'Notifications désactivées',
        description: 'Vous ne recevrez plus de notifications push'
      })

    } catch (error) {
      console.error('Error unsubscribing from push:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de désactiver les notifications',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testNotification = async () => {
    if (!isSubscribed) return

    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        toast({
          title: 'Notification de test envoyée',
          description: 'Vous devriez recevoir une notification dans quelques secondes'
        })
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la notification de test',
        variant: 'destructive'
      })
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    saveSettings(newSettings)
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notifications Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Votre navigateur ne supporte pas les notifications push.
              Veuillez utiliser un navigateur moderne pour cette fonctionnalité.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statut principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            Notifications Push
          </CardTitle>
          <CardDescription>
            Recevez des notifications en temps réel sur votre appareil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">État des notifications</div>
              <div className="text-sm text-gray-600">
                {permission === 'granted' && isSubscribed && 'Activées et fonctionnelles'}
                {permission === 'granted' && !isSubscribed && 'Permission accordée, non configurées'}
                {permission === 'denied' && 'Permission refusée par l\'utilisateur'}
                {permission === 'default' && 'En attente de permission'}
              </div>
            </div>
            
            <Badge 
              variant={isSubscribed ? 'default' : 'secondary'}
              className={isSubscribed ? 'bg-green-600' : ''}
            >
              {isSubscribed ? 'Actives' : 'Inactives'}
            </Badge>
          </div>

          {permission === 'denied' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Les notifications ont été bloquées. Pour les réactiver, cliquez sur l'icône 
                de cadenas dans la barre d'adresse et autorisez les notifications.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!isSubscribed ? (
              <Button 
                onClick={subscribeToPush}
                disabled={isLoading || permission === 'denied'}
                className="flex-1"
              >
                {isLoading ? 'Activation...' : 'Activer les notifications'}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={unsubscribeFromPush}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? 'Désactivation...' : 'Désactiver'}
                </Button>
                <Button 
                  onClick={testNotification}
                  variant="outline"
                >
                  Tester
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paramètres détaillés */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Préférences de notification
            </CardTitle>
            <CardDescription>
              Choisissez quand recevoir des notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notifications par catégorie */}
            <div className="space-y-4">
              <h4 className="font-medium">Types de notifications</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Mises à jour de livraison</div>
                    <div className="text-sm text-gray-600">
                      Statut, livraison, problèmes
                    </div>
                  </div>
                  <Switch
                    checked={settings.deliveryUpdates}
                    onCheckedChange={(checked) => updateSetting('deliveryUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Nouvelles opportunités</div>
                    <div className="text-sm text-gray-600">
                      Livraisons et services disponibles
                    </div>
                  </div>
                  <Switch
                    checked={settings.newOpportunities}
                    onCheckedChange={(checked) => updateSetting('newOpportunities', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Paiements et gains</div>
                    <div className="text-sm text-gray-600">
                      Virements, factures, portefeuille
                    </div>
                  </div>
                  <Switch
                    checked={settings.paymentNotifications}
                    onCheckedChange={(checked) => updateSetting('paymentNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Alertes système</div>
                    <div className="text-sm text-gray-600">
                      Maintenance, mises à jour importantes
                    </div>
                  </div>
                  <Switch
                    checked={settings.systemAlerts}
                    onCheckedChange={(checked) => updateSetting('systemAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Promotions et conseils</div>
                    <div className="text-sm text-gray-600">
                      Offres spéciales, nouveautés
                    </div>
                  </div>
                  <Switch
                    checked={settings.marketing}
                    onCheckedChange={(checked) => updateSetting('marketing', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Paramètres audio/vibration */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Paramètres audio</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {settings.soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-blue-600" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    )}
                    <div className="space-y-1">
                      <div className="font-medium">Son</div>
                      <div className="text-sm text-gray-600">
                        Jouer un son avec les notifications
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <div className="space-y-1">
                      <div className="font-medium">Vibration</div>
                      <div className="text-sm text-gray-600">
                        Vibrer sur mobile
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={settings.vibrationEnabled}
                    onCheckedChange={(checked) => updateSetting('vibrationEnabled', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations techniques */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations techniques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Statut du navigateur:</span>
              <span className="font-medium">
                {permission === 'granted' ? 'Autorisé' : permission === 'denied' ? 'Refusé' : 'En attente'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Worker:</span>
              <span className="font-medium">
                {'serviceWorker' in navigator ? 'Disponible' : 'Non supporté'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Push Manager:</span>
              <span className="font-medium">
                {'PushManager' in window ? 'Disponible' : 'Non supporté'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}