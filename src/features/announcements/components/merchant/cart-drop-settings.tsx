"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const cartDropConfigSchema = z.object({
  enabled: z.boolean().default(true),
  storeAddress: z.string().min(5, "L'adresse du magasin est requise"),
  maxDistance: z.number().min(1, "Distance minimum: 1km").max(50, "Distance maximum: 50km"),
  maxOrders: z.number().min(1, "Minimum 1 commande").max(100, "Maximum 100 commandes"),
  deliveryFee: z.number().min(0, "Les frais de livraison doivent être positifs"),
  freeDeliveryThreshold: z.number().min(0, "Le seuil doit être positif").optional(),
  operatingHours: z.object({
    monday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    tuesday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    wednesday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    thursday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    friday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    saturday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    }),
    sunday: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string()
    })
  }),
  deliverySlots: z.array(z.object({
    id: z.string(),
    name: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    maxOrders: z.number(),
    enabled: z.boolean()
  })),
  specialInstructions: z.string().optional(),
  restrictedProducts: z.array(z.string()).optional(),
  requiresSignature: z.boolean().default(false),
  allowWeekendDelivery: z.boolean().default(true),
  emergencyContact: z.string().min(10, "Numéro de téléphone requis")
})

type CartDropConfigData = z.infer<typeof cartDropConfigSchema>

interface CartDropSettingsProps {
  merchantId?: string
  onConfigUpdate?: (config: CartDropConfigData) => void
}

