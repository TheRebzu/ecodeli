"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { z } from "zod"

const createAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères').max(100),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères').max(1000),
  type: z.enum(['PACKAGE', 'TRANSPORT', 'SHOPPING', 'PET_CARE', 'HOME_SERVICE']),
  pickupAddress: z.string().min(10, 'Adresse de collecte requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  weight: z.number().positive('Le poids doit être positif').max(50, 'Maximum 50kg').optional(),
  dimensions: z.string().optional(),
  basePrice: z.number().positive('Le prix doit être positif').max(10000, 'Prix maximum 10,000€'),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  fragile: z.boolean().default(false),
  urgent: z.boolean().default(false),
  specialInstructions: z.string().max(500).optional(),
  requiresInsurance: z.boolean().default(false)
})

type CreateAnnouncementData = z.infer<typeof createAnnouncementSchema>

export function CreateAnnouncementForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<CreateAnnouncementData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      type: 'PACKAGE',
      fragile: false,
      urgent: false,
      requiresInsurance: false,
      weight: 1,
      basePrice: 10
    }
  })

  const type = watch('type')
  const weight = watch('weight')

  // Suggestion de prix basée sur le poids et la distance (simulation)
  const getSuggestedPrice = (weight: number) => {
    if (weight <= 2) return 8
    if (weight <= 5) return 12
    if (weight <= 10) return 18
    if (weight <= 20) return 25
    return Math.ceil(weight * 1.5)
  }

  const onSubmit = async (data: CreateAnnouncementData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/client/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Une erreur est survenue')
        return
      }

      // Redirection vers la liste des annonces
      router.push('/client/announcements')
    } catch (err) {
      setError('Une erreur est survenue lors de la création')
    } finally {
      setIsLoading(false)
    }
  }

  const serviceTypes = [
    { value: 'PACKAGE', label: '📦 Livraison de colis', description: 'Envoi de colis, documents, objets' },
    { value: 'HOME_SERVICE', label: '🛠️ Service à domicile', description: 'Nettoyage, jardinage, bricolage, réparations' },
    { value: 'SHOPPING', label: '🛒 Courses', description: 'Faire les courses pour le client' },
    { value: 'PET_CARE', label: '🐕 Garde d\'animaux', description: 'Promenade, garde d\'animaux' },
    { value: 'TRANSPORT', label: '🚗 Transport', description: 'Transport de personnes ou objets' }
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Type de service */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Type de service *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceTypes.map((type) => (
            <label key={type.value} className="relative">
              <input
                {...register("type")}
                type="radio"
                value={type.value}
                className="sr-only peer"
              />
              <div className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-green-300 transition-colors">
                <h3 className="font-medium text-gray-900 mb-1">{type.label}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>

      {/* Titre */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Titre de l'annonce *
        </label>
        <input
          {...register("title")}
          type="text"
          id="title"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Ex: Livraison colis Paris → Lyon"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description détaillée *
        </label>
        <textarea
          {...register("description")}
          id="description"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Décrivez votre demande, le contenu du colis, les conditions particulières..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Adresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Adresse de collecte *
          </label>
          <textarea
            {...register("pickupAddress")}
            id="pickupAddress"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Adresse complète de collecte"
          />
          {errors.pickupAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.pickupAddress.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Adresse de livraison *
          </label>
          <textarea
            {...register("deliveryAddress")}
            id="deliveryAddress"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Adresse complète de livraison"
          />
          {errors.deliveryAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.deliveryAddress.message}</p>
          )}
        </div>
      </div>

      {/* Détails du colis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
            Poids (kg) *
          </label>
          <input
            {...register("weight", { 
              valueAsNumber: true,
              onChange: (e) => {
                const newWeight = parseFloat(e.target.value) || 1
                setValue('basePrice', getSuggestedPrice(newWeight))
              }
            })}
            type="number"
            step="0.1"
            min="0.1"
            max="50"
            id="weight"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {errors.weight && (
            <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700 mb-1">
            Dimensions (cm)
          </label>
          <input
            {...register("dimensions")}
            type="text"
            id="dimensions"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: 30x20x15"
          />
        </div>

        <div>
          <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-1">
            Prix proposé (€) *
          </label>
          <input
            {...register("basePrice", { valueAsNumber: true })}
            type="number"
            step="0.5"
            min="1"
            max="10000"
            id="basePrice"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Suggéré: {getSuggestedPrice(weight || 1)}€
          </p>
          {errors.basePrice && (
            <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="pickupDate" className="block text-sm font-medium text-gray-700 mb-1">
            Date de collecte souhaitée *
          </label>
          <input
            {...register("pickupDate")}
            type="datetime-local"
            id="pickupDate"
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {errors.pickupDate && (
            <p className="mt-1 text-sm text-red-600">{errors.pickupDate.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
            Échéance de livraison *
          </label>
          <input
            {...register("deliveryDate")}
            type="datetime-local"
            id="deliveryDate"
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {errors.deliveryDate && (
            <p className="mt-1 text-sm text-red-600">{errors.deliveryDate.message}</p>
          )}
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
          placeholder="Instructions particulières pour la livraison..."
        />
        {errors.specialInstructions && (
          <p className="mt-1 text-sm text-red-600">{errors.specialInstructions.message}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            {...register("fragile")}
            type="checkbox"
            id="fragile"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="fragile" className="ml-2 text-sm text-gray-700">
            📦 Colis fragile (manipulation avec précaution)
          </label>
        </div>

        <div className="flex items-center">
          <input
            {...register("urgent")}
            type="checkbox"
            id="urgent"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="urgent" className="ml-2 text-sm text-gray-700">
            ⚡ Livraison urgente (+20% sur le prix)
          </label>
        </div>

        <div className="flex items-center">
          <input
            {...register("requiresInsurance")}
            type="checkbox"
            id="requiresInsurance"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="requiresInsurance" className="ml-2 text-sm text-gray-700">
            🛡️ Assurance recommandée (+5% sur le prix)
          </label>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Création en cours...' : 'Publier l\'annonce'}
        </button>
      </div>
    </form>
  )
}