"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { providerRegisterSchema, type ProviderRegisterData } from "@/features/auth/schemas/auth.schema"

export default function ProviderRegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProviderRegisterData>({
    resolver: zodResolver(providerRegisterSchema),
    defaultValues: {
      serviceType: 'CLEANING'
    }
  })

  const onSubmit = async (data: ProviderRegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Une erreur est survenue')
        return
      }

      router.push('/verify-email?email=' + encodeURIComponent(data.email))
    } catch (err) {
      setError('Une erreur est survenue lors de l\'inscription')
    } finally {
      setIsLoading(false)
    }
  }

  const serviceTypes = [
    { value: 'CLEANING', label: 'Ménage / Nettoyage' },
    { value: 'GARDENING', label: 'Jardinage' },
    { value: 'HANDYMAN', label: 'Bricolage / Réparations' },
    { value: 'TUTORING', label: 'Cours particuliers' },
    { value: 'HEALTHCARE', label: 'Soins / Santé' },
    { value: 'BEAUTY', label: 'Beauté / Esthétique' },
    { value: 'PET_SITTING', label: 'Garde d\'animaux' },
    { value: 'OTHER', label: 'Autre' }
  ]

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
          placeholder="Prénom Nom"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
          Type de service *
        </label>
        <select
          {...register("serviceType")}
          id="serviceType"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          {serviceTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.serviceType && (
          <p className="mt-1 text-sm text-red-600">{errors.serviceType.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
          Années d'expérience *
        </label>
        <input
          {...register("experience", { valueAsNumber: true })}
          type="number"
          id="experience"
          min="0"
          max="50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="5"
        />
        {errors.experience && (
          <p className="mt-1 text-sm text-red-600">{errors.experience.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-1">
          Certifications / Diplômes
        </label>
        <textarea
          {...register("certifications")}
          id="certifications"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Listez vos diplômes, certifications ou formations pertinentes..."
        />
        {errors.certifications && (
          <p className="mt-1 text-sm text-red-600">{errors.certifications.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="serviceArea" className="block text-sm font-medium text-gray-700 mb-1">
          Zone d'intervention *
        </label>
        <input
          {...register("serviceArea")}
          type="text"
          id="serviceArea"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Paris 15ème, Boulogne-Billancourt..."
        />
        {errors.serviceArea && (
          <p className="mt-1 text-sm text-red-600">{errors.serviceArea.message}</p>
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
          placeholder="votre.email@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Téléphone *
        </label>
        <input
          {...register("phone")}
          type="tel"
          id="phone"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="+33 1 23 45 67 89"
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
          placeholder="Confirmez votre mot de passe"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="flex items-start space-x-2">
        <input
          {...register("acceptTerms")}
          type="checkbox"
          id="acceptTerms"
          className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <label htmlFor="acceptTerms" className="text-sm text-gray-700">
          J'accepte les{" "}
          <a href="/terms" className="text-green-600 hover:text-green-500 underline">
            conditions d'utilisation
          </a>{" "}
          et la{" "}
          <a href="/privacy" className="text-green-600 hover:text-green-500 underline">
            politique de confidentialité
          </a>
        </label>
      </div>
      {errors.acceptTerms && (
        <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Inscription en cours...' : 'S\'inscrire comme prestataire'}
      </button>
    </form>
  )
} 