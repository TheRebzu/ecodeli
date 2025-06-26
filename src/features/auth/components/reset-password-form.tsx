"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPasswordSchema, type ResetPasswordData } from "@/features/auth/schemas/auth.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { ArrowLeft, Lock, Loader2, CheckCircle, AlertTriangle } from "lucide-react"

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema)
  })

  // Vérifier la validité du token au chargement
  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      setError('Token manquant. Veuillez demander un nouveau lien de réinitialisation.')
      return
    }

    setValue('token', token)
    
    // Vérifier la validité du token
    const verifyToken = async () => {
      try {
        const response = await fetch('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const result = await response.json()
        
        if (response.ok && result.valid) {
          setTokenValid(true)
        } else {
          setTokenValid(false)
          setError(result.error || 'Token invalide ou expiré')
        }
      } catch (err) {
        setTokenValid(false)
        setError('Erreur de vérification du token')
      }
    }

    verifyToken()
  }, [token, setValue])

  const onSubmit = async (data: ResetPasswordData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(result.error || 'Une erreur est survenue')
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  // Token invalide ou manquant
  if (tokenValid === false) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-700">Token invalide</CardTitle>
          <CardDescription>
            Ce lien de réinitialisation est invalide ou a expiré
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              {error || 'Le lien de réinitialisation est invalide, expiré ou a déjà été utilisé.'}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-2">
            <Link 
              href="/forgot-password"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-center"
            >
              Demander un nouveau lien
            </Link>
            <Link 
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Réinitialisation réussie
  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-green-700">Mot de passe modifié !</CardTitle>
          <CardDescription>
            Votre mot de passe a été mis à jour avec succès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Vous allez être redirigé vers la page de connexion dans quelques secondes...
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center">
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Aller à la connexion maintenant
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Token en cours de vérification
  if (tokenValid === null) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Vérification du lien...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Formulaire de réinitialisation
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
        <CardDescription>
          Choisissez un nouveau mot de passe sécurisé
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <input type="hidden" {...register("token")} />

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Nouveau mot de passe
            </label>
            <Input
              {...register("password")}
              type="password"
              id="password"
              placeholder="••••••••"
              className="w-full"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmer le mot de passe
            </label>
            <Input
              {...register("confirmPassword")}
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              className="w-full"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </Button>

          <div className="text-center">
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 