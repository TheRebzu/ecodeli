"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { clientRegisterSchema, type ClientRegisterData } from "@/features/auth/schemas/auth.schema"

export function ClientRegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ClientRegisterData>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: {
      subscriptionPlan: 'FREE' as const,
      acceptsMarketing: false,
      termsAccepted: false
    }
  })

  const onSubmit = async (data: ClientRegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Préparer les données pour l'API backend
      const apiData = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || '',
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: 'FR',
        language: 'fr',
        termsAccepted: data.termsAccepted,
        role: 'CLIENT' as const
      }

      console.log('📤 Envoi des données:', apiData)

      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: apiData.email,
          password: apiData.password,
          name: `${apiData.firstName} ${apiData.lastName}`,
          role: apiData.role,
          // Propriétés additionnelles pour Better Auth
          isActive: true,
          validationStatus: 'APPROVED'
        })
      })

      const result = await response.json()
      console.log('📥 Réponse API:', result)

      if (!response.ok) {
        setError(result.error || 'Une erreur est survenue')
        return
      }

      // Redirection vers la page de connexion avec message de succès
      router.push('/fr/login?message=Compte créé avec succès. Vous pouvez maintenant vous connecter.')
    } catch (err) {
      console.error('❌ Erreur catch:', err)
      setError('Une erreur est survenue lors de l\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            Prénom *
          </label>
          <input
            {...register("firstName")}
            type="text"
            id="firstName"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Votre prénom"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Nom *
          </label>
          <input
            {...register("lastName")}
            type="text"
            id="lastName"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Votre nom"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="votre@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Téléphone
        </label>
        <input
          {...register("phone")}
          type="tel"
          id="phone"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="+33 6 12 34 56 78"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Adresse complète *
        </label>
        <input
          {...register("address")}
          type="text"
          id="address"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="123 rue de la Paix"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            Ville *
          </label>
          <input
            {...register("city")}
            type="text"
            id="city"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Paris"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
            Code postal *
          </label>
          <input
            {...register("postalCode")}
            type="text"
            id="postalCode"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="75001"
          />
          {errors.postalCode && (
            <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Mot de passe *
        </label>
        <input
          {...register("password")}
          type="password"
          id="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Mot de passe sécurisé"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirmer le mot de passe *
        </label>
        <input
          {...register("confirmPassword")}
          type="password"
          id="confirmPassword"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Confirmer le mot de passe"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="subscriptionPlan" className="block text-sm font-medium text-gray-700 mb-1">
          Plan d'abonnement
        </label>
        <select
          {...register("subscriptionPlan")}
          id="subscriptionPlan"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="FREE">Gratuit - 3 colis/mois</option>
          <option value="STARTER">Starter - 9,90€/mois - 20 colis/mois</option>
          <option value="PREMIUM">Premium - 19,99€/mois - Illimité</option>
        </select>
        {errors.subscriptionPlan && (
          <p className="mt-1 text-sm text-red-600">{errors.subscriptionPlan.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-start">
          <input
            {...register("termsAccepted")}
            type="checkbox"
            id="termsAccepted"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
          />
          <label htmlFor="termsAccepted" className="ml-2 text-sm text-gray-700">
            J'accepte les{' '}
            <a href="/fr/terms" target="_blank" className="text-green-600 hover:underline">
              Conditions d'utilisation
            </a>{' '}
            et la{' '}
            <a href="/fr/privacy" target="_blank" className="text-green-600 hover:underline">
              Politique de confidentialité
            </a>{' '}
            d'EcoDeli *
          </label>
        </div>
        {errors.termsAccepted && (
          <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>
        )}

        <div className="flex items-center">
          <input
            {...register("acceptsMarketing")}
            type="checkbox"
            id="acceptsMarketing"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="acceptsMarketing" className="ml-2 text-sm text-gray-700">
            J'accepte de recevoir les actualités et offres d'EcoDeli par email
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? 'Création en cours...' : 'Créer mon compte client'}
      </button>
    </form>
  )
}