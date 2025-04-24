'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    // Log l'erreur dans la console pour le débogage
    console.error('Error occurred:', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center md:py-24">
      <div className="rounded-full bg-destructive/10 p-5">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      
      <div className="max-w-md space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Une erreur est survenue</h2>
        <p className="text-muted-foreground">
          {error.message || "Quelque chose s'est mal passé. Veuillez réessayer ou revenir à l'accueil."}
        </p>
      </div>
      
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Réessayer
        </Button>
        <Button onClick={() => router.push('/home')} variant="outline">
          Retour à l&apos;accueil
        </Button>
      </div>
      
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Erreur ID: {error.digest}
        </p>
      )}
    </div>
  )
}
