'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Webhook, 
  Plus, 
  Trash2, 
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy
} from 'lucide-react'

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  enabled: boolean
  status: 'active' | 'inactive' | 'error'
  lastTriggered?: string
  secret?: string
}

export function WebhookManager() {
  const t = useTranslations('admin.systemConfig.webhooks')
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    enabled: true
  })

  const availableEvents = [
    'delivery.created',
    'delivery.updated',
    'delivery.completed',
    'payment.processed',
    'payment.failed',
    'user.registered',
    'user.verified',
    'dispute.created',
    'dispute.resolved'
  ]

  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const response = await fetch('/api/admin/system-config/webhooks')
        if (response.ok) {
          const data = await response.json()
          setWebhooks(data.webhooks || [])
        }
      } catch (error) {
        console.error('Error fetching webhooks:', error)
        // Mock data for development
        setWebhooks([
          {
            id: '1',
            name: 'Stripe Webhook',
            url: 'https://api.stripe.com/webhooks',
            events: ['payment.processed', 'payment.failed'],
            enabled: true,
            status: 'active',
            lastTriggered: '2024-07-09T10:30:00Z'
          },
          {
            id: '2',
            name: 'OneSignal Webhook',
            url: 'https://onesignal.com/webhooks',
            events: ['delivery.created', 'delivery.completed'],
            enabled: true,
            status: 'active',
            lastTriggered: '2024-07-09T09:15:00Z'
          }
        ])
      }
    }

    fetchWebhooks()
  }, [])

  const handleAddWebhook = async () => {
    try {
      const response = await fetch('/api/admin/system-config/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWebhook)
      })

      if (response.ok) {
        const data = await response.json()
        setWebhooks(prev => [...prev, data])
        setNewWebhook({ name: '', url: '', events: [], enabled: true })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding webhook:', error)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/system-config/webhooks/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setWebhooks(prev => prev.filter(webhook => webhook.id !== id))
      }
    } catch (error) {
      console.error('Error deleting webhook:', error)
    }
  }

  const handleTestWebhook = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/system-config/webhooks/${id}/test`, {
        method: 'POST'
      })

      if (response.ok) {
        // Show success message
        console.log('Webhook test successful')
      }
    } catch (error) {
      console.error('Error testing webhook:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>
      case 'error':
        return <Badge className="bg-yellow-100 text-yellow-800">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('title')}</CardTitle>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addWebhook')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Webhook Form */}
        {showAddForm && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="webhook-name">{t('name')}</Label>
                    <Input
                      id="webhook-name"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('namePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-url">{t('url')}</Label>
                    <Input
                      id="webhook-url"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://your-domain.com/webhook"
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('events')}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {availableEvents.map((event) => (
                      <label key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhook(prev => ({ ...prev, events: [...prev.events, event] }))
                            } else {
                              setNewWebhook(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }))
                            }
                          }}
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newWebhook.enabled}
                    onCheckedChange={(enabled) => setNewWebhook(prev => ({ ...prev, enabled }))}
                  />
                  <Label>{t('enabled')}</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddWebhook}>
                    {t('addWebhook')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Webhooks List */}
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(webhook.status)}
                <div>
                  <h4 className="font-medium">{webhook.name}</h4>
                  <p className="text-sm text-muted-foreground">{webhook.url}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusBadge(webhook.status)}
                {webhook.enabled ? (
                  <Badge variant="outline" className="text-xs">Enabled</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Disabled</Badge>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestWebhook(webhook.id)}
                >
                  <TestTube className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteWebhook(webhook.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {webhooks.length === 0 && (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('noWebhooks')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 