'use client'

import { useAuth } from '../hooks/useAuth'
import { useValidation } from '../hooks/useValidation'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, Upload, Mail, FileText, CheckCircle } from 'lucide-react'

interface ValidationGuardProps {
  children: ReactNode
  requireFullValidation?: boolean
  allowPendingValidation?: boolean
  fallback?: ReactNode
}

/**
 * Guard pour vérifier le statut de validation d'un utilisateur
 * Bloque l'accès si des actions de validation sont requises
 */
export function ValidationGuard({ 
  children, 
  requireFullValidation = true,
  allowPendingValidation = false,
  fallback
}: ValidationGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const validation = useValidation()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated && validation.nextStepUrl && requireFullValidation) {
      // Rediriger vers l'étape de validation manquante
      if (!allowPendingValidation || !validation.needsAdminValidation) {
        router.push(validation.nextStepUrl)
      }
    }
  }, [
    isLoading, 
    isAuthenticated, 
    validation.nextStepUrl, 
    requireFullValidation, 
    allowPendingValidation,
    validation.needsAdminValidation,
    router
  ])

  // Si en cours de chargement, ne rien afficher
  if (isLoading) {
    return null
  }

  // Si non authentifié, AuthGuard doit déjà gérer
  if (!isAuthenticated) {
    return null
  }

  // Si validation complète requise et pas validé
  if (requireFullValidation && !validation.canLogin) {
    return fallback || <ValidationBlocked validation={validation} />
  }

  // Si validation en attente d'admin et non autorisée
  if (validation.needsAdminValidation && !allowPendingValidation) {
    return fallback || <ValidationPending validation={validation} />
  }

  // Afficher le contenu (peut inclure un message de validation partielle)
  return (
    <>
      {!validation.canLogin && <ValidationWarning validation={validation} />}
      {children}
    </>
  )
}

function ValidationBlocked({ validation }: { validation: ReturnType<typeof useValidation> }) {
  const router = useRouter()

  const getIcon = () => {
    if (validation.needsEmailVerification) return <Mail className="h-6 w-6" />
    if (validation.needsDocumentUpload) return <Upload className="h-6 w-6" />
    if (validation.needsContractSignature) return <FileText className="h-6 w-6" />
    return <AlertTriangle className="h-6 w-6" />
  }

  const getTitle = () => {
    if (validation.needsEmailVerification) return "Vérification email requise"
    if (validation.needsDocumentUpload) return "Documents requis"
    if (validation.needsContractSignature) return "Contrat à signer"
    return "Validation requise"
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Alert className="max-w-md">
        {getIcon()}
        <AlertTitle>{getTitle()}</AlertTitle>
        <AlertDescription className="mt-2">
          {validation.validationMessage}
        </AlertDescription>
        {validation.nextStepUrl && (
          <Button 
            onClick={() => router.push(validation.nextStepUrl!)}
            className="mt-4 w-full"
          >
            Continuer la validation
          </Button>
        )}
      </Alert>
    </div>
  )
}

function ValidationPending({ validation }: { validation: ReturnType<typeof useValidation> }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Alert className="max-w-md">
        <Clock className="h-6 w-6" />
        <AlertTitle>Validation en cours</AlertTitle>
        <AlertDescription className="mt-2">
          {validation.validationMessage}
          <br />
          <span className="text-sm text-muted-foreground mt-2 block">
            Vous serez notifié par email une fois la validation terminée.
          </span>
        </AlertDescription>
      </Alert>
    </div>
  )
}

function ValidationWarning({ validation }: { validation: ReturnType<typeof useValidation> }) {
  const router = useRouter()

  if (validation.canLogin) return null

  return (
    <Alert className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Action requise</AlertTitle>
      <AlertDescription>
        {validation.validationMessage}
        {validation.nextStepUrl && (
          <Button 
            onClick={() => router.push(validation.nextStepUrl!)}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            Compléter
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}