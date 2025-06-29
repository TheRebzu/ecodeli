"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { createAnnouncementSchema } from '@/features/announcements/schemas/announcement.schema'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, FileText, AlertTriangle, Truck, Clock, Snowflake, Scale, MapPin, Calendar, Euro, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AddressPicker, Address } from "@/components/maps"

type CreateAnnouncementData = {
  title: string
  description: string
  type: string
  startLocation: {
    address: string
    city?: string
  }
  endLocation: {
    address: string
    city?: string
  }
  desiredDate: string
  price: number
  currency: string
  urgent: boolean
  packageDetails?: {
    weight?: number
    dimensions?: string
    fragile?: boolean
  }
  specialInstructions?: string
}

const packageTypes = [
  { 
    value: 'STANDARD_PACKAGE', 
    label: 'Colis standard', 
    icon: Package, 
    description: 'Colis classique jusqu\'à 20kg (cartons, objets divers)',
    color: 'bg-blue-500',
    maxWeight: 20,
    minWeight: 0.1,
    basePrice: 15,
    examples: 'Vêtements, livres, décorations...'
  },
  { 
    value: 'DOCUMENTS', 
    label: 'Documents & courrier', 
    icon: FileText, 
    description: 'Enveloppes, documents importants, courrier urgent',
    color: 'bg-gray-500',
    maxWeight: 2,
    minWeight: 0.01,
    basePrice: 8,
    examples: 'Contrats, certificats, cartes...'
  },
  { 
    value: 'FRAGILE_PACKAGE', 
    label: 'Colis fragile', 
    icon: AlertTriangle, 
    description: 'Objets délicats nécessitant des précautions spéciales',
    color: 'bg-red-500',
    maxWeight: 15,
    minWeight: 0.1,
    basePrice: 20,
    examples: 'Verre, céramique, électronique...'
  },
  { 
    value: 'HEAVY_PACKAGE', 
    label: 'Colis lourd', 
    icon: Scale, 
    description: 'Gros colis de 20kg à 50kg (meubles, électroménager)',
    color: 'bg-orange-600',
    maxWeight: 50,
    minWeight: 20,
    basePrice: 35,
    examples: 'Meubles, électroménager, machines...'
  },
  { 
    value: 'EXPRESS_PACKAGE', 
    label: 'Colis express', 
    icon: Clock, 
    description: 'Livraison urgente le jour même',
    color: 'bg-yellow-500',
    maxWeight: 10,
    minWeight: 0.1,
    basePrice: 25,
    examples: 'Médicaments, pièces urgentes...'
  },
  { 
    value: 'TEMPERATURE_CONTROLLED', 
    label: 'Colis réfrigéré', 
    icon: Snowflake, 
    description: 'Produits frais nécessitant une chaîne du froid',
    color: 'bg-cyan-500',
    maxWeight: 10,
    minWeight: 0.1,
    basePrice: 30,
    examples: 'Produits frais, médicaments, fleurs...'
  }
]

