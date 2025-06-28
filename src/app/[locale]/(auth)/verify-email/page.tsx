"use client"

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const token = params.get('token')
  const email = params.get('email')
  const [status, setStatus] = useState<'pending'|'success'|'error'>('pending')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setMessage('Lien de vérification invalide. Veuillez vérifier votre email.')
      setIsLoading(false)
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email })
        })

        const data = await response.json()

        if (data.success) {
          setStatus('success')
          setMessage('Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Erreur lors de la vérification de votre email.')
        }
      } catch (error) {
        console.error('Erreur de vérification:', error)
        setStatus('error')
        setMessage('Erreur de connexion. Veuillez réessayer.')
      } finally {
        setIsLoading(false)
      }
    }

    verifyEmail()
  }, [token, email])

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    if (status === 'success') return <CheckCircle className="h-8 w-8 text-green-500" />
    if (status === 'error') return <XCircle className="h-8 w-8 text-red-500" />
    return <Mail className="h-8 w-8 text-blue-500" />
  }

  const getStatusTitle = () => {
    if (isLoading) return 'Vérification en cours...'
    if (status === 'success') return 'Email vérifié !'
    if (status === 'error') return 'Erreur de vérification'
    return 'Vérification de l\'email'
  }

  const getStatusDescription = () => {
    if (isLoading) return 'Nous vérifions votre adresse email...'
    if (status === 'success') return 'Votre compte a été activé avec succès.'
    if (status === 'error') return 'Impossible de vérifier votre email.'
    return 'Vérification de votre adresse email'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {getStatusTitle()}
          </CardTitle>
          <CardDescription>
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {message && (
            <Alert className={status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className={status === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Vous pouvez maintenant accéder à toutes les fonctionnalités d'EcoDeli.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">
                  Se connecter
                </Link>
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Si le problème persiste, contactez notre support.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/login">
                    Retour à la connexion
                  </Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/contact">
                    Support
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Veuillez patienter pendant que nous vérifions votre email...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 