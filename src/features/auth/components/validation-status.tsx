"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Shield, 
  Mail,
  User,
  FileText,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface ValidationStatus {
  emailVerified: boolean
  profileVerified: boolean
  documentsRequired: number
  documentsSubmitted: number
  documentsApproved: number
  role: string
}

interface ValidationStatusProps {
  userId: string
  showActions?: boolean
}

export function ValidationStatus({ userId, showActions = true }: ValidationStatusProps) {
  const [status, setStatus] = useState<ValidationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchValidationStatus = async () => {
      try {
        const response = await fetch(`/api/auth/validation-status?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data.status)
        } else {
          setError('Impossible de récupérer le statut de validation')
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du statut:', error)
        setError('Erreur de connexion')
      } finally {
        setIsLoading(false)
      }
    }

    fetchValidationStatus()
  }, [userId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2">Chargement du statut...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const getOverallStatus = () => {
    if (!status.emailVerified) return 'email_pending'
    if (!status.profileVerified) return 'profile_pending'
    if (status.documentsRequired > 0 && status.documentsApproved < status.documentsRequired) {
      return 'documents_pending'
    }
    return 'complete'
  }

  const getStatusIcon = () => {
    const overallStatus = getOverallStatus()
    switch (overallStatus) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'email_pending':
        return <Mail className="h-5 w-5 text-orange-500" />
      case 'profile_pending':
        return <User className="h-5 w-5 text-blue-500" />
      case 'documents_pending':
        return <FileText className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusTitle = () => {
    const overallStatus = getOverallStatus()
    switch (overallStatus) {
      case 'complete':
        return 'Validation complète'
      case 'email_pending':
        return 'Email à vérifier'
      case 'profile_pending':
        return 'Profil à compléter'
      case 'documents_pending':
        return 'Documents en attente'
      default:
        return 'Validation incomplète'
    }
  }

  const getStatusDescription = () => {
    const overallStatus = getOverallStatus()
    switch (overallStatus) {
      case 'complete':
        return 'Votre compte est entièrement validé et prêt à être utilisé.'
      case 'email_pending':
        return 'Vous devez vérifier votre adresse email pour continuer.'
      case 'profile_pending':
        return 'Complétez votre profil pour accéder à tous les services.'
      case 'documents_pending':
        return 'Soumettez les documents requis pour finaliser votre validation.'
      default:
        return 'Des étapes de validation sont nécessaires.'
    }
  }

  const getProgressPercentage = () => {
    let completed = 0
    let total = 3 // email + profile + documents

    if (status.emailVerified) completed++
    if (status.profileVerified) completed++
    if (status.documentsRequired > 0) {
      const docProgress = status.documentsApproved / status.documentsRequired
      completed += docProgress
    } else {
      completed++ // Pas de documents requis
    }

    return Math.round((completed / total) * 100)
  }

  const getRequiredAction = () => {
    const overallStatus = getOverallStatus()
    switch (overallStatus) {
      case 'email_pending':
        return {
          action: 'Vérifier email',
          href: '/resend-verification',
          variant: 'default' as const
        }
      case 'profile_pending':
        return {
          action: 'Compléter profil',
          href: '/validate-user',
          variant: 'default' as const
        }
      case 'documents_pending':
        return {
          action: 'Soumettre documents',
          href: '/documents/upload',
          variant: 'default' as const
        }
      default:
        return null
    }
  }

  const requiredAction = getRequiredAction()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">{getStatusTitle()}</CardTitle>
          </div>
          <Badge 
            variant={getOverallStatus() === 'complete' ? 'default' : 'secondary'}
            className={getOverallStatus() === 'complete' ? 'bg-green-100 text-green-800' : ''}
          >
            {getProgressPercentage()}% complété
          </Badge>
        </div>
        <CardDescription>{getStatusDescription()}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress value={getProgressPercentage()} className="h-2" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Email */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <Mail className={`h-5 w-5 ${status.emailVerified ? 'text-green-500' : 'text-orange-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-gray-500">
                {status.emailVerified ? 'Vérifié' : 'En attente'}
              </p>
            </div>
            {status.emailVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-orange-500" />
            )}
          </div>

          {/* Profil */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <User className={`h-5 w-5 ${status.profileVerified ? 'text-green-500' : 'text-blue-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Profil</p>
              <p className="text-xs text-gray-500">
                {status.profileVerified ? 'Complété' : 'À compléter'}
              </p>
            </div>
            {status.profileVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-blue-500" />
            )}
          </div>

          {/* Documents */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <FileText className={`h-5 w-5 ${
              status.documentsRequired === 0 ? 'text-green-500' : 
              status.documentsApproved === status.documentsRequired ? 'text-green-500' : 'text-yellow-500'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Documents</p>
              <p className="text-xs text-gray-500">
                {status.documentsRequired === 0 ? 'Non requis' : 
                 `${status.documentsApproved}/${status.documentsRequired} approuvés`}
              </p>
            </div>
            {status.documentsRequired === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : status.documentsApproved === status.documentsRequired ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-500" />
            )}
          </div>
        </div>

        {showActions && requiredAction && (
          <div className="flex gap-2">
            <Button asChild variant={requiredAction.variant} className="flex-1">
              <Link href={requiredAction.href}>
                {requiredAction.action}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">
                Aide
              </Link>
            </Button>
          </div>
        )}

        {getOverallStatus() === 'complete' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Félicitations ! Votre compte est entièrement validé et vous pouvez utiliser tous les services EcoDeli.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 