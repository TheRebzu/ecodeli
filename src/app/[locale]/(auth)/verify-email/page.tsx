import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface VerifyEmailPageProps {
  searchParams: {
    verified?: string
    error?: string
  }
}

function VerifyEmailContent({ searchParams }: VerifyEmailPageProps) {
  const t = useTranslations()
  const { verified, error } = searchParams

  if (verified === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              ✅ Email vérifié avec succès !
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Votre adresse email a été confirmée. Vous pouvez maintenant vous connecter à votre compte EcoDeli.
            </p>
          </div>
          
          <div className="text-center">
            <Link
              href="/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    let errorMessage = 'Une erreur est survenue lors de la vérification'
    
    switch (error) {
      case 'invalid_token':
        errorMessage = 'Le lien de vérification est invalide'
        break
      case 'invalid_or_expired_token':
        errorMessage = 'Le lien de vérification a expiré ou est invalide'
        break
      case 'user_not_found':
        errorMessage = 'Utilisateur non trouvé'
        break
      case 'verification_failed':
        errorMessage = 'La vérification a échoué'
        break
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              ❌ Erreur de vérification
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {errorMessage}
            </p>
          </div>
          
          <div className="space-y-4">
            <Link
              href="/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Retour à la connexion
            </Link>
            
            <p className="text-center text-sm text-gray-600">
              Besoin d'aide ? {' '}
              <Link href="/contact" className="font-medium text-green-600 hover:text-green-500">
                Contactez-nous
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // État par défaut si aucun paramètre
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            🔐 Vérification d'email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Cliquez sur le lien dans l'email que nous vous avons envoyé pour vérifier votre adresse.
          </p>
        </div>
        
        <div className="text-center">
          <Link
            href="/login"
            className="font-medium text-green-600 hover:text-green-500"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <VerifyEmailContent searchParams={searchParams} />
    </Suspense>
  )
} 