export default function CreateAnnouncementForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('STANDARD_PACKAGE')
  const router = useRouter()
  const t = useTranslations()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<CreateAnnouncementData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      type: 'STANDARD_PACKAGE',
      urgent: false,
      price: 15,
      currency: 'EUR',
      packageDetails: {
        weight: 1,
        fragile: false
      }
    }
  })

  const weight = watch('packageDetails.weight') || 1
  const urgent = watch('urgent')
  const currentType = watch('type')
  const selectedPackageType = packageTypes.find(pt => pt.value === currentType)

  // Suggestion de prix basée sur le type et le poids du colis
  const getSuggestedPrice = (type: string, weight: number) => {
    const selectedPackageType = packageTypes.find(pt => pt.value === type)
    let basePrice = selectedPackageType?.basePrice || 15
    
    // Ajustement selon le poids
    if (weight > 5) {
      basePrice += Math.ceil((weight - 5) * 2)
    }
    
    // Majoration pour livraison urgente
    if (urgent) {
      basePrice = Math.ceil(basePrice * 1.3)
    }
    
    return basePrice
  }

  const onSubmit = async (data: CreateAnnouncementData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/client/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: "❌ Erreur",
          description: result.error || 'Une erreur est survenue',
          variant: "destructive",
        })
        return
      }

      toast({
        title: "✅ Annonce créée",
        description: "Votre annonce a été publiée avec succès",
      })

      router.push('/client/announcements')
    } catch (err) {
      toast({
        title: "❌ Erreur",
        description: 'Une erreur est survenue lors de la création',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* En-tête avec informations */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Package className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-green-900 mb-2">
                  🚚 Créer une demande de livraison de colis
                </h2>
                <p className="text-green-700 mb-4">
                  EcoDeli vous connecte avec des livreurs de confiance pour transporter vos colis 
                  en toute sécurité. Choisissez le type de colis et remplissez les détails.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">🌍 Écologique</Badge>
                  <Badge variant="secondary">⚡ Rapide</Badge>
                  <Badge variant="secondary">🔒 Sécurisé</Badge>
                  <Badge variant="secondary">💰 Prix transparents</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Type de colis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📦 Type de colis
            </CardTitle>
            <p className="text-sm text-gray-600">
              Sélectionnez le type qui correspond le mieux à votre envoi
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packageTypes.map((type) => {
                const Icon = type.icon
                return (
                  <label key={type.value} className="relative">
                    <input
                      {...register("type")}
                      type="radio"
                      value={type.value}
                      className="sr-only peer"
                      onChange={(e) => {
                        setSelectedType(e.target.value)
                        setValue('price', getSuggestedPrice(e.target.value, weight))
                      }}
                    />
                    <div className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-green-300 transition-all duration-200 h-full">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">{type.label}</h3>
                          <p className="text-sm text-gray-600 mb-1">{type.description}</p>
                          <p className="text-xs text-gray-500">Ex: {type.examples}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Détails du type sélectionné */}
        {selectedPackageType && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <selectedPackageType.icon className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  {selectedPackageType.label}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-600" />
                  <span>Poids: {selectedPackageType.minWeight}kg - {selectedPackageType.maxWeight}kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-blue-600" />
                  <span>Prix de base: à partir de {selectedPackageType.basePrice}€</span>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>{selectedPackageType.examples}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>📝 Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Titre */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre de l'annonce *
              </label>
              <Input
                {...register("title")}
                id="title"
                placeholder="Ex: Livraison colis urgent Paris → Lyon"
                className="w-full"
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
              <Textarea
                {...register("description")}
                id="description"
                rows={4}
                placeholder="Décrivez votre demande, le contenu du colis, les conditions particulières..."
                className="w-full"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adresses */}
        <Card>
          <CardHeader>
            <CardTitle>📍 Adresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startLocation.address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse de départ *
                </label>
                <Textarea
                  {...register("startLocation.address")}
                  id="startLocation.address"
                  rows={3}
                  placeholder="Adresse complète de collecte..."
                  className="w-full"
                />
                {errors.startLocation?.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.startLocation.address.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endLocation.address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse d'arrivée *
                </label>
                <Textarea
                  {...register("endLocation.address")}
                  id="endLocation.address"
                  rows={3}
                  placeholder="Adresse complète de livraison..."
                  className="w-full"
                />
                {errors.endLocation?.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.endLocation.address.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails du colis - toujours affiché car tout est colis */}
          <Card>
            <CardHeader>
              <CardTitle>📦 Détails du colis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="packageDetails.weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Poids (kg) *
                  </label>
                  <Input
                    {...register("packageDetails.weight", { 
                      valueAsNumber: true,
                      onChange: (e) => {
                        const newWeight = parseFloat(e.target.value) || 1
                        setValue('price', getSuggestedPrice(currentType, newWeight))
                      }
                    })}
                    type="number"
                    step="0.1"
                    min={selectedPackageType?.minWeight || 0.1}
                    max={selectedPackageType?.maxWeight || 50}
                    id="packageDetails.weight"
                    className="w-full"
                  />
                  {selectedPackageType && (
                    <p className="mt-1 text-xs text-gray-500">
                      Limite: {selectedPackageType.minWeight}kg - {selectedPackageType.maxWeight}kg
                    </p>
                  )}
                  {errors.packageDetails?.weight && (
                    <p className="mt-1 text-sm text-red-600">{errors.packageDetails.weight.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="packageDetails.dimensions" className="block text-sm font-medium text-gray-700 mb-1">
                    Dimensions (cm)
                  </label>
                  <Input
                    {...register("packageDetails.dimensions")}
                    type="text"
                    id="packageDetails.dimensions"
                    placeholder="Ex: 30x20x15"
                    className="w-full"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-6">
                  <label className="flex items-center">
                    <input
                      {...register("packageDetails.fragile")}
                      type="checkbox"
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Fragile</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Prix et date */}
        <Card>
          <CardHeader>
            <CardTitle>💰 Prix et planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Prix proposé (€) *
                </label>
                <Input
                  {...register("price", { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min="1"
                  max="10000"
                  id="price"
                  className="w-full"
                />
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">
                      💡 Prix suggéré: {getSuggestedPrice(currentType, weight)}€
                    </span>
                    {urgent && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        +30% Urgence
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Basé sur le type de colis, le poids et les options
                  </p>
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="desiredDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Date souhaitée *
                </label>
                <Input
                  {...register("desiredDate")}
                  type="datetime-local"
                  id="desiredDate"
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                />
                {errors.desiredDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.desiredDate.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options et instructions */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Options supplémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Urgent */}
            <div className="flex items-center">
              <input
                {...register("urgent", {
                  onChange: (e) => {
                    setValue('price', getSuggestedPrice(currentType, weight))
                  }
                })}
                type="checkbox"
                id="urgent"
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="urgent" className="ml-2 text-sm text-gray-700">
                ⚡ Livraison urgente (+20% sur le prix)
              </label>
            </div>

            {/* Instructions spéciales */}
            <div>
              <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                Instructions spéciales
              </label>
              <Textarea
                {...register("specialInstructions")}
                id="specialInstructions"
                rows={3}
                placeholder="Instructions particulières, code d'accès, étage..."
                className="w-full"
              />
              {errors.specialInstructions && (
                <p className="mt-1 text-sm text-red-600">{errors.specialInstructions.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Boutons */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Création en cours...' : 'Publier l\'annonce'}
          </Button>
        </div>
      </form>
    </div>
  )
}