export function CartDropSettings({ merchantId, onConfigUpdate }: CartDropSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useForm<CartDropConfigData>({
    resolver: zodResolver(cartDropConfigSchema),
    defaultValues: {
      enabled: true,
      maxDistance: 10,
      maxOrders: 20,
      deliveryFee: 3.50,
      freeDeliveryThreshold: 30,
      operatingHours: {
        monday: { enabled: true, start: '09:00', end: '18:00' },
        tuesday: { enabled: true, start: '09:00', end: '18:00' },
        wednesday: { enabled: true, start: '09:00', end: '18:00' },
        thursday: { enabled: true, start: '09:00', end: '18:00' },
        friday: { enabled: true, start: '09:00', end: '18:00' },
        saturday: { enabled: true, start: '09:00', end: '17:00' },
        sunday: { enabled: false, start: '10:00', end: '16:00' }
      },
      deliverySlots: [
        { id: '1', name: 'Matin', startTime: '09:00', endTime: '12:00', maxOrders: 10, enabled: true },
        { id: '2', name: 'Après-midi', startTime: '14:00', endTime: '17:00', maxOrders: 10, enabled: true },
        { id: '3', name: 'Soir', startTime: '17:00', endTime: '20:00', maxOrders: 5, enabled: false }
      ],
      requiresSignature: false,
      allowWeekendDelivery: true
    }
  })

  const isEnabled = watch('enabled')
  const deliverySlots = watch('deliverySlots')

  useEffect(() => {
    loadConfiguration()
  }, [merchantId])

  const loadConfiguration = async () => {
    if (!merchantId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/merchant/cart-drop/settings`)
      if (response.ok) {
        const config = await response.json()
        // Set form values with loaded config
        Object.entries(config).forEach(([key, value]) => {
          setValue(key as keyof CartDropConfigData, value as any)
        })
      }
    } catch (err) {
      console.error('Error loading configuration:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: CartDropConfigData) => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/merchant/cart-drop/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde')
      }

      setSuccess(true)
      if (onConfigUpdate) {
        onConfigUpdate(data)
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const addDeliverySlot = () => {
    const newSlot = {
      id: Date.now().toString(),
      name: 'Nouveau créneau',
      startTime: '09:00',
      endTime: '12:00',
      maxOrders: 5,
      enabled: true
    }
    setValue('deliverySlots', [...deliverySlots, newSlot])
  }

  const removeDeliverySlot = (slotId: string) => {
    setValue('deliverySlots', deliverySlots.filter(slot => slot.id !== slotId))
  }

  const daysOfWeek = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ]

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Configuration Lâcher de Chariot
        </h2>
        <p className="text-gray-600">
          Configurez votre service de livraison depuis votre magasin.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-600">✅ Configuration sauvegardée avec succès !</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Activation */}
        <div className="flex items-center">
          <input
            {...register("enabled")}
            type="checkbox"
            id="enabled"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="ml-2 text-sm font-medium text-gray-700">
            Activer le service de lâcher de chariot
          </label>
        </div>

        {isEnabled && (
          <>
            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse du magasin *
                </label>
                <textarea
                  {...register("storeAddress")}
                  id="storeAddress"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Adresse complète du magasin"
                />
                {errors.storeAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.storeAddress.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact d'urgence *
                </label>
                <input
                  {...register("emergencyContact")}
                  type="tel"
                  id="emergencyContact"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Numéro de téléphone"
                />
                {errors.emergencyContact && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergencyContact.message}</p>
                )}
              </div>
            </div>

            {/* Limites de service */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="maxDistance" className="block text-sm font-medium text-gray-700 mb-1">
                  Distance max (km) *
                </label>
                <input
                  {...register("maxDistance", { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="50"
                  id="maxDistance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.maxDistance && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxDistance.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="maxOrders" className="block text-sm font-medium text-gray-700 mb-1">
                  Commandes max/jour *
                </label>
                <input
                  {...register("maxOrders", { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="100"
                  id="maxOrders"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.maxOrders && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxOrders.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 mb-1">
                  Frais de livraison (€) *
                </label>
                <input
                  {...register("deliveryFee", { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0"
                  id="deliveryFee"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.deliveryFee && (
                  <p className="mt-1 text-sm text-red-600">{errors.deliveryFee.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="freeDeliveryThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                Seuil livraison gratuite (€)
              </label>
              <input
                {...register("freeDeliveryThreshold", { valueAsNumber: true })}
                type="number"
                step="0.1"
                min="0"
                id="freeDeliveryThreshold"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Montant minimum pour livraison gratuite"
              />
              {errors.freeDeliveryThreshold && (
                <p className="mt-1 text-sm text-red-600">{errors.freeDeliveryThreshold.message}</p>
              )}
            </div>

            {/* Horaires d'ouverture */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Horaires d'ouverture</h3>
              <div className="space-y-3">
                {daysOfWeek.map((day) => (
                  <div key={day.key} className="flex items-center space-x-4">
                    <div className="w-20">
                      <input
                        {...register(`operatingHours.${day.key as keyof typeof getValues().operatingHours}.enabled`)}
                        type="checkbox"
                        id={`${day.key}-enabled`}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`${day.key}-enabled`} className="ml-2 text-sm text-gray-700">
                        {day.label}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        {...register(`operatingHours.${day.key as keyof typeof getValues().operatingHours}.start`)}
                        type="time"
                        className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="text-gray-500">à</span>
                      <input
                        {...register(`operatingHours.${day.key as keyof typeof getValues().operatingHours}.end`)}
                        type="time"
                        className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Créneaux de livraison */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Créneaux de livraison</h3>
                <button
                  type="button"
                  onClick={addDeliverySlot}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  + Ajouter un créneau
                </button>
              </div>
              
              <div className="space-y-4">
                {deliverySlots.map((slot, index) => (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom du créneau
                        </label>
                        <input
                          {...register(`deliverySlots.${index}.name`)}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Début
                        </label>
                        <input
                          {...register(`deliverySlots.${index}.startTime`)}
                          type="time"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fin
                        </label>
                        <input
                          {...register(`deliverySlots.${index}.endTime`)}
                          type="time"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max commandes
                        </label>
                        <input
                          {...register(`deliverySlots.${index}.maxOrders`, { valueAsNumber: true })}
                          type="number"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          {...register(`deliverySlots.${index}.enabled`)}
                          type="checkbox"
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Actif</span>
                        <button
                          type="button"
                          onClick={() => removeDeliverySlot(slot.id)}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Options avancées */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Options avancées</h3>
              
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    {...register("requiresSignature")}
                    type="checkbox"
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Signature requise</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    {...register("allowWeekendDelivery")}
                    type="checkbox"
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Livraison weekend</span>
                </label>
              </div>
            </div>

            {/* Instructions spéciales */}
            <div>
              <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                Instructions spéciales
              </label>
              <textarea
                {...register("specialInstructions")}
                id="specialInstructions"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Instructions particulières pour les livreurs..."
              />
            </div>
          </>
        )}

        {/* Boutons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}