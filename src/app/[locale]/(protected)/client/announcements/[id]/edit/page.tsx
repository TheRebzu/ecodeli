"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const editAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères').max(100),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères').max(1000),
  serviceType: z.enum(['PACKAGE_DELIVERY', 'HOME_SERVICE', 'CART_DROP', 'SHOPPING', 'PET_CARE']),
  pickupAddress: z.string().min(10, 'Adresse de collecte requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  weight: z.number().positive('Le poids doit être positif').max(50, 'Maximum 50kg'),
  dimensions: z.string().optional(),
  price: z.number().positive('Le prix doit être positif').max(10000, 'Prix maximum 10,000€'),
  pickupDate: z.string(),
  deliveryDeadline: z.string(),
  fragile: z.boolean().default(false),
  urgent: z.boolean().default(false),
  specialInstructions: z.string().max(500).optional()
})

type EditAnnouncementData = z.infer<typeof editAnnouncementSchema>

interface Announcement {
  id: string
  title: string
  description: string
  serviceType: string
  pickupAddress: string
  deliveryAddress: string
  weight: number
  dimensions?: string
  price: number
  pickupDate: string
  deliveryDeadline: string
  fragile: boolean
  urgent: boolean
  specialInstructions?: string
  status: string
}

export default function EditAnnouncementPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<EditAnnouncementData>({
    resolver: zodResolver(editAnnouncementSchema)
  })

  const weight = watch('weight')

  useEffect(() => {
    if (params.id) {
      fetchAnnouncement(params.id as string)
    }
  }, [params.id])

  const fetchAnnouncement = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/announcements/${id}`)
      
      if (!response.ok) {
        throw new Error('Annonce non trouvée')
      }

      const data = await response.json()
      setAnnouncement(data)
      
      // Préremplit le formulaire
      reset({
        title: data.title,
        description: data.description,
        serviceType: data.serviceType,
        pickupAddress: data.pickupAddress,
        deliveryAddress: data.deliveryAddress,
        weight: data.weight,
        dimensions: data.dimensions || '',
        price: data.price,
        pickupDate: new Date(data.pickupDate).toISOString().slice(0, 16),
        deliveryDeadline: new Date(data.deliveryDeadline).toISOString().slice(0, 16),
        fragile: data.fragile || false,
        urgent: data.urgent || false,
        specialInstructions: data.specialInstructions || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const getSuggestedPrice = (weight: number) => {
    if (weight <= 2) return 8
    if (weight <= 5) return 12
    if (weight <= 10) return 18
    if (weight <= 20) return 25
    return Math.ceil(weight * 1.5)
  }

  const onSubmit = async (data: EditAnnouncementData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/client/announcements/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Une erreur est survenue')
        return
      }

      // Redirection vers le détail
      router.push(`/client/announcements/${params.id}`)
    } catch (err) {
      setError('Une erreur est survenue lors de la modification')
    } finally {
      setIsSubmitting(false)
    }
  }

  const serviceTypes = [
    { value: 'PACKAGE_DELIVERY', label: '📦 Livraison de colis', description: 'Envoi de colis, documents, objets' },
    { value: 'HOME_SERVICE', label: '🛠️ Service à domicile', description: 'Nettoyage, jardinage, bricolage, réparations' },
    { value: 'CART_DROP', label: '🛒 Lâcher de chariot', description: 'Livraison depuis un magasin partenaire' },
    { value: 'SHOPPING', label: '🛒 Courses', description: 'Faire les courses pour le client' },
    { value: 'PET_CARE', label: '🐕 Garde d\'animaux', description: 'Promenade, garde d\'animaux' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-red-600 text-lg mb-2">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              href="/client/announcements"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Retour aux annonces
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (announcement.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-yellow-600 text-lg mb-2">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Modification impossible</h3>
            <p className="text-gray-600 mb-4">
              Cette annonce ne peut plus être modifiée car elle n'est plus active.
            </p>
            <Link
              href={`/client/announcements/${announcement.id}`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Voir l'annonce
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/client/announcements/${announcement.id}`}
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Retour à l'annonce
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Modifier l'annonce
          </h1>
          <p className="text-gray-600">
            Mettez à jour les informations de votre demande de livraison
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
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
                        {...register("serviceType")}
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
                {errors.serviceType && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceType.message}</p>
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
                        setValue('price', getSuggestedPrice(newWeight))
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
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Prix proposé (€) *
                  </label>
                  <input
                    {...register("price", { valueAsNumber: true })}
                    type="number"
                    step="0.5"
                    min="1"
                    max="10000"
                    id="price"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Suggéré: {getSuggestedPrice(weight || 1)}€
                  </p>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
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
                  <label htmlFor="deliveryDeadline" className="block text-sm font-medium text-gray-700 mb-1">
                    Échéance de livraison *
                  </label>
                  <input
                    {...register("deliveryDeadline")}
                    type="datetime-local"
                    id="deliveryDeadline"
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {errors.deliveryDeadline && (
                    <p className="mt-1 text-sm text-red-600">{errors.deliveryDeadline.message}</p>
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
              </div>

              {/* Boutons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Link
                  href={`/client/announcements/${announcement.id}`}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Modification en cours...' : 'Sauvegarder les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}