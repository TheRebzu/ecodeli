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
      subscriptionPlan: 'FREE',
      acceptsMarketing: false
    }
  })

  const onSubmit = async (data: ClientRegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Une erreur est survenue')
        return
      }

      // Redirection vers la page de vérification email
      router.push('/verify-email?email=' + encodeURIComponent(data.email))
    } catch (err) {
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

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nom complet *
        </label>
        <input
          {...register("name")}
          type="text"
          id="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Votre nom complet"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
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
          <option value="STARTER">Starter - 15€/mois - 20 colis/mois</option>
          <option value="PREMIUM">Premium - 35€/mois - Illimité</option>
        </select>
        {errors.subscriptionPlan && (
          <p className="mt-1 text-sm text-red-600">{errors.subscriptionPlan.message}</p>
        )}
      </div>

      <div className="flex items-center">
        <input
          {...register("acceptsMarketing")}
          type="checkbox"
          id="acceptsMarketing"
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <label htmlFor="acceptsMarketing" className="ml-2 text-sm text-gray-700">
          J'accepte de recevoir les actualités et offres d'EcoDeli
        </label>
      </div>

      <div className="text-xs text-gray-500">
        En créant un compte, vous acceptez nos{' '}
        <a href="/terms" className="text-green-600 hover:underline">
          Conditions d'utilisation
        </a>{' '}
        et notre{' '}
        <a href="/privacy" className="text-green-600 hover:underline">
          Politique de confidentialité
        </a>
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