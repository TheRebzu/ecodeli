'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Switch } from '@/components/ui/switch'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  BellIcon, 
  MailIcon,
  MessageSquareIcon,
  SmartphoneIcon,
  CheckIcon,
  XIcon,
  ArchiveIcon,
  TrashIcon,
  SettingsIcon,
  FilterIcon,
  SearchIcon,
  AlertCircleIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'ORDER' | 'DELIVERY' | 'PAYMENT' | 'PROMOTION' | 'SYSTEM' | 'REVIEW'
  title: string
  message: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  isRead: boolean
  isArchived: boolean
  createdAt: Date
  data?: any
  
  // Métadonnées
  channel: 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP'
  actionRequired: boolean
  expiresAt?: Date
}

interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  
  // Par type de notification
  orderNotifications: boolean
  deliveryNotifications: boolean
  paymentNotifications: boolean
  promotionNotifications: boolean
  systemNotifications: boolean
  reviewNotifications: boolean
  
  // Fréquence
  emailFrequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'
  pushFrequency: 'IMMEDIATE' | 'BATCH'
  
  // Horaires
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  
  // Seuils
  orderThreshold: number
  paymentThreshold: number
}

export default function MerchantNotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderNotifications: true,
    deliveryNotifications: true,
    paymentNotifications: true,
    promotionNotifications: false,
    systemNotifications: true,
    reviewNotifications: true,
    emailFrequency: 'IMMEDIATE',
    pushFrequency: 'IMMEDIATE',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    orderThreshold: 0,
    paymentThreshold: 100
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTab, setSelectedTab] = useState('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)

  useEffect(() => {
    loadNotifications()
    loadSettings()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/merchant/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/merchant/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({ ...settings, ...data })
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/merchant/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ))
      }
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/merchant/notifications/mark-all-read', {
        method: 'PUT'
      })
      
      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })))
      }
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error)
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/merchant/notifications/${notificationId}/archive`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, isArchived: true } : n
        ))
      }
    } catch (error) {
      console.error('Erreur lors de l\'archivage:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) return
    
    try {
      const response = await fetch(`/api/merchant/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/merchant/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        console.log('Paramètres sauvegardés avec succès')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error)
    } finally {
      setSaving(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <CheckCircleIcon className="w-4 h-4 text-blue-600" />
      case 'DELIVERY':
        return <ClockIcon className="w-4 h-4 text-orange-600" />
      case 'PAYMENT':
        return <CheckIcon className="w-4 h-4 text-green-600" />
      case 'PROMOTION':
        return <InfoIcon className="w-4 h-4 text-purple-600" />
      case 'SYSTEM':
        return <SettingsIcon className="w-4 h-4 text-gray-600" />
      case 'REVIEW':
        return <MessageSquareIcon className="w-4 h-4 text-yellow-600" />
      default:
        return <BellIcon className="w-4 h-4 text-gray-600" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800">Élevée</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800">Moyenne</Badge>
      case 'LOW':
        return <Badge className="bg-gray-100 text-gray-800">Faible</Badge>
      default:
        return <Badge>Normale</Badge>
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    // Filtrer par onglet
    if (selectedTab === 'inbox' && notification.isArchived) return false
    if (selectedTab === 'archived' && !notification.isArchived) return false
    if (selectedTab === 'unread' && notification.isRead) return false
    
    // Filtrer par recherche
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Filtrer par type
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false
    
    // Filtrer par priorité
    if (priorityFilter !== 'all' && notification.priority !== priorityFilter) return false
    
    // Filtrer par non lues uniquement
    if (showOnlyUnread && notification.isRead) return false
    
    return true
  })

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-gray-600">Gérez vos notifications et paramètres d'alertes</p>
        </div>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
          <Button onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
            <CheckIcon className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <BellIcon className="w-4 h-4" />
            Boîte de réception ({notifications.filter(n => !n.isArchived).length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <EyeOffIcon className="w-4 h-4" />
            Non lues ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <ArchiveIcon className="w-4 h-4" />
            Archivées ({notifications.filter(n => n.isArchived).length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        {/* Boîte de réception et listes */}
        <TabsContent value={selectedTab} className={selectedTab === 'settings' ? 'hidden' : ''}>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BellIcon className="w-5 h-5" />
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Consultez et gérez vos notifications
                  </CardDescription>
                </div>
                
                {/* Filtres */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="ORDER">Commandes</SelectItem>
                      <SelectItem value="DELIVERY">Livraisons</SelectItem>
                      <SelectItem value="PAYMENT">Paiements</SelectItem>
                      <SelectItem value="PROMOTION">Promotions</SelectItem>
                      <SelectItem value="SYSTEM">Système</SelectItem>
                      <SelectItem value="REVIEW">Avis</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="HIGH">Élevée</SelectItem>
                      <SelectItem value="MEDIUM">Moyenne</SelectItem>
                      <SelectItem value="LOW">Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <BellIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune notification
                  </h3>
                  <p className="text-gray-600">
                    {selectedTab === 'unread' 
                      ? 'Toutes vos notifications ont été lues'
                      : 'Aucune notification ne correspond à vos filtres'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-medium ${!notification.isRead ? 'text-blue-900' : 'text-gray-900'}`}>
                                {notification.title}
                              </h4>
                              {getPriorityBadge(notification.priority)}
                              {!notification.isRead && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">Nouveau</Badge>
                              )}
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{format(notification.createdAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
                              <span>•</span>
                              <span>{notification.type}</span>
                              {notification.channel && (
                                <>
                                  <span>•</span>
                                  <span>{notification.channel}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {!notification.isArchived && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchive(notification.id)}
                            >
                              <ArchiveIcon className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Préférences de Notifications
                </CardTitle>
                <CardDescription>
                  Configurez comment vous souhaitez recevoir vos notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Canaux de notification */}
                <div>
                  <h3 className="font-medium mb-4">Canaux de Notification</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MailIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <Label>Email</Label>
                          <p className="text-sm text-gray-600">Recevez les notifications par email</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SmartphoneIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <Label>SMS</Label>
                          <p className="text-sm text-gray-600">Recevez les notifications par SMS</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.smsNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BellIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <Label>Notifications Push</Label>
                          <p className="text-sm text-gray-600">Recevez les notifications push sur vos appareils</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.pushNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Types de notifications */}
                <div>
                  <h3 className="font-medium mb-4">Types de Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Nouvelles commandes</Label>
                        <p className="text-sm text-gray-600">Quand vous recevez une nouvelle commande</p>
                      </div>
                      <Switch
                        checked={settings.orderNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, orderNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mises à jour de livraison</Label>
                        <p className="text-sm text-gray-600">Statut des livraisons en cours</p>
                      </div>
                      <Switch
                        checked={settings.deliveryNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, deliveryNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Paiements</Label>
                        <p className="text-sm text-gray-600">Confirmations de paiement et retraits</p>
                      </div>
                      <Switch
                        checked={settings.paymentNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, paymentNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Promotions</Label>
                        <p className="text-sm text-gray-600">Performances de vos promotions</p>
                      </div>
                      <Switch
                        checked={settings.promotionNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, promotionNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Avis clients</Label>
                        <p className="text-sm text-gray-600">Nouveaux avis et évaluations</p>
                      </div>
                      <Switch
                        checked={settings.reviewNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, reviewNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications système</Label>
                        <p className="text-sm text-gray-600">Mises à jour importantes et maintenance</p>
                      </div>
                      <Switch
                        checked={settings.systemNotifications}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, systemNotifications: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Paramètres avancés */}
                <div>
                  <h3 className="font-medium mb-4">Paramètres Avancés</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emailFrequency">Fréquence Email</Label>
                        <Select 
                          value={settings.emailFrequency} 
                          onValueChange={(value) => setSettings(prev => ({ ...prev, emailFrequency: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IMMEDIATE">Immédiat</SelectItem>
                            <SelectItem value="DAILY">Résumé quotidien</SelectItem>
                            <SelectItem value="WEEKLY">Résumé hebdomadaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="pushFrequency">Fréquence Push</Label>
                        <Select 
                          value={settings.pushFrequency} 
                          onValueChange={(value) => setSettings(prev => ({ ...prev, pushFrequency: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IMMEDIATE">Immédiat</SelectItem>
                            <SelectItem value="BATCH">Par lot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label>Heures de silence</Label>
                          <p className="text-sm text-gray-600">Ne pas envoyer de notifications pendant ces heures</p>
                        </div>
                        <Switch
                          checked={settings.quietHours.enabled}
                          onCheckedChange={(checked) => setSettings(prev => ({ 
                            ...prev, 
                            quietHours: { ...prev.quietHours, enabled: checked }
                          }))}
                        />
                      </div>

                      {settings.quietHours.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="quietStart">Début</Label>
                            <Input
                              id="quietStart"
                              type="time"
                              value={settings.quietHours.start}
                              onChange={(e) => setSettings(prev => ({ 
                                ...prev, 
                                quietHours: { ...prev.quietHours, start: e.target.value }
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="quietEnd">Fin</Label>
                            <Input
                              id="quietEnd"
                              type="time"
                              value={settings.quietHours.end}
                              onChange={(e) => setSettings(prev => ({ 
                                ...prev, 
                                quietHours: { ...prev.quietHours, end: e.target.value }
                              }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSettings} disabled={saving}>
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 