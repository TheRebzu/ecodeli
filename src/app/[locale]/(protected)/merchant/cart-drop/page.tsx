<<<<<<< Updated upstream
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CartDropOverview } from '@/features/merchant/components/cart-drop/CartDropOverview'
import { PageHeader } from '@/components/layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function MerchantCartDropPage() {
  const t = await getTranslations('merchant.cartDrop')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <CartDropOverview />
      </Suspense>
=======
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
import { 
  ShoppingCartIcon, 
  PlusIcon, 
  TrashIcon, 
  MapPinIcon,
  ClockIcon,
  EuroIcon,
  InfoIcon
} from 'lucide-react'
import { z } from 'zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Lundi' },
  { value: 'TUESDAY', label: 'Mardi' },
  { value: 'WEDNESDAY', label: 'Mercredi' },
  { value: 'THURSDAY', label: 'Jeudi' },
  { value: 'FRIDAY', label: 'Vendredi' },
  { value: 'SATURDAY', label: 'Samedi' },
  { value: 'SUNDAY', label: 'Dimanche' }
]

const configSchema = z.object({
  isActive: z.boolean(),
  maxOrdersPerSlot: z.number().min(1, 'Au moins 1 commande par créneau'),
  deliveryZones: z.array(z.object({
    postalCode: z.string().length(5, 'Code postal invalide'),
    deliveryFee: z.number().min(0, 'Frais de livraison invalides'),
    estimatedTime: z.number().min(15, 'Temps minimum 15 minutes'),
    isActive: z.boolean()
  })),
  timeSlots: z.array(z.object({
    day: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format heure invalide'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format heure invalide'),
    isActive: z.boolean(),
    maxOrders: z.number().min(1, 'Au moins 1 commande par créneau')
  }))
})

type ConfigFormData = z.infer<typeof configSchema>

