"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { authClient } from "@/lib/auth-client"
import { loginSchema, type LoginData } from "@/features/auth/schemas/auth.schema"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      // Redirection selon le rôle utilisateur
      const user = result.data?.user
      if (user?.role) {
        const roleRoutes = {
          'CLIENT': '/client',
          'DELIVERER': '/deliverer', 
          'MERCHANT': '/merchant',
          'PROVIDER': '/provider',
          'ADMIN': '/admin'
        }
        router.push(roleRoutes[user.role as keyof typeof roleRoutes] || '/dashboard')
      } else {
        router.push('/dashboard')
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

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? t('auth.login.signing') : t('auth.login.loginButton')}
      </button>
    </form>
  )
}