"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { loginSchema, type LoginData } from "@/features/auth/schemas/auth.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  
  const callbackUrl = searchParams.get('callbackUrl') || '/'

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la connexion')
        return
      }

      // Redirection selon le rôle ou callback URL
      if (callbackUrl && callbackUrl !== '/') {
        router.push(callbackUrl)
      } else if (result.redirectTo) {
        router.push(result.redirectTo)
      } else {
        // Fallback selon le rôle
        const roleRoutes = {
          'CLIENT': '/client/dashboard',
          'DELIVERER': '/deliverer/dashboard',
          'MERCHANT': '/merchant/dashboard',
          'PROVIDER': '/provider/dashboard',
          'ADMIN': '/admin/dashboard'
        }
        const role = result.user?.role
        router.push(roleRoutes[role as keyof typeof roleRoutes] || '/dashboard')
      }
      
      // Rafraîchir la page pour mettre à jour l'état d'authentification
      router.refresh()
      
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Connexion EcoDeli
        </CardTitle>
        <CardDescription className="text-center">
          Connectez-vous à votre espace personnel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              {...register("email")}
              type="email"
              id="email"
              placeholder="votre@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Votre mot de passe"
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => router.push('/register')}
              >
                S'inscrire
              </Button>
            </p>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-normal text-sm"
              onClick={() => router.push('/forgot-password')}
            >
              Mot de passe oublié ?
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}