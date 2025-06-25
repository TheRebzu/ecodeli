"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { authClient } from "@/lib/auth-client"
import { loginSchema, type LoginData } from "@/features/auth/schemas/auth.schema"
import { Link, useRouter } from "@/i18n/navigation"

interface UserStatus {
  exists: boolean
  emailVerified: boolean
  needsVerification: boolean
  role?: string
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResendButton, setShowResendButton] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  })

  const checkUserStatus = async (email: string): Promise<UserStatus> => {
    const response = await fetch('/api/auth/check-user-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    return response.json()
  }

  const resendVerificationEmail = async () => {
    if (!currentEmail) return

    setIsResendingEmail(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccessMessage('📧 Email de vérification renvoyé ! Vérifiez votre boîte de réception.')
        setShowResendButton(false)
      } else {
        setError(result.error || 'Erreur lors du renvoi de l\'email')
      }
    } catch (err) {
      setError('Erreur lors du renvoi de l\'email de vérification')
    } finally {
      setIsResendingEmail(false)
    }
  }

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    setShowResendButton(false)
    setCurrentEmail(data.email)

    try {
      // D'abord vérifier le statut de l'utilisateur
      const userStatus = await checkUserStatus(data.email)

      // Si l'utilisateur existe mais l'email n'est pas vérifié
      if (userStatus.exists && userStatus.needsVerification) {
        setError('⚠️ Votre email n\'est pas encore vérifié. Veuillez vérifier votre boîte de réception ou cliquer sur le bouton ci-dessous pour renvoyer l\'email de vérification.')
        setShowResendButton(true)
        return
      }

      // Essayer de se connecter avec notre API personnalisée
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Si l'erreur est liée aux credentials, re-vérifier le statut
        if (result.error?.includes('Email ou mot de passe incorrect')) {
          const statusRecheck = await checkUserStatus(data.email)
          
          if (statusRecheck.exists && statusRecheck.needsVerification) {
            setError('⚠️ Votre email n\'est pas encore vérifié. Veuillez vérifier votre boîte de réception ou renvoyer l\'email de vérification.')
            setShowResendButton(true)
          } else if (statusRecheck.exists) {
            setError('❌ Mot de passe incorrect')
          } else {
            setError('❌ Aucun compte trouvé avec cet email')
          }
        } else {
          setError(result.error || 'Erreur de connexion')
        }
        return
      }

      // Redirection selon le rôle utilisateur
      const user = result.user
      
      // Vérifier s'il y a un callbackUrl dans l'URL
      const urlParams = new URLSearchParams(window.location.search)
      let callbackUrl = urlParams.get('callbackUrl')
      
      if (callbackUrl) {
        // Nettoyer le callbackUrl s'il a des locales en double (ex: /fr/fr/fr/client -> /fr/client)
        const urlParts = callbackUrl.split('/')
        const supportedLocales = ['fr', 'en']
        
        if (urlParts.length >= 2 && supportedLocales.includes(urlParts[1])) {
          const locale = urlParts[1]
          // Supprimer toutes les occurrences en double de la locale
          const cleanParts = [urlParts[0], locale] // Garder '' et la locale
          
          // Ajouter le reste en ignorant les locales en double
          for (let i = 2; i < urlParts.length; i++) {
            if (urlParts[i] !== locale) {
              cleanParts.push(urlParts[i])
            }
          }
          
          callbackUrl = cleanParts.join('/')
        }
        
        console.log('🔄 Redirection vers callbackUrl:', callbackUrl)
        // Utiliser window.location pour s'assurer que les cookies sont envoyés
        window.location.href = callbackUrl
      } else if (user?.role) {
        // Sinon, rediriger selon le rôle
        const roleRoutes = {
          'CLIENT': '/client',
          'DELIVERER': '/deliverer', 
          'MERCHANT': '/merchant',
          'PROVIDER': '/provider',
          'ADMIN': '/admin'
        }
        window.location.href = roleRoutes[user.role as keyof typeof roleRoutes] || '/dashboard'
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(t('auth.login.errors.generic'))
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

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.login.email')}
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder={t('auth.login.emailPlaceholder')}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.login.password')}
        </label>
        <input
          {...register("password")}
          type="password"
          id="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder={t('auth.login.passwordPlaceholder')}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="flex justify-end mb-4">
        <Link 
          href="/forgot-password" 
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? t('auth.login.signing') : t('auth.login.loginButton')}
      </button>

      {showResendButton && (
        <button
          type="button"
          onClick={resendVerificationEmail}
          disabled={isResendingEmail}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
        >
          {isResendingEmail ? '📧 Envoi en cours...' : '📧 Renvoyer l\'email de vérification'}
        </button>
      )}
    </form>
  )
}