export default function CartDropConfigPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      isActive: false,
      maxOrdersPerSlot: 10,
      deliveryZones: [],
      timeSlots: []
    }
  })

  const { fields: zoneFields, append: appendZone, remove: removeZone } = useFieldArray({
    control: form.control,
    name: 'deliveryZones'
  })

  const { fields: slotFields, append: appendSlot, remove: removeSlot } = useFieldArray({
    control: form.control,
    name: 'timeSlots'
  })

  useEffect(() => {
    fetchConfiguration()
    fetchStats()
  }, [])

  const fetchConfiguration = async () => {
    try {
      const response = await fetch('/api/merchant/cart-drop/config')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      
      const config = await response.json()
      if (config) {
        form.reset(config)
      } else {
        // Configuration par défaut
        form.reset({
          isActive: false,
          maxOrdersPerSlot: 10,
          deliveryZones: [],
          timeSlots: getDefaultTimeSlots()
        })
      }
    } catch (error) {
      console.error('Erreur chargement configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/merchant/cart-drop/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
  }

  const getDefaultTimeSlots = () => [
    { day: 'MONDAY', startTime: '09:00', endTime: '18:00', isActive: true, maxOrders: 10 },
    { day: 'TUESDAY', startTime: '09:00', endTime: '18:00', isActive: true, maxOrders: 10 },
    { day: 'WEDNESDAY', startTime: '09:00', endTime: '18:00', isActive: true, maxOrders: 10 },
    { day: 'THURSDAY', startTime: '09:00', endTime: '18:00', isActive: true, maxOrders: 10 },
    { day: 'FRIDAY', startTime: '09:00', endTime: '18:00', isActive: true, maxOrders: 10 },
    { day: 'SATURDAY', startTime: '10:00', endTime: '17:00', isActive: true, maxOrders: 8 }
  ]

  const onSubmit = async (data: ConfigFormData) => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/merchant/cart-drop/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')
      
      alert('Configuration sauvegardée avec succès!')
      fetchStats() // Recharger les stats
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const addZone = () => {
    appendZone({
      postalCode: '',
      deliveryFee: 5.00,
      estimatedTime: 60,
      isActive: true
    })
  }

  const addTimeSlot = () => {
    appendSlot({
      day: 'MONDAY',
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
      maxOrders: 10
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShoppingCartIcon className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Lâcher de chariot</h1>
            <p className="text-muted-foreground">Chargement de la configuration...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCartIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Lâcher de chariot</h1>
          <p className="text-muted-foreground">
            Service phare EcoDeli - Livraison à domicile depuis votre magasin
          </p>
        </div>
      </div>

      {/* Info service */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Le service "lâcher de chariot" permet à vos clients de faire leurs achats en magasin 
          et de demander une livraison à domicile directement en caisse.
        </AlertDescription>
      </Alert>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalOrders}
              </div>
              <div className="text-sm text-muted-foreground">Commandes total</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.activeOrders}
              </div>
              <div className="text-sm text-muted-foreground">En cours</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                €{stats.totalRevenue?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-muted-foreground">Chiffre d'affaires</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                €{stats.averageOrderValue?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-muted-foreground">Panier moyen</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Configuration générale</TabsTrigger>
            <TabsTrigger value="zones">Zones de livraison</TabsTrigger>
            <TabsTrigger value="slots">Créneaux horaires</TabsTrigger>
          </TabsList>

          {/* Configuration générale */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCartIcon className="h-5 w-5" />
                  Configuration générale
                </CardTitle>
                <CardDescription>
                  Paramètres principaux du service lâcher de chariot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Activer le service</Label>
                    <div className="text-sm text-muted-foreground">
                      Permettre aux clients de demander une livraison en caisse
                    </div>
                  </div>
                  <Switch
                    checked={form.watch('isActive')}
                    onCheckedChange={(checked) => form.setValue('isActive', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="maxOrdersPerSlot">
                    Nombre maximum de commandes par créneau
                  </Label>
                  <Input
                    id="maxOrdersPerSlot"
                    type="number"
                    min="1"
                    {...form.register('maxOrdersPerSlot', { valueAsNumber: true })}
                  />
                  <div className="text-sm text-muted-foreground">
                    Limite le nombre de commandes acceptées simultanément
                  </div>
                  {form.formState.errors.maxOrdersPerSlot && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.maxOrdersPerSlot.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zones de livraison */}
          <TabsContent value="zones">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPinIcon className="h-5 w-5" />
                      Zones de livraison
                    </CardTitle>
                    <CardDescription>
                      Configurez les codes postaux et frais de livraison
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addZone} size="sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Ajouter une zone
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {zoneFields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Code postal</Label>
                          <Input
                            placeholder="75001"
                            maxLength={5}
                            {...form.register(`deliveryZones.${index}.postalCode`)}
                          />
                          {form.formState.errors.deliveryZones?.[index]?.postalCode && (
                            <p className="text-sm text-red-500">
                              {form.formState.errors.deliveryZones[index]?.postalCode?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Frais de livraison (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...form.register(`deliveryZones.${index}.deliveryFee`, { 
                              valueAsNumber: true 
                            })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Temps estimé (min)</Label>
                          <Input
                            type="number"
                            min="15"
                            {...form.register(`deliveryZones.${index}.estimatedTime`, { 
                              valueAsNumber: true 
                            })}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={form.watch(`deliveryZones.${index}.isActive`)}
                              onCheckedChange={(checked) => 
                                form.setValue(`deliveryZones.${index}.isActive`, checked)
                              }
                            />
                            <Label className="text-sm">Active</Label>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeZone(index)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {zoneFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune zone de livraison configurée.
                      <br />
                      Cliquez sur "Ajouter une zone" pour commencer.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Créneaux horaires */}
          <TabsContent value="slots">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClockIcon className="h-5 w-5" />
                      Créneaux horaires
                    </CardTitle>
                    <CardDescription>
                      Définissez vos heures d'ouverture pour la livraison
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addTimeSlot} size="sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Ajouter un créneau
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {slotFields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Jour</Label>
                          <Select
                            value={form.watch(`timeSlots.${index}.day`)}
                            onValueChange={(value) => 
                              form.setValue(`timeSlots.${index}.day`, value as any)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map(day => (
                                <SelectItem key={day.value} value={day.value}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Heure début</Label>
                          <Input
                            type="time"
                            {...form.register(`timeSlots.${index}.startTime`)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Heure fin</Label>
                          <Input
                            type="time"
                            {...form.register(`timeSlots.${index}.endTime`)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Max commandes</Label>
                          <Input
                            type="number"
                            min="1"
                            {...form.register(`timeSlots.${index}.maxOrders`, { 
                              valueAsNumber: true 
                            })}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={form.watch(`timeSlots.${index}.isActive`)}
                              onCheckedChange={(checked) => 
                                form.setValue(`timeSlots.${index}.isActive`, checked)
                              }
                            />
                            <Label className="text-sm">Actif</Label>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSlot(index)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {slotFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun créneau configuré.
                      <br />
                      Cliquez sur "Ajouter un créneau" pour commencer.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </Button>
        </div>
      </form>
>>>>>>> Stashed changes
    </div>
  )
} 