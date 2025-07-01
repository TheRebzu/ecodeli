"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { UserValidationForm } from '@/features/auth/components/user-validation-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Shield } from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  email: string
  role: string
  emailVerified: boolean
  profile?: {
    verified: boolean
  }
}

import { useTranslations } from 'next-intl';

export default function ValidateUserPage() {
  const t = useTranslations();
  const searchParams = useSearchParams()
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUserData(data.user)
        } else {
          setError(t('auth.validateUser.errors.mustBeLoggedIn', 'Vous devez être connecté pour accéder à cette page'))
        }
      } catch (error) {
        console.error(t('auth.validateUser.errors.fetchError', 'Erreur lors de la récupération des données utilisateur:'), error)
        setError(t('auth.validateUser.errors.connectionError', 'Erreur de connexion'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handleValidationComplete = () => {
    // Rediriger vers le dashboard approprié selon le rôle
    if (userData) {
      switch (userData.role) {
        case 'CLIENT':
          router.push('/client/dashboard')
          break
        case 'DELIVERER':
          router.push('/deliverer/dashboard')
          break
        case 'MERCHANT':
          router.push('/merchant/dashboard')
          break
        case 'PROVIDER':
          router.push('/provider/dashboard')
          break
        default:
          router.push('/')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">{t('common.loading', 'Chargement...')}</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              {t('common.error', 'Erreur')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href="/login">
                  {t('auth.login.loginButton', 'Se connecter')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{t('auth.validateUser.errors.noUserData', 'Aucune donnée utilisateur trouvée')}</p>
            <Button asChild className="mt-4">
              <Link href="/login">
                {t('auth.login.loginButton', 'Se connecter')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vérifier si l'email n'est pas vérifié
  if (!userData.emailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Shield className="h-5 w-5" />
              {t('auth.validateUser.emailNotVerifiedTitle', 'Email non vérifié')}
            </CardTitle>
            <CardDescription>
              {t('auth.validateUser.emailNotVerifiedDescription', 'Vous devez vérifier votre email avant de pouvoir valider votre profil.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-800">
                {t('auth.validateUser.checkYourEmail', 'Veuillez vérifier votre boîte email et cliquer sur le lien de vérification.')}
              </AlertDescription>
            </Alert>
            <div className="mt-4 space-y-2">
              <Button asChild className="w-full">
                <Link href="/resend-verification">
                  {t('auth.validateUser.resendVerificationEmail', "Renvoyer l'email de vérification")}
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">
                  {t('auth.validateUser.backToLogin', 'Retour à la connexion')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vérifier si le profil est déjà vérifié
  if (userData.profile?.verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {t('auth.validateUser.profileAlreadyValidatedTitle', 'Profil déjà validé')}
            </CardTitle>
            <CardDescription>
              {t('auth.validateUser.profileAlreadyValidatedDescription', 'Votre profil a déjà été validé. Vous pouvez accéder à votre espace.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {t('auth.validateUser.accountReady', 'Votre compte est prêt à être utilisé !')}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href={`/${userData.role.toLowerCase()}/dashboard`}>
                  {t('auth.validateUser.accessMySpace', 'Accéder à mon espace')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('auth.validateUser.finalizeRegistrationTitle', 'Finalisez votre inscription')}
          </h1>
          <p className="text-gray-600">
            {t('auth.validateUser.finalizeRegistrationSubtitle', 'Complétez votre profil pour accéder à tous les services EcoDeli')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informations utilisateur */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  {t('auth.validateUser.accountInformationTitle', 'Informations du compte')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auth.login.email', 'Email')}</label>
                  <p className="text-gray-900">{userData.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auth.validateUser.role', 'Rôle')}</label>
                  <p className="text-gray-900 capitalize">{userData.role.toLowerCase()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('auth.validateUser.emailStatus', 'Statut email')}</label>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">{t('auth.validateUser.verified', 'Vérifié')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulaire de validation */}
          <div className="lg:col-span-2">
            <UserValidationForm
              userRole={userData.role as any}
              userId={userData.id}
              onValidationComplete={handleValidationComplete}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 