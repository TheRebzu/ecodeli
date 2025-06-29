"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Bell, 
  BellOff, 
  Check, 
  Trash2, 
  Settings, 
  Package, 
  CreditCard,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Eye,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/use-auth'

interface Notification {
  id: string
  type: 'delivery' | 'payment' | 'message' | 'system' | 'announcement'
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isRead: boolean
  createdAt: string
  expiresAt?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: {
    deliveryId?: string
    announcementId?: string
    paymentId?: string
    amount?: number
  }
}

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
  soundEnabled: boolean
  quiet: {
    enabled: boolean
    startTime: string
    endTime: string
  }
  categories: {
    delivery: boolean
    payment: boolean
    message: boolean
    system: boolean
    announcement: boolean
  }
  frequency: 'instant' | 'hourly' | 'daily'
}

interface ClientNotificationCenterProps {
  clientId: string;
}

export default function ClientNotificationCenter({ clientId }: ClientNotificationCenterProps) {
  const { user } = useAuth()
  const t = useTranslations('notifications')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    soundEnabled: true,
    quiet: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    },
    categories: {
      delivery: true,
      payment: true,
      message: true,
      system: true,
      announcement: true
    },
    frequency: 'instant'
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [newNotificationCount, setNewNotificationCount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      fetchSettings()
      setupWebSocket()
    }
  }, [user])

  useEffect(() => {
    // Audio pour les notifications
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3')
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/client/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setNewNotificationCount(data.notifications?.filter((n: Notification) => !n.isRead).length || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/client/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const setupWebSocket = () => {
    // Configuration WebSocket pour les notifications en temps réel
    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/notifications`)
      
      ws.onmessage = (event) => {
        const notification = JSON.parse(event.data)
        handleNewNotification(notification)
      }

      return () => ws.close()
    }
  }

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
    setNewNotificationCount(prev => prev + 1)
    
    // Jouer le son si activé
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Gérer l'erreur silencieusement (autoplay policy)
      })
    }

    // Notification push du navigateur
    if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/ecodeli-192.png'
      })
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/client/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setNewNotificationCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/client/notifications/mark-all-read', {
        method: 'POST'
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setNewNotificationCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/client/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      await fetch('/api/client/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
      
      setSettings(updatedSettings)
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        updateSettings({ pushNotifications: true })
      }
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <Package className="h-4 w-4" />
      case 'payment': return <CreditCard className="h-4 w-4" />
      case 'message': return <MessageSquare className="h-4 w-4" />
      case 'system': return <Settings className="h-4 w-4" />
      case 'announcement': return <Bell className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false
    if (filter === 'read' && !notification.isRead) return false
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} min`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} h`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t('title')}
            {newNotificationCount > 0 && (
              <Badge className="bg-red-500">
                {newNotificationCount}
              </Badge>
            )}
          </h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('markAllRead')}
          </Button>
          <Button onClick={requestNotificationPermission} variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            {t('enablePush')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('filters.title')}</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('filters.all')}</SelectItem>
                      <SelectItem value="unread">{t('filters.unread')}</SelectItem>
                      <SelectItem value="read">{t('filters.read')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
                      <SelectItem value="delivery">{t('types.delivery')}</SelectItem>
                      <SelectItem value="payment">{t('types.payment')}</SelectItem>
                      <SelectItem value="message">{t('types.message')}</SelectItem>
                      <SelectItem value="system">{t('types.system')}</SelectItem>
                      <SelectItem value="announcement">{t('types.announcement')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-muted-foreground mt-2">{t('loading')}</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('empty.title')}
                    </h3>
                    <p className="text-gray-600">
                      {t('empty.description')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id}
                    className={`hover:shadow-md transition-shadow ${
                      !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {t(`types.${notification.type}`)}
                              </Badge>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(notification.createdAt)}
                              </span>
                              
                              {notification.metadata?.amount && (
                                <span>
                                  {notification.metadata.amount}€
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          {notification.actionUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(notification.actionUrl)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {notification.actionLabel || t('view')}
                            </Button>
                          )}
                          
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notifications')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">{t('settings.email')}</Label>
                  <p className="text-sm text-gray-600">{t('settings.emailDesc')}</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">{t('settings.push')}</Label>
                  <p className="text-sm text-gray-600">{t('settings.pushDesc')}</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => updateSettings({ pushNotifications: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">{t('settings.sms')}</Label>
                  <p className="text-sm text-gray-600">{t('settings.smsDesc')}</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => updateSettings({ smsNotifications: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">{t('settings.sound')}</Label>
                  <p className="text-sm text-gray-600">{t('settings.soundDesc')}</p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.categories')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.categories).map(([category, enabled]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getNotificationIcon(category)}
                    <Label className="text-base font-medium">
                      {t(`types.${category}`)}
                    </Label>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        categories: { ...settings.categories, [category]: checked }
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.quietHours')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t('settings.enableQuiet')}</Label>
                <Switch
                  checked={settings.quiet.enabled}
                  onCheckedChange={(checked) => 
                    updateSettings({ quiet: { ...settings.quiet, enabled: checked } })
                  }
                />
              </div>
              
              {settings.quiet.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('settings.quietStart')}</Label>
                    <Input
                      type="time"
                      value={settings.quiet.startTime}
                      onChange={(e) => 
                        updateSettings({ 
                          quiet: { ...settings.quiet, startTime: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t('settings.quietEnd')}</Label>
                    <Input
                      type="time"
                      value={settings.quiet.endTime}
                      onChange={(e) => 
                        updateSettings({ 
                          quiet: { ...settings.quiet, endTime: e.target.value }
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}